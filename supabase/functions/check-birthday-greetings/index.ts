import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const META_API = "https://graph.facebook.com/v21.0";

async function sendViaLine(line: any, phone: string, text: string) {
  if ((line.provider || "meta") === "evolution") {
    const url = `${line.evolution_url?.replace(/\/$/, "")}/message/sendText/${line.evolution_instance}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: line.evolution_api_key },
      body: JSON.stringify({ number: phone, text }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    return data?.key?.id || null;
  }
  const res = await fetch(`${META_API}/${line.phone_number_id}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${line.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: phone, type: "text", text: { body: text } }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data.error || data));
  return data.messages?.[0]?.id || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { data: lines } = await db.from("whatsapp_lines").select("*").eq("birthday_enabled", true);
    if (!lines || lines.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhuma linha com aniversário ativo" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // pick the first enabled line as default sender
    const line = lines[0];

    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");

    const { data: clients } = await db
      .from("clients")
      .select("id, nome, telefone, data_nascimento")
      .not("data_nascimento", "is", null)
      .not("telefone", "is", null);

    let sent = 0, skipped = 0, errors = 0;
    const todayISO = today.toISOString().slice(0, 10);

    for (const c of clients || []) {
      const d = String(c.data_nascimento);
      if (d.slice(5, 7) !== mm || d.slice(8, 10) !== dd) continue;
      if (!c.telefone) { skipped++; continue; }

      // de-dup: already sent birthday today
      const { data: existing } = await db
        .from("whatsapp_log")
        .select("id")
        .eq("client_id", c.id)
        .eq("tipo", "aniversario")
        .gte("created_at", `${todayISO}T00:00:00Z`)
        .limit(1);
      if (existing && existing.length > 0) { skipped++; continue; }

      const phone = c.telefone.replace(/\D/g, "");
      const text = `🎉 Feliz aniversário, ${c.nome}! 🎂\n\nDesejamos um dia incrível, cheio de saúde e alegria. Conte com a nossa equipe para cuidar de você sempre!`;

      try {
        const msgId = await sendViaLine(line, phone, text);
        await db.from("whatsapp_log").insert({
          line_id: line.id, tipo: "aniversario", destinatario: phone,
          client_id: c.id, status: "enviado", meta_message_id: msgId,
        });
        sent++;
      } catch (e: any) {
        await db.from("whatsapp_log").insert({
          line_id: line.id, tipo: "aniversario", destinatario: phone,
          client_id: c.id, status: "erro", erro: String(e?.message || e),
        });
        errors++;
      }
    }

    return new Response(JSON.stringify({ success: true, sent, skipped, errors }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("check-birthday-greetings:", err);
    return new Response(JSON.stringify({ error: err.message || "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});