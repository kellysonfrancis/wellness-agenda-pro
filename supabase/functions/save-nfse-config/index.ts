import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return j({ error: "Não autorizado" }, 401);

    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return j({ error: "Não autorizado" }, 401);
    const { data: roles } = await userClient.rpc("get_my_roles");
    if (!roles || !roles.includes("admin")) return j({ error: "Apenas administradores" }, 403);

    const admin = createClient(url, service);
    const body = await req.json();
    const { action, provider, mode, api_key, empresa_id, webhook_secret, is_active } = body;

    if (action === "status") {
      const { data } = await admin.from("nfse_settings").select("id, provider, mode, is_active, api_key, empresa_id, webhook_secret").order("created_at");
      const masked = (data || []).map((r: any) => ({
        id: r.id, provider: r.provider, mode: r.mode, is_active: r.is_active,
        has_api_key: !!r.api_key, has_webhook_secret: !!r.webhook_secret,
        empresa_id: r.empresa_id || "",
      }));
      return j({ settings: masked });
    }

    if (!provider || !["enotas", "focus"].includes(provider)) return j({ error: "Provider inválido" }, 400);

    const { data: current } = await admin.from("nfse_settings").select("*").eq("provider", provider).maybeSingle();
    const finalApiKey = api_key === "__keep__" ? current?.api_key : api_key;
    const finalSecret = webhook_secret === "__keep__" ? current?.webhook_secret : webhook_secret;
    if (!finalApiKey) return j({ error: "API key obrigatória" }, 400);

    if (is_active) {
      await admin.from("nfse_settings").update({ is_active: false }).neq("provider", provider);
    }

    const row: any = {
      provider,
      mode: mode || "sandbox",
      api_key: finalApiKey,
      empresa_id: empresa_id ?? current?.empresa_id ?? null,
      webhook_secret: finalSecret || null,
      is_active: !!is_active,
      updated_at: new Date().toISOString(),
    };

    const { error } = await admin.from("nfse_settings").upsert(row, { onConflict: "provider" });
    if (error) throw error;
    return j({ ok: true });
  } catch (e: any) {
    return j({ error: e.message || "Erro" }, 500);
  }
});

function j(b: any, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}