
CREATE TABLE IF NOT EXISTS public.satisfaction_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  nota int CHECK (nota BETWEEN 1 AND 5),
  comentario text,
  enviado_em timestamptz NOT NULL DEFAULT now(),
  respondido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (appointment_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.satisfaction_surveys TO authenticated;
GRANT ALL ON public.satisfaction_surveys TO service_role;

ALTER TABLE public.satisfaction_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/recepcao leem todas as pesquisas"
ON public.satisfaction_surveys FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'recepcao'));

CREATE POLICY "Clientes leem suas próprias pesquisas"
ON public.satisfaction_surveys FOR SELECT TO authenticated
USING (client_id IN (SELECT public.get_my_client_ids()));

CREATE POLICY "Admin/recepcao gerenciam pesquisas"
ON public.satisfaction_surveys FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'recepcao'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'recepcao'));

CREATE INDEX IF NOT EXISTS idx_satisfaction_surveys_client ON public.satisfaction_surveys(client_id);
CREATE INDEX IF NOT EXISTS idx_satisfaction_surveys_appointment ON public.satisfaction_surveys(appointment_id);
