import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const webhookToken = Deno.env.get("EVOLUTION_WEBHOOK_TOKEN") || "";
  const db = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Validate webhook token (sent as apikey header configured on instance creation)
    if (webhookToken) {
      const provided = req.headers.get("apikey") || req.headers.get("x-apikey") || "";
      if (provided !== webhookToken) {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const event: string = body?.event || "";
    const instance: string = body?.instance || body?.instanceName || "";
    const data = body?.data || {};

    // Locate the line by instance name
    let line: any = null;
    if (instance) {
      const { data: rows } = await db
        .from("whatsapp_lines").select("*")
        .eq("provider", "evolution").eq("evolution_instance", instance).limit(1);
      line = rows?.[0] || null;
    }

    // ── connection.update ──
    if (event === "connection.update" || event === "CONNECTION_UPDATE") {
      const state = data?.state || body?.state;
      const mapped = state === "open" ? "connected" : state === "connecting" ? "qr" : "disconnected";
      const phone = data?.wuid?.split?.("@")?.[0] || data?.owner?.split?.("@")?.[0] || null;
      if (line) {
        await db.from("whatsapp_lines").update({
          evolution_status: mapped,
          ...(phone ? { evolution_phone: phone } : {}),
        }).eq("id", line.id);
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── messages.upsert ──
    if (event === "messages.upsert" || event === "MESSAGES_UPSERT") {
      const msgs = Array.isArray(data) ? data : (data?.messages ? data.messages : [data]);
      for (const m of msgs) {
        if (!m || m?.key?.fromMe) continue;
        const from = (m?.key?.remoteJid || "").split("@")[0];
        const text = (m?.message?.conversation || m?.message?.extendedTextMessage?.text || "").trim().toUpperCase();
        if (!from || !text) continue;
        if (text !== "SIM" && text !== "NÃO" && text !== "NAO") continue;

        const { data: logs } = await db.from("whatsapp_log")
          .select("id, appointment_id")
          .eq("destinatario", from).eq("tipo", "confirmacao").eq("status", "enviado")
          .order("created_at", { ascending: false }).limit(1);
        if (!logs || logs.length === 0) continue;
        const log = logs[0];
        if (!log.appointment_id) continue;

        if (text === "SIM") {
          await db.from("appointments").update({ status: "confirmado" }).eq("id", log.appointment_id);
          await db.from("whatsapp_log").update({ status: "confirmado_cliente" }).eq("id", log.id);
        } else {
          await db.from("appointments").update({ status: "cancelado" }).eq("id", log.appointment_id);
          await db.from("whatsapp_log").update({ status: "cancelado_cliente" }).eq("id", log.id);
        }
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, ignored: event }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("evolution-webhook error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});