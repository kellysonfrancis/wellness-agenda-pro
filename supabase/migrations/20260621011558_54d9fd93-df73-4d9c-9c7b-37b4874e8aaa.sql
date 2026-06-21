
-- record_templates
CREATE TABLE IF NOT EXISTS public.record_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria text NOT NULL CHECK (categoria IN ('pilates','fisioterapia','estetica')),
  nome text NOT NULL,
  campos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.record_templates TO authenticated;
GRANT ALL ON public.record_templates TO service_role;

ALTER TABLE public.record_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profissionais e admin leem templates"
ON public.record_templates FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'profissional'));

CREATE POLICY "Admin gerencia templates"
ON public.record_templates FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- clinical_records: template_id + dados
ALTER TABLE public.clinical_records
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.record_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dados jsonb;

-- physical_assessments
CREATE TABLE IF NOT EXISTS public.physical_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  profissional_id uuid REFERENCES public.professionals(id) ON DELETE SET NULL,
  data date NOT NULL DEFAULT CURRENT_DATE,
  peso numeric(6,2),
  altura numeric(5,2),
  medidas jsonb,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.physical_assessments TO authenticated;
GRANT ALL ON public.physical_assessments TO service_role;

ALTER TABLE public.physical_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin e profissional leem avaliações"
ON public.physical_assessments FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'profissional'));

CREATE POLICY "Admin e profissional gerenciam avaliações"
ON public.physical_assessments FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'profissional'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'profissional'));

CREATE INDEX IF NOT EXISTS idx_physical_assessments_client_data ON public.physical_assessments(client_id, data DESC);

-- Seeds (one template per category, only if categoria has no template yet)
INSERT INTO public.record_templates (categoria, nome, campos)
SELECT 'pilates', 'Avaliação Postural — Pilates',
'[
  {"key":"queixa_principal","label":"Queixa principal","type":"textarea"},
  {"key":"objetivo","label":"Objetivo","type":"text"},
  {"key":"postura_geral","label":"Postura geral","type":"select","opcoes":["Normal","Anteriorizada","Posteriorizada","Escoliótica"]},
  {"key":"ombros","label":"Ombros","type":"select","opcoes":["Nivelados","Direito elevado","Esquerdo elevado","Protraídos"]},
  {"key":"quadril","label":"Quadril","type":"select","opcoes":["Neutro","Anteversão","Retroversão","Báscula"]},
  {"key":"joelhos","label":"Joelhos","type":"select","opcoes":["Neutros","Valgo","Varo","Hiperextensão"]},
  {"key":"flexibilidade","label":"Flexibilidade","type":"select","opcoes":["Boa","Regular","Reduzida"]},
  {"key":"core","label":"Ativação de core","type":"select","opcoes":["Boa","Regular","Insuficiente"]},
  {"key":"observacoes","label":"Observações","type":"textarea"}
]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.record_templates WHERE categoria='pilates');

INSERT INTO public.record_templates (categoria, nome, campos)
SELECT 'fisioterapia', 'Evolução — Fisioterapia',
'[
  {"key":"queixa","label":"Queixa do dia","type":"textarea"},
  {"key":"escala_dor","label":"Escala de dor (0-10)","type":"number"},
  {"key":"regiao","label":"Região acometida","type":"text"},
  {"key":"condutas","label":"Condutas realizadas","type":"textarea"},
  {"key":"resposta","label":"Resposta ao tratamento","type":"select","opcoes":["Melhora","Estável","Piora"]},
  {"key":"adm","label":"Amplitude de movimento","type":"text"},
  {"key":"forca","label":"Força (0-5)","type":"select","opcoes":["0","1","2","3","4","5"]},
  {"key":"plano","label":"Plano para próxima sessão","type":"textarea"}
]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.record_templates WHERE categoria='fisioterapia');

INSERT INTO public.record_templates (categoria, nome, campos)
SELECT 'estetica', 'Anamnese — Estética',
'[
  {"key":"tipo_pele","label":"Tipo de pele","type":"select","opcoes":["Normal","Seca","Oleosa","Mista","Sensível"]},
  {"key":"fototipo","label":"Fototipo (Fitzpatrick)","type":"select","opcoes":["I","II","III","IV","V","VI"]},
  {"key":"queixa_estetica","label":"Queixa principal","type":"textarea"},
  {"key":"alergias","label":"Alergias","type":"text"},
  {"key":"medicacoes","label":"Medicações em uso","type":"text"},
  {"key":"procedimentos_previos","label":"Procedimentos prévios","type":"textarea"},
  {"key":"exposicao_sol","label":"Exposição solar","type":"select","opcoes":["Baixa","Moderada","Alta"]},
  {"key":"gestante","label":"Gestante","type":"select","opcoes":["Não","Sim"]},
  {"key":"contraindicacoes","label":"Contraindicações","type":"textarea"},
  {"key":"procedimento_realizado","label":"Procedimento realizado","type":"text"},
  {"key":"observacoes","label":"Observações","type":"textarea"}
]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.record_templates WHERE categoria='estetica');

CREATE TRIGGER record_templates_updated_at
BEFORE UPDATE ON public.record_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
