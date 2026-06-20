import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é a assistente virtual da Clínica, especializada em Pilates, Fisioterapia e Estética.

Seu papel é ajudar clientes com dúvidas sobre:
- Serviços oferecidos (Pilates, Fisioterapia e Estética)
- Como agendar consultas e sessões
- Informações sobre pacotes e planos disponíveis
- Horários de funcionamento
- Preparação para sessões
- Dúvidas gerais sobre os tratamentos

Diretrizes:
- Seja simpática, acolhedora e profissional
- Responda sempre em português brasileiro
- Use linguagem clara e acessível
- Não forneça diagnósticos médicos
- Para questões específicas sobre tratamentos, sugira agendar uma consulta com um profissional
- Mantenha as respostas concisas mas completas
- Use formatação markdown quando apropriado (listas, negrito, etc.)`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit: 20 req per IP per 15 min
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip") || "unknown";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const dbClient = createClient(supabaseUrl, serviceKey);
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count } = await dbClient
      .from("rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("ip_address", ip)
      .eq("endpoint", "clinic-chat")
      .gte("created_at", fifteenMinAgo);
    if ((count ?? 0) >= 20) {
      return new Response(
        JSON.stringify({ error: "Muitas solicitações. Tente novamente em alguns minutos." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    await dbClient.from("rate_limits").insert({ ip_address: ip, endpoint: "clinic-chat" });
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    await dbClient.from("rate_limits").delete().lt("created_at", oneHourAgo);

    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas solicitações. Tente novamente em alguns instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Entre em contato com a administração." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Erro no serviço de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("clinic-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
