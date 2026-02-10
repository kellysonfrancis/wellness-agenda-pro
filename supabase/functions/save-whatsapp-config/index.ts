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
    const { line_id, label, categorias, access_token, phone_number_id, reminder_enabled, confirm_enabled, receipt_enabled } = body;

    if (!access_token || !phone_number_id || !line_id) {
      return new Response(JSON.stringify({ error: "Token, Phone Number ID e line_id são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Use line_id as suffix to support multiple lines
    const suffix = line_id.substring(0, 8);
    await adminClient.rpc("set_secret" as any, { name: `WA_TOKEN_${suffix}`, value: access_token });
    await adminClient.rpc("set_secret" as any, { name: `WA_PHONE_${suffix}`, value: phone_number_id });
    await adminClient.rpc("set_secret" as any, { name: `WA_CFG_${suffix}`, value: JSON.stringify({
      label,
      categorias,
      reminder_enabled,
      confirm_enabled,
      receipt_enabled,
    })});

    // Also store a manifest of all line IDs
    const existingManifest = await adminClient.rpc("read_secret" as any, { name: "WA_LINES_MANIFEST" }).catch(() => null);
    let lineIds: string[] = [];
    try {
      if (existingManifest?.data) lineIds = JSON.parse(existingManifest.data);
    } catch {}
    if (!lineIds.includes(suffix)) lineIds.push(suffix);
    await adminClient.rpc("set_secret" as any, { name: "WA_LINES_MANIFEST", value: JSON.stringify(lineIds) });

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
