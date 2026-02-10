import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const META_API = "https://graph.facebook.com/v21.0";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Confirmation window: send between 48h and 24h before appointment (configurable)
    const CONFIRM_START_HOURS = 48;
    const CONFIRM_END_HOURS = 24;

    // Get lines with confirm enabled
    const { data: lines, error: linesErr } = await db
      .from("whatsapp_lines")
      .select("*")
      .eq("confirm_enabled", true);

    if (linesErr) throw linesErr;
    if (!lines || lines.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhuma linha com confirmação ativa" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const categoriaLineMap: Record<string, any> = {};
    for (const line of lines) {
      for (const cat of (line.categorias || [])) {
        categoriaLineMap[cat] = line;
      }
    }

    const now = new Date();
    // Fetch appointments starting between CONFIRM_END_HOURS and CONFIRM_START_HOURS from now
    // that are still "reservado" (not yet confirmed)
    const windowStart = new Date(now.getTime() + CONFIRM_END_HOURS * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + CONFIRM_START_HOURS * 60 * 60 * 1000);

    const { data: appointments, error: apptErr } = await db
      .from("appointments")
      .select(`
        id, inicio_em, fim_em, status,
        clients!appointments_client_id_fkey ( id, nome, telefone ),
        services!appointments_service_id_fkey ( nome, categoria ),
        professionals!appointments_profissional_id_fkey ( nome_exibicao )
      `)
      .eq("status", "reservado")
      .gte("inicio_em", windowStart.toISOString())
      .lte("inicio_em", windowEnd.toISOString());

    if (apptErr) throw apptErr;
    if (!appointments || appointments.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, message: "Nenhum agendamento para confirmar" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalSent = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const appt of appointments) {
      const client = appt.clients as any;
      const service = appt.services as any;
      const professional = appt.professionals as any;
      const categoria = service?.categoria;

      if (!client?.telefone || !categoria) { totalSkipped++; continue; }

      // Check if confirmation already sent
      const { data: existing } = await db
        .from("whatsapp_log")
        .select("id")
        .eq("appointment_id", appt.id)
        .eq("tipo", "confirmacao")
        .limit(1);

      if (existing && existing.length > 0) { totalSkipped++; continue; }

      const line = categoriaLineMap[categoria];
      if (!line) { totalSkipped++; continue; }

      const startDate = new Date(appt.inicio_em);
      const dataFormatted = startDate.toLocaleDateString("pt-BR");
      const horarioFormatted = startDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

      const text =
        `Olá, ${client.nome}! ✅\n\n` +
        `Por favor, confirme sua presença:\n` +
        `📅 ${dataFormatted}\n` +
        `⏰ ${horarioFormatted}\n` +
        `💆 ${service.nome}\n` +
        `👩‍⚕️ ${professional?.nome_exibicao || ""}\n\n` +
        `Responda *SIM* para confirmar ou *NÃO* para cancelar.`;

      const phone = client.telefone.replace(/\D/g, "");

      try {
        const metaResponse = await fetch(`${META_API}/${line.phone_number_id}/messages`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${line.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: phone,
            type: "text",
            text: { body: text },
          }),
        });

        const metaData = await metaResponse.json();

        if (!metaResponse.ok) {
          console.error(`Meta API error for ${appt.id}:`, JSON.stringify(metaData));
          await db.from("whatsapp_log").insert({
            line_id: line.id, tipo: "confirmacao", destinatario: phone,
            appointment_id: appt.id, status: "erro",
            erro: JSON.stringify(metaData.error || metaData),
          });
          totalErrors++;
          continue;
        }

        await db.from("whatsapp_log").insert({
          line_id: line.id, tipo: "confirmacao", destinatario: phone,
          appointment_id: appt.id, status: "enviado",
          meta_message_id: metaData.messages?.[0]?.id || null,
        });
        totalSent++;
      } catch (sendErr) {
        console.error(`Send error for ${appt.id}:`, sendErr);
        totalErrors++;
      }
    }

    return new Response(JSON.stringify({ success: true, sent: totalSent, skipped: totalSkipped, errors: totalErrors }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("check-whatsapp-confirmations error:", err);
    return new Response(JSON.stringify({ error: err.message || "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
