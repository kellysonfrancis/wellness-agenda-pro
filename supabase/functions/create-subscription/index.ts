import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const j = (b: any, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
function nextMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

async function createAsaas(cfg: { api_key: string; mode: string }, client: any, plan: any, billing_type: string) {
  const base = cfg.mode === "production" ? "https://api.asaas.com/v3" : "https://sandbox.asaas.com/api/v3";
  const headers = { "access_token": cfg.api_key, "Content-Type": "application/json" };

  // 1. customer
  const custRes = await fetch(`${base}/customers`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: client.nome,
      cpfCnpj: (client.cpf || "").replace(/\D/g, "") || undefined,
      email: client.email || undefined,
      mobilePhone: (client.telefone || "").replace(/\D/g, "") || undefined,
    }),
  });
  const cust = await custRes.json();
  if (!custRes.ok) throw new Error(cust?.errors?.[0]?.description || "Falha ao criar cliente no Asaas");

  // 2. subscription
  const subRes = await fetch(`${base}/subscriptions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      customer: cust.id,
      billingType: billing_type,
      value: Number(plan.preco),
      nextDueDate: tomorrow(),
      cycle: "MONTHLY",
      description: plan.nome,
    }),
  });
  const sub = await subRes.json();
  if (!subRes.ok) throw new Error(sub?.errors?.[0]?.description || "Falha ao criar assinatura no Asaas");

  // 3. payment url (1st invoice)
  let payment_url: string | null = null;
  try {
    const payRes = await fetch(`${base}/payments?subscription=${sub.id}`, { headers });
    const payJson = await payRes.json();
    const first = payJson?.data?.[0];
    payment_url = first?.invoiceUrl || first?.bankSlipUrl || null;
  } catch (_) { /* ignore */ }

  return {
    provider_customer_id: cust.id,
    provider_subscription_id: sub.id,
    payment_url,
    proxima_cobranca: tomorrow(),
  };
}

async function createMercadoPago(cfg: { api_key: string }, client: any, plan: any, back_url: string) {
  const base = "https://api.mercadopago.com";
  const headers = { Authorization: `Bearer ${cfg.api_key}`, "Content-Type": "application/json" };

  const res = await fetch(`${base}/preapproval`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      reason: plan.nome,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: Number(plan.preco),
        currency_id: "BRL",
      },
      payer_email: client.email,
      back_url,
      status: "pending",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Falha ao criar assinatura no Mercado Pago");

  return {
    provider_customer_id: null,
    provider_subscription_id: data.id,
    payment_url: data.init_point || data.sandbox_init_point || null,
    proxima_cobranca: nextMonth(),
  };
}

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
    if (!roles || !(roles.includes("admin") || roles.includes("recepcao"))) {
      return j({ error: "Apenas admin/recepção" }, 403);
    }

    const { client_id, plan_id, billing_type } = await req.json();
    if (!client_id || !plan_id) return j({ error: "client_id e plan_id obrigatórios" }, 400);
    const bt = (billing_type || "PIX").toUpperCase();
    if (!["PIX", "CREDIT_CARD", "BOLETO"].includes(bt)) return j({ error: "billing_type inválido" }, 400);

    const admin = createClient(url, service);

    const { data: cfg } = await admin.from("payment_settings").select("*").eq("is_active", true).maybeSingle();
    if (!cfg) return j({ error: "Nenhum provedor de pagamento ativo" }, 400);

    const { data: client } = await admin.from("clients").select("id, nome, email, telefone, cpf").eq("id", client_id).maybeSingle();
    if (!client) return j({ error: "Cliente não encontrado" }, 404);
    const { data: plan } = await admin.from("product_plans").select("id, nome, preco, tipo").eq("id", plan_id).maybeSingle();
    if (!plan) return j({ error: "Plano não encontrado" }, 404);

    let result: any;
    try {
      if (cfg.provider === "asaas") {
        result = await createAsaas({ api_key: cfg.api_key, mode: cfg.mode }, client, plan, bt);
      } else {
        const origin = req.headers.get("origin") || req.headers.get("referer") || url;
        result = await createMercadoPago({ api_key: cfg.api_key }, client, plan, origin);
      }
    } catch (err: any) {
      console.error("Provider error:", err);
      return j({ error: err.message || "Erro no provedor" }, 502);
    }

    const { data: sub, error: insErr } = await admin.from("subscriptions").insert({
      client_id,
      plan_id,
      provider: cfg.provider,
      provider_customer_id: result.provider_customer_id,
      provider_subscription_id: result.provider_subscription_id,
      status: "pending",
      valor: Number(plan.preco),
      periodicidade: "mensal",
      proxima_cobranca: result.proxima_cobranca,
    }).select("id").single();
    if (insErr) throw insErr;

    return j({ subscription_id: sub.id, payment_url: result.payment_url });
  } catch (e: any) {
    console.error(e);
    return j({ error: e.message || "Erro" }, 500);
  }
});