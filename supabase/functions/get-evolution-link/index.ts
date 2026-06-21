import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SIGNED_EXPIRES = 60 * 60 * 24 * 7; // 7 days

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Não autorizado" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");
    const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: claims, error: claimsErr } = await caller.auth.getClaims(token);
    if (claimsErr || !claims?.claims) return json({ error: "Token inválido" }, 401);
    const callerId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const { client_id, send_whatsapp = false } = body || {};
    if (!client_id) return json({ error: "client_id obrigatório" }, 400);

    // Authorize: staff OR the client themselves
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", callerId);
    const isStaff = !!roles?.some((r: any) => ["admin", "profissional", "recepcao"].includes(r.role));
    let isOwner = false;
    if (!isStaff) {
      const { data: ownClient } = await admin
        .from("clients").select("id").eq("id", client_id).eq("user_id", callerId).maybeSingle();
      isOwner = !!ownClient;
    }
    if (!isStaff && !isOwner) return json({ error: "Permissão negada" }, 403);

    // Load photos
    const { data: photos, error: photosErr } = await admin
      .from("evolution_photos")
      .select("id, client_id, record_id, tipo, path, consentimento, consentimento_redes, observacao, created_at")
      .eq("client_id", client_id)
      .order("created_at", { ascending: false });
    if (photosErr) throw photosErr;

    const items: any[] = [];
    for (const p of photos || []) {
      const { data: signed } = await admin.storage.from("clinical-photos").createSignedUrl(p.path, SIGNED_EXPIRES);
      items.push({ ...p, signed_url: signed?.signedUrl || null });
    }

    // Optional: notify client via WhatsApp
    let whatsapp_sent = false;
    if (send_whatsapp && isStaff) {
      const { data: client } = await admin
        .from("clients").select("id, nome, telefone").eq("id", client_id).maybeSingle();
      if (client?.telefone) {
        // Build a per-client portal link (signed-token-free; client must log in)
        const origin = req.headers.get("origin") || "";
        const portalLink = `${origin}/minha-evolucao`;
        const mensagem = `Olá${client.nome ? `, ${client.nome}` : ""}! 📸\n\nSua evolução está disponível no portal do cliente:\n${portalLink}\n\nAcesse com seu login para ver as fotos antes/depois.`;

        const { error: waErr } = await admin.functions.invoke("send-whatsapp", {
          body: {
            tipo: "notificacao",
            destinatario: client.telefone.replace(/\D/g, ""),
            categoria: "fisioterapia",
            dados: { cliente_nome: client.nome, mensagem },
          },
          headers: { Authorization: authHeader },
        });
        whatsapp_sent = !waErr;
      }
    }

    return json({ photos: items, expires_in: SIGNED_EXPIRES, whatsapp_sent });
  } catch (err: any) {
    console.error("get-evolution-link error", err);
    return json({ error: err?.message || "Erro interno" }, 500);
  }

  function json(body: any, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});