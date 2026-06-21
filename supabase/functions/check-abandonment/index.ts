import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const j = (b: any, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MAX_AI_PER_RUN = 10;            // cap de chamadas de IA por execução
const RECENT_RECORDS_DAYS = 30;
const MIN_HISTORY_VISITS = 4;         // precisa ter ao menos 4 atendimentos passados para inferir frequência
const LOOKBACK_DAYS = 180;

function daysBetween(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

async function generateSummary(apiKey: string, clientName: string, records: any[], freqInfo: string): Promise<string | null> {
  const recordsBlob = records.map((r) =>
    `- [${new Date(r.created_at).toLocaleDateString("pt-BR")}] ${r.tipo || "evolução"}: ${(r.queixa_principal || r.observacoes || "").slice(0, 280)}`
  ).join("\n").slice(0, 4000);

  const prompt = `Cliente: ${clientName}
Frequência: ${freqInfo}

Evoluções clínicas recentes:
${recordsBlob}

Gere um RESUMO CLÍNICO CURTO (até 5 linhas) destacando:
1. Progresso/evolução observada
2. Pontos de atenção
3. Há sinal de abandono ou risco? (sim/não + motivo curto)

Não inclua diagnóstico. Linguagem objetiva, em português.`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "Você é um assistente clínico que produz resumos breves e objetivos para profissionais de saúde." },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("AI error:", res.status, err);
    return null;
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim() || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  const stats = { abandono: 0, resumos: 0, ignorados: 0, erros: 0 };

  try {
    const now = new Date();
    const since = new Date(now.getTime() - LOOKBACK_DAYS * 86400000).toISOString();

    // Pull active clients with past appointments
    const { data: clients } = await db.from("clients").select("id, nome").eq("ativo", true).limit(500);
    if (!clients?.length) return j({ ok: true, stats });

    const oneWeekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
    let aiBudget = MAX_AI_PER_RUN;

    for (const c of clients) {
      try {
        // appointments completed/attended in lookback window
        const { data: appts } = await db.from("appointments")
          .select("data_hora, status")
          .eq("client_id", c.id)
          .gte("data_hora", since)
          .order("data_hora");

        const past = (appts || []).filter((a: any) => ["concluido", "atendido"].includes(a.status) && new Date(a.data_hora) <= now);
        const future = (appts || []).filter((a: any) => new Date(a.data_hora) > now && a.status !== "cancelado");

        // ── Alerta de abandono (sem IA) ──
        if (past.length >= MIN_HISTORY_VISITS && future.length === 0) {
          // Calcula intervalo médio
          const dates = past.map((a: any) => new Date(a.data_hora).getTime()).sort();
          const gaps: number[] = [];
          for (let i = 1; i < dates.length; i++) gaps.push((dates[i] - dates[i - 1]) / 86400000);
          const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
          const lastVisit = new Date(dates[dates.length - 1]);
          const daysSinceLast = daysBetween(lastVisit, now);

          // Sinal de abandono: passou >1.8x do intervalo médio (mínimo 14 dias)
          const threshold = Math.max(14, Math.round(avgGap * 1.8));
          if (daysSinceLast >= threshold) {
            // Idempotência: não duplicar se já gerou nos últimos 7 dias
            const { count } = await db.from("clinical_insights")
              .select("id", { count: "exact", head: true })
              .eq("client_id", c.id)
              .eq("tipo", "alerta_abandono")
              .gte("gerado_em", oneWeekAgo);
            if ((count ?? 0) === 0) {
              const msg = `Cliente frequentava a cada ~${Math.round(avgGap)} dia(s) e está há ${daysSinceLast} dias sem comparecer (último: ${lastVisit.toLocaleDateString("pt-BR")}). Sem agendamento futuro.`;
              await db.from("clinical_insights").insert({ client_id: c.id, tipo: "alerta_abandono", conteudo: msg });
              stats.abandono++;
            }
          }
        }

        // ── Resumo com IA (limitado) ──
        if (aiBudget <= 0 || !LOVABLE_API_KEY) continue;

        const recordsSince = new Date(now.getTime() - RECENT_RECORDS_DAYS * 86400000).toISOString();
        const { data: records } = await db.from("clinical_records")
          .select("created_at, tipo, queixa_principal, observacoes")
          .eq("client_id", c.id)
          .gte("created_at", recordsSince)
          .order("created_at", { ascending: false })
          .limit(8);

        if (!records?.length) { stats.ignorados++; continue; }

        // Não regerar se já existe resumo recente (últimos 7 dias)
        const { count: hasRecent } = await db.from("clinical_insights")
          .select("id", { count: "exact", head: true })
          .eq("client_id", c.id)
          .eq("tipo", "resumo")
          .gte("gerado_em", oneWeekAgo);
        if ((hasRecent ?? 0) > 0) { stats.ignorados++; continue; }

        const freqInfo = past.length > 0
          ? `${past.length} atendimentos nos últimos ${LOOKBACK_DAYS} dias`
          : "sem histórico recente de atendimentos";

        const summary = await generateSummary(LOVABLE_API_KEY, c.nome, records, freqInfo);
        if (summary) {
          await db.from("clinical_insights").insert({ client_id: c.id, tipo: "resumo", conteudo: summary });
          stats.resumos++;
          aiBudget--;
        } else {
          stats.erros++;
        }
      } catch (e) {
        console.error("Client error", c.id, e);
        stats.erros++;
      }
    }

    return j({ ok: true, stats });
  } catch (e: any) {
    console.error(e);
    return j({ error: e.message, stats }, 500);
  }
});