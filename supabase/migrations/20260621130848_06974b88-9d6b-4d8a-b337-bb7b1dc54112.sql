
CREATE TABLE public.clinical_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('resumo','alerta_abandono')),
  conteudo text NOT NULL,
  gerado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.clinical_insights TO authenticated;
GRANT ALL ON public.clinical_insights TO service_role;

ALTER TABLE public.clinical_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insights_clinical_select" ON public.clinical_insights
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'profissional'::app_role));

CREATE INDEX clinical_insights_client_tipo_idx ON public.clinical_insights (client_id, tipo, gerado_em DESC);

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
