
-- Create plan_type enum
CREATE TYPE public.plan_type AS ENUM ('mensal_recorrente', 'pacote_creditos', 'combo_itens', 'creditos_estetica');

-- Create product_plans table
CREATE TABLE public.product_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo public.plan_type NOT NULL,
  nome TEXT NOT NULL,
  categoria public.categoria NOT NULL,
  preco NUMERIC NOT NULL DEFAULT 0,
  validade_dias INTEGER,
  creditos_total INTEGER,
  itens_combo JSONB,
  frequencia_pilates TEXT,
  vigencia_meses INTEGER,
  aulas_por_mes INTEGER,
  ilimitado BOOLEAN NOT NULL DEFAULT false,
  termo_fidelizacao TEXT,
  multa_cancelamento NUMERIC,
  desconto_indicacao_pct NUMERIC,
  desconto_familiar_pct NUMERIC,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_plans ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage product_plans"
  ON public.product_plans FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view product_plans"
  ON public.product_plans FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Add delete policy for clients (was missing)
CREATE POLICY "Admins can delete clients"
  ON public.clients FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_product_plans_updated_at
  BEFORE UPDATE ON public.product_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Seed initial plans
INSERT INTO public.product_plans (tipo, nome, categoria, preco, frequencia_pilates, vigencia_meses, aulas_por_mes, ilimitado, desconto_indicacao_pct, desconto_familiar_pct) VALUES
  ('mensal_recorrente', 'Pilates 2x/sem', 'pilates', 480, '2x_semana', 1, 8, false, 10, 15),
  ('mensal_recorrente', 'Pilates 3x/sem', 'pilates', 650, '3x_semana', 1, 12, false, 10, 15),
  ('mensal_recorrente', 'Pilates Avulsa', 'pilates', 120, 'avulsa', 1, 1, false, NULL, NULL),
  ('mensal_recorrente', 'Pilates Ilimitado', 'pilates', 750, NULL, 6, NULL, true, 10, 15);

INSERT INTO public.product_plans (tipo, nome, categoria, preco, creditos_total, validade_dias) VALUES
  ('pacote_creditos', 'Fisio 10 Sessões', 'fisioterapia', 1500, 10, 120);

INSERT INTO public.product_plans (tipo, nome, categoria, preco, itens_combo, validade_dias) VALUES
  ('combo_itens', 'Combo Estética Facial', 'estetica', 800, '[{"serviceId":"s5","quantidade":2},{"serviceId":"s6","quantidade":1}]'::jsonb, 90);

INSERT INTO public.product_plans (tipo, nome, categoria, preco, creditos_total, validade_dias) VALUES
  ('creditos_estetica', '5 Créditos Estética', 'estetica', 1200, 5, 180);
