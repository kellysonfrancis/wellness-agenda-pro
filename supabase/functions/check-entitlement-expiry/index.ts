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
    const { data: lines } = await db.from("whatsapp_lines").select("*").eq("expiry_enabled", true);
    if (!lines || lines.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhuma linha com aviso de vencimento ativo" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const line = lines[0];

    const today = new Date();
    const milestones = [5, 1];
    let sent = 0, skipped = 0, errors = 0;

    for (const days of milestones) {
      const target = new Date(today);
      target.setDate(target.getDate() + days);
      const targetISO = target.toISOString().slice(0, 10);
      const tipo = `vencimento_${days}d`;

      const { data: ents } = await db
        .from("client_entitlements")
        .select("id, expira_em, saldo_creditos, client_id, clients!client_entitlements_client_id_fkey(id, nome, telefone), product_plans!client_entitlements_product_plan_id_fkey(nome)")
        .eq("status", "ativo")
        .eq("expira_em", targetISO);

      for (const e of ents || []) {
        const c: any = (e as any).clients;
        const plan: any = (e as any).product_plans;
        if (!c?.telefone) { skipped++; continue; }

        const { data: existing } = await db
          .from("whatsapp_log")
          .select("id").eq("entitlement_id", e.id).eq("tipo", tipo).limit(1);
        if (existing && existing.length > 0) { skipped++; continue; }

        const phone = c.telefone.replace(/\D/g, "");
        const dStr = new Date(e.expira_em + "T00:00:00").toLocaleDateString("pt-BR");
        const text =
          `Olá, ${c.nome}! 👋\n\n` +
          `Seu pacote *${plan?.nome || "ativo"}* vence em *${days} dia${days > 1 ? "s" : ""}* (${dStr}).\n` +
          (e.saldo_creditos != null ? `Saldo atual: ${e.saldo_creditos} crédito(s).\n` : "") +
          `\nQue tal já garantir a renovação? Fale com a recepção para continuar seu acompanhamento sem interrupção. 💪`;

        try {
          const msgId = await sendViaLine(line, phone, text);
          await db.from("whatsapp_log").insert({
            line_id: line.id, tipo, destinatario: phone,
            client_id: c.id, entitlement_id: e.id, status: "enviado", meta_message_id: msgId,
          });
          sent++;
        } catch (err: any) {
          await db.from("whatsapp_log").insert({
            line_id: line.id, tipo, destinatario: phone,
            client_id: c.id, entitlement_id: e.id, status: "erro", erro: String(err?.message || err),
          });
          errors++;
        }
      }
    }

    return new Response(JSON.stringify({ success: true, sent, skipped, errors }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("check-entitlement-expiry:", err);
    return new Response(JSON.stringify({ error: err.message || "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});