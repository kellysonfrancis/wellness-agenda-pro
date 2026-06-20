import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

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
  const verifyToken = Deno.env.get("WHATSAPP_WEBHOOK_VERIFY_TOKEN");
  const appSecret = Deno.env.get("WHATSAPP_APP_SECRET");

  // GET = Meta webhook verification
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (!verifyToken) {
      return new Response("Forbidden", { status: 403 });
    }
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
    const rawBody = await req.text();

    // Validate Meta HMAC signature
    if (!appSecret) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sigHeader = req.headers.get("x-hub-signature-256") || "";
    const expectedHex = await hmacSha256Hex(appSecret, rawBody);
    const expected = `sha256=${expectedHex}`;
    if (!timingSafeEqual(sigHeader, expected)) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = JSON.parse(rawBody);

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
