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

    // Check if user is admin
    const { data: roles } = await supabase.rpc("get_my_roles");
    if (!roles || !roles.includes("admin")) {
      return new Response(JSON.stringify({ error: "Apenas administradores podem configurar o WhatsApp" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { access_token, phone_number_id, reminder_enabled, confirm_enabled, receipt_enabled } = await req.json();

    if (!access_token || !phone_number_id) {
      return new Response(JSON.stringify({ error: "Token e Phone Number ID são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Store config using Supabase Vault (secrets)
    // For now, store in a simple config approach using service role
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Store secrets in vault
    await adminClient.rpc("set_secret" as any, { name: "WHATSAPP_ACCESS_TOKEN", value: access_token });
    await adminClient.rpc("set_secret" as any, { name: "WHATSAPP_PHONE_NUMBER_ID", value: phone_number_id });
    await adminClient.rpc("set_secret" as any, { name: "WHATSAPP_CONFIG", value: JSON.stringify({ reminder_enabled, confirm_enabled, receipt_enabled }) });

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
