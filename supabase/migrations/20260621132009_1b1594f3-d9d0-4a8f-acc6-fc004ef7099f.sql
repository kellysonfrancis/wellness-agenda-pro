
-- health_insurers
CREATE TABLE public.health_insurers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  registro_ans text,
  versao_tiss text NOT NULL DEFAULT '4.01.00',
  codigo_prestador text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_insurers TO authenticated;
GRANT ALL ON public.health_insurers TO service_role;
ALTER TABLE public.health_insurers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insurers_admin_recepcao_all" ON public.health_insurers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'recepcao'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'recepcao'));
CREATE TRIGGER trg_health_insurers_updated_at BEFORE UPDATE ON public.health_insurers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- tiss_procedures
CREATE TABLE public.tiss_procedures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  descricao text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tiss_procedures TO authenticated;
GRANT ALL ON public.tiss_procedures TO service_role;
ALTER TABLE public.tiss_procedures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tiss_proc_admin_all" ON public.tiss_procedures FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "tiss_proc_recepcao_select" ON public.tiss_procedures FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'recepcao') OR public.has_role(auth.uid(),'profissional'));
CREATE TRIGGER trg_tiss_procedures_updated_at BEFORE UPDATE ON public.tiss_procedures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- tiss_guides
CREATE TABLE public.tiss_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insurer_id uuid NOT NULL REFERENCES public.health_insurers(id) ON DELETE RESTRICT,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  batch_id uuid,
  tipo text NOT NULL CHECK (tipo IN ('consulta','sadt')),
  numero_guia text,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','no_lote','enviada','paga','glosada')),
  valor numeric NOT NULL DEFAULT 0,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tiss_guides_insurer_status_idx ON public.tiss_guides (insurer_id, status);
CREATE INDEX tiss_guides_batch_idx ON public.tiss_guides (batch_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tiss_guides TO authenticated;
GRANT ALL ON public.tiss_guides TO service_role;
ALTER TABLE public.tiss_guides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tiss_guides_admin_recepcao_all" ON public.tiss_guides FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'recepcao'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'recepcao'));
CREATE TRIGGER trg_tiss_guides_updated_at BEFORE UPDATE ON public.tiss_guides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- tiss_batches
CREATE TABLE public.tiss_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insurer_id uuid NOT NULL REFERENCES public.health_insurers(id) ON DELETE RESTRICT,
  numero_lote text NOT NULL,
  xml text,
  versao_tiss text,
  total_guias integer NOT NULL DEFAULT 0,
  valor_total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'gerado' CHECK (status IN ('gerado','enviado','retornado','cancelado')),
  enviado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tiss_batches_insurer_idx ON public.tiss_batches (insurer_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tiss_batches TO authenticated;
GRANT ALL ON public.tiss_batches TO service_role;
ALTER TABLE public.tiss_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tiss_batches_admin_recepcao_all" ON public.tiss_batches FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'recepcao'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'recepcao'));
CREATE TRIGGER trg_tiss_batches_updated_at BEFORE UPDATE ON public.tiss_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.tiss_guides
  ADD CONSTRAINT tiss_guides_batch_fk FOREIGN KEY (batch_id) REFERENCES public.tiss_batches(id) ON DELETE SET NULL;
