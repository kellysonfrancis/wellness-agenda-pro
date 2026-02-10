
-- Commission rates per category
CREATE TABLE public.commission_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria TEXT NOT NULL, -- pilates, fisioterapia, estetica
  percentual numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(categoria)
);

ALTER TABLE public.commission_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage commission_rates"
  ON public.commission_rates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view commission_rates"
  ON public.commission_rates FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Sales records linking a payment/entitlement to the seller
CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  seller_type TEXT NOT NULL CHECK (seller_type IN ('profissional', 'recepcao')),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  entitlement_id uuid REFERENCES public.client_entitlements(id),
  payment_id uuid REFERENCES public.payments(id),
  categoria TEXT NOT NULL,
  valor_venda numeric NOT NULL DEFAULT 0,
  percentual_comissao numeric NOT NULL DEFAULT 0,
  valor_comissao numeric NOT NULL DEFAULT 0,
  pago boolean NOT NULL DEFAULT false,
  pago_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sales"
  ON public.sales FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Recepcao can manage sales"
  ON public.sales FOR ALL
  USING (has_role(auth.uid(), 'recepcao'::app_role));

CREATE POLICY "Profissionais can view own sales"
  ON public.sales FOR SELECT
  USING (has_role(auth.uid(), 'profissional'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_commission_rates_updated_at
  BEFORE UPDATE ON public.commission_rates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_sales_updated_at
  BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Seed default commission rates
INSERT INTO public.commission_rates (categoria, percentual) VALUES
  ('pilates', 10),
  ('fisioterapia', 15),
  ('estetica', 12);
