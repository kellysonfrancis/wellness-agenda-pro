import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};
const j = (b: any, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function hmacSha256Hex(secret: string, data: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function addMonth(dateStr: string | null): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

async function renewEntitlement(admin: any, sub: any) {
  if (!sub.plan_id) return;
  const { data: plan } = await admin.from("product_plans").select("*").eq("id", sub.plan_id).maybeSingle();
  if (!plan) return;

  const today = new Date().toISOString().slice(0, 10);
  const expira = addMonth(today);
  const saldo = plan.aulas_por_mes ?? plan.creditos_total ?? 0;

  // try update existing active entitlement of this plan; else insert
  const { data: existing } = await admin
    .from("client_entitlements")
    .select("id")
    .eq("client_id", sub.client_id)
    .eq("product_plan_id", sub.plan_id)
    .in("status", ["ativo", "vencido", "pausado"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    await admin.from("client_entitlements").update({
      status: "ativo",
      saldo_creditos: saldo,
      expira_em: expira,
      inicio_em: today,
    }).eq("id", existing.id);
  } else {
    await admin.from("client_entitlements").insert({
      client_id: sub.client_id,
      product_plan_id: sub.plan_id,
      status: "ativo",
      saldo_creditos: saldo,
      inicio_em: today,
      expira_em: expira,
    });
  }
}

async function markPaid(admin: any, providerName: string, providerPaymentId: string, sub: any, valor: number) {
  // idempotency check
  const { data: existing } = await admin
    .from("payments")
    .select("id")
    .eq("provider", providerName)
    .eq("provider_payment_id", providerPaymentId)
    .maybeSingle();
  if (existing) return;

  await admin.from("payments").insert({
    client_id: sub.client_id,
    subscription_id: sub.id,
    valor_total: valor,
    valor_pago: valor,
    status: "pago",
    metodo: "pix",
    provider: providerName,
    provider_payment_id: providerPaymentId,
    gateway_status: "approved",
    pago_em: new Date().toISOString(),
  });

  await admin.from("subscriptions").update({
    status: "active",
    proxima_cobranca: addMonth(sub.proxima_cobranca || null),
  }).eq("id", sub.id);

  await renewEntitlement(admin, sub);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, service);

    const { data: cfg } = await admin.from("payment_settings").select("*").eq("is_active", true).maybeSingle();
    if (!cfg) return j({ error: "Sem provedor ativo" }, 400);

    const rawBody = await req.text();
    const headers = req.headers;

    // ── Asaas ──
    if (cfg.provider === "asaas") {
      const token = headers.get("asaas-access-token");
      if (!cfg.webhook_secret || token !== cfg.webhook_secret) return j({ error: "Assinatura inválida" }, 401);

      const body = JSON.parse(rawBody);
      const event = body?.event;
      const payment = body?.payment;
      if (!payment) return j({ ok: true });

      if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") {
        const subId = payment.subscription;
        if (!subId) return j({ ok: true });
        const { data: sub } = await admin.from("subscriptions").select("*").eq("provider_subscription_id", subId).maybeSingle();
        if (!sub) return j({ ok: true });
        await markPaid(admin, "asaas", String(payment.id), sub, Number(payment.value || sub.valor || 0));
      }
      return j({ ok: true });
    }

    // ── Mercado Pago ──
    if (cfg.provider === "mercadopago") {
      const xSig = headers.get("x-signature") || "";
      const xReqId = headers.get("x-request-id") || "";
      const u = new URL(req.url);
      const dataId = u.searchParams.get("data.id") || (() => {
        try { return JSON.parse(rawBody)?.data?.id; } catch { return null; }
      })();

      // parse x-signature: "ts=...,v1=..."
      const parts = Object.fromEntries(xSig.split(",").map((p) => p.trim().split("=").map((s) => s.trim())));
      const ts = parts.ts;
      const v1 = parts.v1;

      if (cfg.webhook_secret && ts && v1 && dataId) {
        const manifest = `id:${dataId};request-id:${xReqId};ts:${ts};`;
        const expected = await hmacSha256Hex(cfg.webhook_secret, manifest);
        if (expected !== v1) return j({ error: "Assinatura inválida" }, 401);
      } else if (cfg.webhook_secret) {
        return j({ error: "Assinatura ausente" }, 401);
      }

      const body = (() => { try { return JSON.parse(rawBody); } catch { return {}; } })();
      const type = body?.type || body?.topic;

      if (type === "payment" && dataId) {
        const payRes = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
          headers: { Authorization: `Bearer ${cfg.api_key}` },
        });
        const pay = await payRes.json();
        if (pay?.status === "approved") {
          const preapprovalId = pay?.metadata?.preapproval_id || pay?.preapproval_id;
          if (!preapprovalId) return j({ ok: true });
          const { data: sub } = await admin.from("subscriptions").select("*").eq("provider_subscription_id", preapprovalId).maybeSingle();
          if (!sub) return j({ ok: true });
          await markPaid(admin, "mercadopago", String(pay.id), sub, Number(pay.transaction_amount || sub.valor || 0));
        }
      }
      return j({ ok: true });
    }

    return j({ ok: true });
  } catch (e: any) {
    console.error(e);
    return j({ error: e.message || "Erro" }, 500);
  }
});