
-- 1. Create client_entitlements table
CREATE TABLE public.client_entitlements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  product_plan_id UUID NOT NULL REFERENCES public.product_plans(id),
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'pausado', 'encerrado', 'vencido')),
  saldo_creditos INTEGER DEFAULT 0,
  inicio_em DATE NOT NULL DEFAULT CURRENT_DATE,
  expira_em DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage client_entitlements" ON public.client_entitlements FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Recepcao can manage client_entitlements" ON public.client_entitlements FOR ALL USING (has_role(auth.uid(), 'recepcao'::app_role));
CREATE POLICY "Profissionais can view client_entitlements" ON public.client_entitlements FOR SELECT USING (has_role(auth.uid(), 'profissional'::app_role));

CREATE TRIGGER update_client_entitlements_updated_at BEFORE UPDATE ON public.client_entitlements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2. Add entitlement_id to appointments
ALTER TABLE public.appointments ADD COLUMN entitlement_id UUID REFERENCES public.client_entitlements(id) ON DELETE SET NULL;

-- 3. Create makeup_classes table (reposições Pilates)
CREATE TABLE public.makeup_classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entitlement_id UUID NOT NULL REFERENCES public.client_entitlements(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  original_appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  makeup_appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  prazo_limite DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'reagendado', 'expirado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.makeup_classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage makeup_classes" ON public.makeup_classes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Recepcao can manage makeup_classes" ON public.makeup_classes FOR ALL USING (has_role(auth.uid(), 'recepcao'::app_role));
CREATE POLICY "Profissionais can view makeup_classes" ON public.makeup_classes FOR SELECT USING (has_role(auth.uid(), 'profissional'::app_role));

CREATE TRIGGER update_makeup_classes_updated_at BEFORE UPDATE ON public.makeup_classes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
