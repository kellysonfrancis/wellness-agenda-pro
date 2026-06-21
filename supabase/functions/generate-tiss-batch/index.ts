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
    const { insurer_id, guide_ids } = await req.json();
    if (!insurer_id || !Array.isArray(guide_ids) || guide_ids.length === 0) {
      return j({ error: "insurer_id e guide_ids são obrigatórios" }, 400);
    }

    const { data: insurer, error: insErr } = await admin
      .from("health_insurers").select("*").eq("id", insurer_id).maybeSingle();
    if (insErr || !insurer) return j({ error: "Convênio não encontrado" }, 404);

    const { data: guides, error: gErr } = await admin
      .from("tiss_guides")
      .select("*, client:clients(nome, cpf, data_nascimento)")
      .in("id", guide_ids)
      .eq("insurer_id", insurer_id)
      .in("status", ["aberta", "no_lote"]);
    if (gErr) throw gErr;
    if (!guides || guides.length === 0) return j({ error: "Nenhuma guia válida" }, 400);

    const numero_lote = `${Date.now()}`.slice(-10);
    const versao = insurer.versao_tiss || "4.01.00";
    const xml = buildTissXml(versao, insurer, guides, numero_lote);
    const valor_total = guides.reduce((s: number, g: any) => s + Number(g.valor || 0), 0);

    const { data: batch, error: bErr } = await admin.from("tiss_batches").insert({
      insurer_id, numero_lote, xml, versao_tiss: versao,
      total_guias: guides.length, valor_total, status: "gerado",
    }).select().single();
    if (bErr) throw bErr;

    await admin.from("tiss_guides")
      .update({ status: "no_lote", batch_id: batch.id })
      .in("id", guide_ids);

    return j({ ok: true, batch_id: batch.id, numero_lote, total_guias: guides.length, valor_total });
  } catch (e: any) {
    return j({ error: e.message || "Erro" }, 500);
  }
});

function j(b: any, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// ===== TISS XML builders (isolados por versão) =====
function buildTissXml(versao: string, insurer: any, guides: any[], numeroLote: string): string {
  // Roteia por versão. Hoje cai sempre na 4.01.00 (compatível com 4.x).
  if (versao.startsWith("3.")) return buildTiss3(insurer, guides, numeroLote);
  return buildTiss4(insurer, guides, numeroLote);
}

function xe(v: any): string {
  if (v === null || v === undefined) return "";
  return String(v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function buildTiss4(insurer: any, guides: any[], numeroLote: string): string {
  const dataGeracao = new Date().toISOString().slice(0, 10);
  const total = guides.reduce((s, g) => s + Number(g.valor || 0), 0).toFixed(2);

  const guiasXml = guides.map((g) => {
    const d = g.dados || {};
    const procedimentos = Array.isArray(d.procedimentos) ? d.procedimentos : [];
    const procsXml = procedimentos.map((p: any, i: number) => `
      <ans:procedimentoExecutado>
        <ans:sequencialItem>${i + 1}</ans:sequencialItem>
        <ans:procedimento>
          <ans:codigoTabela>${xe(p.tabela || "22")}</ans:codigoTabela>
          <ans:codigoProcedimento>${xe(p.codigo)}</ans:codigoProcedimento>
          <ans:descricaoProcedimento>${xe(p.descricao)}</ans:descricaoProcedimento>
        </ans:procedimento>
        <ans:quantidadeExecutada>${xe(p.quantidade || 1)}</ans:quantidadeExecutada>
        <ans:valorUnitario>${Number(p.valor || 0).toFixed(2)}</ans:valorUnitario>
        <ans:valorTotal>${(Number(p.valor || 0) * Number(p.quantidade || 1)).toFixed(2)}</ans:valorTotal>
      </ans:procedimentoExecutado>`).join("");
    const tag = g.tipo === "sadt" ? "guiaSP-SADT" : "guiaConsulta";
    return `
    <ans:${tag}>
      <ans:cabecalhoGuia>
        <ans:registroANS>${xe(insurer.registro_ans)}</ans:registroANS>
        <ans:numeroGuiaPrestador>${xe(g.numero_guia || g.id.slice(0,8))}</ans:numeroGuiaPrestador>
      </ans:cabecalhoGuia>
      <ans:dadosBeneficiario>
        <ans:numeroCarteira>${xe(d.numero_carteira)}</ans:numeroCarteira>
        <ans:nomeBeneficiario>${xe(g.client?.nome)}</ans:nomeBeneficiario>
      </ans:dadosBeneficiario>
      <ans:dadosContratado>
        <ans:codigoPrestadorNaOperadora>${xe(insurer.codigo_prestador)}</ans:codigoPrestadorNaOperadora>
      </ans:dadosContratado>
      <ans:dadosAtendimento>
        <ans:dataAtendimento>${xe(d.data_atendimento || dataGeracao)}</ans:dataAtendimento>
        <ans:tipoConsulta>${xe(d.tipo_consulta || 1)}</ans:tipoConsulta>
      </ans:dadosAtendimento>
      ${procsXml}
      <ans:valorTotal>
        <ans:valorProcedimentos>${Number(g.valor || 0).toFixed(2)}</ans:valorProcedimentos>
        <ans:valorTotalGeral>${Number(g.valor || 0).toFixed(2)}</ans:valorTotalGeral>
      </ans:valorTotal>
    </ans:${tag}>`;
  }).join("");

  return `<?xml version="1.0" encoding="ISO-8859-1"?>
<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">
  <ans:cabecalho>
    <ans:identificacaoTransacao>
      <ans:tipoTransacao>ENVIO_LOTE_GUIAS</ans:tipoTransacao>
      <ans:sequencialTransacao>${xe(numeroLote)}</ans:sequencialTransacao>
      <ans:dataRegistroTransacao>${dataGeracao}</ans:dataRegistroTransacao>
      <ans:horaRegistroTransacao>${new Date().toISOString().slice(11,19)}</ans:horaRegistroTransacao>
    </ans:identificacaoTransacao>
    <ans:origem>
      <ans:identificacaoPrestador>
        <ans:codigoPrestadorNaOperadora>${xe(insurer.codigo_prestador)}</ans:codigoPrestadorNaOperadora>
      </ans:identificacaoPrestador>
    </ans:origem>
    <ans:destino>
      <ans:registroANS>${xe(insurer.registro_ans)}</ans:registroANS>
    </ans:destino>
    <ans:Padrao>4.01.00</ans:Padrao>
  </ans:cabecalho>
  <ans:prestadorParaOperadora>
    <ans:loteGuias>
      <ans:numeroLote>${xe(numeroLote)}</ans:numeroLote>
      <ans:guiasTISS>${guiasXml}
      </ans:guiasTISS>
    </ans:loteGuias>
  </ans:prestadorParaOperadora>
  <ans:epilogo>
    <ans:totalGuias>${guides.length}</ans:totalGuias>
    <ans:valorTotalLote>${total}</ans:valorTotalLote>
  </ans:epilogo>
</ans:mensagemTISS>`;
}

function buildTiss3(insurer: any, guides: any[], numeroLote: string): string {
  // Esqueleto compatível com TISS 3.x. Reaproveita estrutura simplificada.
  return buildTiss4(insurer, guides, numeroLote).replace("4.01.00", "3.05.00");
}