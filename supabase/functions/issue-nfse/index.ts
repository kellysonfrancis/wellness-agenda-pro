import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return j({ error: "Não autorizado" }, 401);

    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return j({ error: "Não autorizado" }, 401);
    const { data: roles } = await userClient.rpc("get_my_roles");
    const allowed = roles && (roles.includes("admin") || roles.includes("recepcao"));
    if (!allowed) return j({ error: "Sem permissão" }, 403);

    const admin = createClient(url, service);
    const { payment_id, descricao } = await req.json();
    if (!payment_id) return j({ error: "payment_id obrigatório" }, 400);

    // Idempotência: já existe nota para esse pagamento?
    const { data: existing } = await admin.from("invoices").select("id, status").eq("payment_id", payment_id).maybeSingle();
    if (existing && existing.status !== "erro") {
      return j({ ok: true, invoice_id: existing.id, message: "Já existe nota para esse pagamento" });
    }

    const { data: payment, error: payErr } = await admin
      .from("payments")
      .select("id, valor_total, valor_pago, client_id, clients:client_id (nome, email, telefone, cpf, endereco)")
      .eq("id", payment_id)
      .maybeSingle();
    if (payErr || !payment) return j({ error: "Pagamento não encontrado" }, 404);
    const client: any = (payment as any).clients;
    if (!client) return j({ error: "Cliente não encontrado" }, 404);

    const { data: cfg } = await admin.from("nfse_settings").select("*").eq("is_active", true).maybeSingle();
    if (!cfg) return j({ error: "Nenhum provedor de NFS-e ativo" }, 400);

    const valor = Number((payment as any).valor_pago || (payment as any).valor_total || 0);
    const desc = descricao || `Prestação de serviço — pagamento ${String(payment.id).slice(0, 8)}`;
    const ref = `pay_${payment.id}_${Date.now()}`;

    const { data: inv, error: invErr } = await admin
      .from("invoices")
      .insert({
        payment_id: payment.id,
        client_id: payment.client_id,
        provider: cfg.provider,
        ref,
        status: "processando",
        valor,
        descricao: desc,
      })
      .select()
      .single();
    if (invErr) throw invErr;

    try {
      let providerResult: any;
      if (cfg.provider === "enotas") {
        providerResult = await issueEnotas(cfg, client, valor, desc, ref);
      } else {
        providerResult = await issueFocus(cfg, client, valor, desc, ref);
      }

      await admin.from("invoices").update({
        provider_invoice_id: providerResult.id || null,
        status: providerResult.status || "processando",
        pdf_url: providerResult.pdf_url || null,
        xml_url: providerResult.xml_url || null,
      }).eq("id", inv.id);

      return j({ ok: true, invoice_id: inv.id, provider_response: providerResult });
    } catch (e: any) {
      await admin.from("invoices").update({ status: "erro", motivo_erro: String(e.message || e).slice(0, 1000) }).eq("id", inv.id);
      return j({ error: e.message || "Falha ao emitir", invoice_id: inv.id }, 500);
    }
  } catch (e: any) {
    return j({ error: e.message || "Erro" }, 500);
  }
});

async function issueEnotas(cfg: any, client: any, valor: number, descricao: string, ref: string) {
  const base = "https://api.enotasgw.com.br/v2";
  if (!cfg.empresa_id) throw new Error("empresa_id (eNotas) não configurado");
  const auth = "Basic " + btoa(cfg.api_key + ":");
  const body = {
    tipo: "NFSe",
    idExterno: ref,
    cliente: {
      nome: client.nome,
      email: client.email || undefined,
      cpfCnpj: (client.cpf || "").replace(/\D/g, "") || undefined,
      endereco: client.endereco ? { logradouro: client.endereco } : undefined,
    },
    servico: { descricao, valorTotal: valor },
  };
  const r = await fetch(`${base}/empresas/${cfg.empresa_id}/nfes`, {
    method: "POST",
    headers: { "Authorization": auth, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`eNotas ${r.status}: ${txt.slice(0, 500)}`);
  let json: any = {};
  try { json = JSON.parse(txt); } catch { /* */ }
  return {
    id: json.id || json.nfeId || json.Id || null,
    status: "processando",
    pdf_url: json.linkDownloadPDF || null,
    xml_url: json.linkDownloadXML || null,
  };
}

async function issueFocus(cfg: any, client: any, valor: number, descricao: string, ref: string) {
  const base = cfg.mode === "production"
    ? "https://api.focusnfe.com.br"
    : "https://homologacao.focusnfe.com.br";
  const auth = "Basic " + btoa(cfg.api_key + ":");
  const cpf = (client.cpf || "").replace(/\D/g, "");
  const body: any = {
    data_emissao: new Date().toISOString(),
    prestador: cfg.empresa_id ? { cnpj: cfg.empresa_id } : undefined,
    tomador: {
      cpf: cpf || undefined,
      razao_social: client.nome,
      email: client.email || undefined,
      endereco: client.endereco ? { logradouro: client.endereco } : undefined,
    },
    servico: {
      discriminacao: descricao,
      valor_servicos: valor,
    },
  };
  const r = await fetch(`${base}/v2/nfse?ref=${encodeURIComponent(ref)}`, {
    method: "POST",
    headers: { "Authorization": auth, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`Focus ${r.status}: ${txt.slice(0, 500)}`);
  let json: any = {};
  try { json = JSON.parse(txt); } catch { /* */ }
  return {
    id: ref,
    status: json.status === "autorizado" ? "autorizada" : "processando",
    pdf_url: json.url || json.caminho_xml_nota_fiscal ? `${base}${json.caminho_xml_nota_fiscal || ""}` : null,
    xml_url: json.caminho_xml_nota_fiscal ? `${base}${json.caminho_xml_nota_fiscal}` : null,
  };
}

function j(b: any, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}