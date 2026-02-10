import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader! } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roles } = await supabase.rpc("get_my_roles");
    if (!roles || !roles.includes("admin")) {
      return new Response(JSON.stringify({ error: "Apenas administradores podem configurar o WhatsApp" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, line_id, label, categorias, access_token, phone_number_id, reminder_enabled, confirm_enabled, receipt_enabled, test_phone } = body;

    // ── Validate / Test credentials ──
    if (action === "validate" || action === "test") {
      if (!access_token || !phone_number_id) {
        return new Response(JSON.stringify({ error: "Token e Phone Number ID são obrigatórios" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Step 1: validate credentials by calling the Meta API to get phone number info
      const validateRes = await fetch(
        `https://graph.facebook.com/v21.0/${phone_number_id}`,
        { headers: { Authorization: `Bearer ${access_token}` } }
      );
      const validateData = await validateRes.json();

      if (!validateRes.ok) {
        const msg = validateData?.error?.message || "Credenciais inválidas";
        return new Response(JSON.stringify({ valid: false, error: msg }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const phoneDisplay = validateData.display_phone_number || validateData.verified_name || phone_number_id;

      if (action === "validate") {
        return new Response(JSON.stringify({ valid: true, phone_display: phoneDisplay, verified_name: validateData.verified_name || "" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Step 2: action === "test" — send a test message
      if (!test_phone) {
        return new Response(JSON.stringify({ error: "Informe o número de teste" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const testRes = await fetch(
        `https://graph.facebook.com/v21.0/${phone_number_id}/messages`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: test_phone.replace(/\D/g, ""),
            type: "text",
            text: { body: "✅ Teste de conexão WhatsApp realizado com sucesso! — Clínica Gestão Integrada" },
          }),
        }
      );
      const testData = await testRes.json();

      if (!testRes.ok) {
        return new Response(JSON.stringify({ sent: false, error: testData?.error?.message || "Erro ao enviar mensagem de teste" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ sent: true, message_id: testData.messages?.[0]?.id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Save config ──
    if (!access_token || !phone_number_id || !label) {
      return new Response(JSON.stringify({ error: "Token, Phone Number ID e nome da linha são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert into whatsapp_lines table
    const { error: upsertError } = await supabase.from("whatsapp_lines").upsert({
      id: line_id,
      label,
      categorias: categorias || [],
      access_token,
      phone_number_id,
      reminder_enabled: reminder_enabled ?? true,
      confirm_enabled: confirm_enabled ?? true,
      receipt_enabled: receipt_enabled ?? true,
    }, { onConflict: "id" });

    if (upsertError) throw upsertError;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error saving WhatsApp config:", err);
    return new Response(JSON.stringify({ error: err.message || "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
