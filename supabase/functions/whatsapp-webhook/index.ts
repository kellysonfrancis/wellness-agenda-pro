import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Webhook endpoint to receive incoming WhatsApp messages (replies).
 * Meta sends POST requests here when a client replies SIM or NÃO.
 * 
 * Setup: In Meta App Dashboard → WhatsApp → Configuration → Webhook URL:
 * https://frfyyntnloxvvrjzqmxq.supabase.co/functions/v1/whatsapp-webhook
 * 
 * Verify Token: set a WHATSAPP_WEBHOOK_VERIFY_TOKEN secret.
 */
serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(supabaseUrl, serviceRoleKey);
  const verifyToken = Deno.env.get("WHATSAPP_WEBHOOK_VERIFY_TOKEN") || "lovable_verify_token";

  // GET = Meta webhook verification
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === verifyToken) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // POST = incoming message
  try {
    const body = await req.json();

    const entries = body?.entry || [];
    for (const entry of entries) {
      const changes = entry?.changes || [];
      for (const change of changes) {
        const messages = change?.value?.messages || [];
        for (const msg of messages) {
          if (msg.type !== "text") continue;

          const from = msg.from; // phone number
          const text = (msg.text?.body || "").trim().toUpperCase();

          if (text !== "SIM" && text !== "NÃO" && text !== "NAO") continue;

          // Find the most recent confirmation sent to this number
          const { data: logs } = await db
            .from("whatsapp_log")
            .select("id, appointment_id")
            .eq("destinatario", from)
            .eq("tipo", "confirmacao")
            .eq("status", "enviado")
            .order("created_at", { ascending: false })
            .limit(1);

          if (!logs || logs.length === 0) continue;

          const log = logs[0];
          if (!log.appointment_id) continue;

          if (text === "SIM") {
            // Confirm the appointment
            await db.from("appointments")
              .update({ status: "confirmado" })
              .eq("id", log.appointment_id);

            // Update log
            await db.from("whatsapp_log")
              .update({ status: "confirmado_cliente" })
              .eq("id", log.id);
          } else {
            // Cancel the appointment
            await db.from("appointments")
              .update({ status: "cancelado" })
              .eq("id", log.appointment_id);

            await db.from("whatsapp_log")
              .update({ status: "cancelado_cliente" })
              .eq("id", log.id);
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("whatsapp-webhook error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
