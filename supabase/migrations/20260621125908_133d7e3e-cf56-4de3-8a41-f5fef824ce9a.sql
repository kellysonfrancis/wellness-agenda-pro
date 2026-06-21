
-- payment_settings: chaves dos gateways. RLS bloqueia tudo via anon/authenticated; só service role lê.
CREATE TABLE public.payment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('asaas','mercadopago')),
  mode text NOT NULL DEFAULT 'sandbox' CHECK (mode IN ('sandbox','production')),
  is_active boolean NOT NULL DEFAULT false,
  api_key text,
  webhook_secret text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.payment_settings TO service_role;

ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_settings_no_access" ON public.payment_settings
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);

CREATE UNIQUE INDEX payment_settings_one_active ON public.payment_settings (is_active) WHERE is_active = true;
CREATE UNIQUE INDEX payment_settings_unique_provider ON public.payment_settings (provider);

CREATE TRIGGER trg_payment_settings_updated_at BEFORE UPDATE ON public.payment_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- subscriptions
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.product_plans(id),
  provider text NOT NULL,
  provider_customer_id text,
  provider_subscription_id text,
  status text NOT NULL DEFAULT 'pending',
  valor numeric(10,2),
  periodicidade text NOT NULL DEFAULT 'mensal',
  proxima_cobranca date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subs_admin_recepcao_all" ON public.subscriptions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'recepcao'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'recepcao'::app_role));

CREATE POLICY "subs_client_select_own" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (client_id IN (SELECT public.get_my_client_ids()));

CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX subscriptions_provider_sub_idx ON public.subscriptions (provider_subscription_id);

-- Extra colunas em payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS provider_payment_id text,
  ADD COLUMN IF NOT EXISTS gateway_status text;

CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_payment_unique
  ON public.payments (provider, provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;
