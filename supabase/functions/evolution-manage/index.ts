import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeUrl(u: string) {
  return u.replace(/\/+$/, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const webhookToken = Deno.env.get("EVOLUTION_WEBHOOK_TOKEN") || "";
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await caller.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roles } = await adminClient
      .from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin");
    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Apenas administradores" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, line_id, url, api_key, instance, test_phone } = body;

    if (!action) {
      return new Response(JSON.stringify({ error: "action obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve credentials: either from body (validate/create) or from saved line
    let evoUrl = url ? normalizeUrl(url) : "";
    let evoKey = api_key || "";
    let evoInstance = instance || "";
    let line: any = null;

    if (line_id && ["qrcode", "status", "logout", "delete", "test"].includes(action)) {
      const { data } = await adminClient.from("whatsapp_lines").select("*").eq("id", line_id).maybeSingle();
      if (!data) {
        return new Response(JSON.stringify({ error: "Linha não encontrada" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      line = data;
      evoUrl = normalizeUrl(data.evolution_url || "");
      evoKey = data.evolution_api_key || "";
      evoInstance = data.evolution_instance || "";
    }

    if (!evoUrl || !evoKey) {
      return new Response(JSON.stringify({ error: "URL e API key são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const headers = { "apikey": evoKey, "Content-Type": "application/json" };

    // ── validate ──
    if (action === "validate") {
      const r = await fetch(`${evoUrl}/instance/fetchInstances`, { headers });
      const txt = await r.text();
      if (!r.ok) {
        return new Response(JSON.stringify({ valid: false, error: `HTTP ${r.status}: ${txt.slice(0, 200)}` }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ valid: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── create_instance ──
    if (action === "create_instance") {
      if (!evoInstance) {
        return new Response(JSON.stringify({ error: "Nome da instância obrigatório" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const webhookUrl = `${supabaseUrl}/functions/v1/evolution-webhook`;
      const payload = {
        instanceName: evoInstance,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
        webhook: {
          url: webhookUrl,
          byEvents: false,
          base64: true,
          headers: webhookToken ? { apikey: webhookToken } : {},
          events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
        },
      };
      const r = await fetch(`${evoUrl}/instance/create`, {
        method: "POST", headers, body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok && r.status !== 403 /* may already exist */) {
        // Try fetching anyway in case it exists
        const exists = await fetch(`${evoUrl}/instance/connect/${evoInstance}`, { headers });
        if (!exists.ok) {
          return new Response(JSON.stringify({ error: data?.message || data?.error || `HTTP ${r.status}` }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      const qrBase64 = data?.qrcode?.base64 || data?.instance?.qrcode?.base64 || null;
      return new Response(JSON.stringify({ success: true, qrcode: qrBase64 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── qrcode ──
    if (action === "qrcode") {
      const r = await fetch(`${evoUrl}/instance/connect/${evoInstance}`, { headers });
      const data = await r.json().catch(() => ({}));
      const qrBase64 = data?.base64 || data?.qrcode?.base64 || null;
      const code = data?.code || data?.qrcode?.code || null;
      return new Response(JSON.stringify({ qrcode: qrBase64, code }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── status ──
    if (action === "status") {
      const r = await fetch(`${evoUrl}/instance/connectionState/${evoInstance}`, { headers });
      const data = await r.json().catch(() => ({}));
      const state = data?.instance?.state || data?.state || "disconnected";
      const mapped = state === "open" ? "connected" : state === "connecting" ? "qr" : "disconnected";
      let phone: string | null = null;
      if (mapped === "connected") {
        const fr = await fetch(`${evoUrl}/instance/fetchInstances?instanceName=${encodeURIComponent(evoInstance)}`, { headers });
        const fd = await fr.json().catch(() => []);
        const arr = Array.isArray(fd) ? fd : [fd];
        const found = arr.find((i: any) => (i?.instance?.instanceName || i?.name) === evoInstance) || arr[0];
        phone = found?.instance?.owner?.split?.("@")?.[0] || found?.ownerJid?.split?.("@")?.[0] || null;
      }
      if (line) {
        await adminClient.from("whatsapp_lines")
          .update({ evolution_status: mapped, evolution_phone: phone })
          .eq("id", line.id);
      }
      return new Response(JSON.stringify({ status: mapped, phone }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── logout ──
    if (action === "logout") {
      await fetch(`${evoUrl}/instance/logout/${evoInstance}`, { method: "DELETE", headers });
      await adminClient.from("whatsapp_lines")
        .update({ evolution_status: "disconnected", evolution_phone: null }).eq("id", line.id);
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── delete ──
    if (action === "delete") {
      await fetch(`${evoUrl}/instance/logout/${evoInstance}`, { method: "DELETE", headers }).catch(() => {});
      await fetch(`${evoUrl}/instance/delete/${evoInstance}`, { method: "DELETE", headers }).catch(() => {});
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── test message ──
    if (action === "test") {
      if (!test_phone) {
        return new Response(JSON.stringify({ error: "test_phone obrigatório" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const number = test_phone.replace(/\D/g, "");
      const r = await fetch(`${evoUrl}/message/sendText/${evoInstance}`, {
        method: "POST", headers,
        body: JSON.stringify({ number, text: "✅ Teste de conexão WhatsApp via Evolution API — Clínica Gestão Integrada" }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        return new Response(JSON.stringify({ sent: false, error: data?.message || data?.error || `HTTP ${r.status}` }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ sent: true, message_id: data?.key?.id || null }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação desconhecida" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("evolution-manage error:", err);
    return new Response(JSON.stringify({ error: err.message || "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});