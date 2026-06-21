import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const META_API = "https://graph.facebook.com/v21.0";

async function sendViaLine(line: any, phone: string, text: string) {
  if ((line.provider || "meta") === "evolution") {
    const url = `${line.evolution_url?.replace(/\/$/, "")}/message/sendText/${line.evolution_instance}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: line.evolution_api_key },
      body: JSON.stringify({ number: phone, text }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    return data?.key?.id || null;
  }
  const res = await fetch(`${META_API}/${line.phone_number_id}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${line.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: phone, type: "text", text: { body: text } }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data.error || data));
  return data.messages?.[0]?.id || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { data: lines } = await db.from("whatsapp_lines").select("*");
    const linesByCat: Record<string, any> = {};
    for (const l of lines || []) for (const c of (l.categorias || [])) linesByCat[c] = l;

    const now = new Date();
    const windowEnd = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const windowStart = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const { data: appts } = await db
      .from("appointments")
      .select(`
        id, fim_em, status, client_id,
        clients!appointments_client_id_fkey(id, nome, telefone),
        services!appointments_service_id_fkey(nome, categoria)
      `)
      .eq("status", "concluido")
      .gte("fim_em", windowStart.toISOString())
      .lte("fim_em", windowEnd.toISOString());

    let sent = 0, skipped = 0, errors = 0;

    for (const a of appts || []) {
      const client: any = (a as any).clients;
      const service: any = (a as any).services;
      if (!client?.telefone) { skipped++; continue; }

      const { data: existing } = await db
        .from("satisfaction_surveys").select("id").eq("appointment_id", a.id).limit(1);
      if (existing && existing.length > 0) { skipped++; continue; }

      const line = linesByCat[service?.categoria] || (lines && lines[0]);
      if (!line) { skipped++; continue; }

      const phone = client.telefone.replace(/\D/g, "");
      const text =
        `Olá, ${client.nome}! 🌟\n\n` +
        `Como foi sua experiência com *${service?.nome || "seu atendimento"}*?\n` +
        `Responda com uma nota de *1 a 5* (5 = excelente).\n\n` +
        `Sua opinião nos ajuda a melhorar!`;

      try {
        const { data: survey, error: sErr } = await db
          .from("satisfaction_surveys")
          .insert({ appointment_id: a.id, client_id: client.id })
          .select("id").single();
        if (sErr) throw sErr;

        const msgId = await sendViaLine(line, phone, text);
        await db.from("whatsapp_log").insert({
          line_id: line.id, tipo: "nps", destinatario: phone,
          appointment_id: a.id, client_id: client.id,
          status: "enviado", meta_message_id: msgId,
        });
        sent++;
        void survey;
      } catch (e: any) {
        await db.from("whatsapp_log").insert({
          line_id: line.id, tipo: "nps", destinatario: phone,
          appointment_id: a.id, client_id: client.id,
          status: "erro", erro: String(e?.message || e),
        });
        errors++;
      }
    }

    return new Response(JSON.stringify({ success: true, sent, skipped, errors }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("check-nps-surveys:", err);
    return new Response(JSON.stringify({ error: err.message || "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});