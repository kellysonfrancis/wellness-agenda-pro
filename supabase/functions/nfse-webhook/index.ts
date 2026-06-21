import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-token",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, service);

  try {
    const raw = await req.text();
    let payload: any = {};
    try { payload = JSON.parse(raw); } catch { payload = {}; }

    // Detecta provider pelo formato do payload ou query param
    const reqUrl = new URL(req.url);
    const providerHint = reqUrl.searchParams.get("provider");
    const provider = providerHint || (payload.ref || payload.cnpj_prestador ? "focus" : "enotas");

    // Valida origem com webhook_secret salvo
    const { data: cfg } = await admin.from("nfse_settings").select("*").eq("provider", provider).maybeSingle();
    if (cfg?.webhook_secret) {
      const provided = req.headers.get("x-webhook-token") || reqUrl.searchParams.get("token") || payload.token;
      if (provided !== cfg.webhook_secret) {
        return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    let ref: string | null = null;
    let provInvoiceId: string | null = null;
    let status = "processando";
    let pdf_url: string | null = null;
    let xml_url: string | null = null;

    if (provider === "enotas") {
      provInvoiceId = payload.nfeId || payload.id || payload.Id || null;
      ref = payload.idExterno || payload.IdExterno || null;
      const s = (payload.status || payload.Status || "").toString().toLowerCase();
      status = s.includes("autorizad") ? "autorizada" : s.includes("cancel") ? "cancelada" : s.includes("erro") || s.includes("negad") ? "erro" : "processando";
      pdf_url = payload.linkDownloadPDF || null;
      xml_url = payload.linkDownloadXML || null;
    } else {
      ref = payload.ref || null;
      const s = (payload.status || "").toString().toLowerCase();
      status = s === "autorizado" ? "autorizada" : s === "cancelado" ? "cancelada" : s === "erro_autorizacao" ? "erro" : "processando";
      const base = cfg?.mode === "production" ? "https://api.focusnfe.com.br" : "https://homologacao.focusnfe.com.br";
      pdf_url = payload.caminho_xml_nota_fiscal ? `${base}${payload.caminho_xml_nota_fiscal}` : null;
      xml_url = payload.caminho_xml_nota_fiscal ? `${base}${payload.caminho_xml_nota_fiscal}` : null;
    }

    const filter = ref
      ? admin.from("invoices").update({ status, pdf_url, xml_url, provider_invoice_id: provInvoiceId }).eq("ref", ref)
      : admin.from("invoices").update({ status, pdf_url, xml_url }).eq("provider_invoice_id", provInvoiceId);
    const { data: updated, error } = await filter.select().maybeSingle();
    if (error) throw error;

    // Opcional: dispara WhatsApp ao cliente se autorizada e tem PDF
    if (updated && status === "autorizada" && pdf_url) {
      try {
        const { data: cli } = await admin.from("clients").select("telefone, nome").eq("id", updated.client_id).maybeSingle();
        if (cli?.telefone) {
          await admin.functions.invoke("send-whatsapp", {
            body: {
              to: cli.telefone,
              message: `Olá ${cli.nome || ""}! Sua nota fiscal foi emitida: ${pdf_url}`,
              categoria: "geral",
            },
          }).catch(() => {});
        }
      } catch { /* ignora falhas no envio */ }
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "Erro" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});