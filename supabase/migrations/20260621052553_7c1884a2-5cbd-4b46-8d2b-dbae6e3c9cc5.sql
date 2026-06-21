
CREATE TABLE public.consent_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria text NOT NULL,
  titulo text NOT NULL,
  conteudo text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consent_templates TO authenticated;
GRANT ALL ON public.consent_templates TO service_role;
ALTER TABLE public.consent_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage consent_templates" ON public.consent_templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "staff read consent_templates" ON public.consent_templates
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'recepcao') OR public.has_role(auth.uid(),'profissional'));
CREATE TRIGGER trg_consent_templates_updated BEFORE UPDATE ON public.consent_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.signed_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.consent_templates(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  conteudo_assinado text NOT NULL,
  assinante_nome text NOT NULL,
  assinado_em timestamptz NOT NULL DEFAULT now(),
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.signed_consents TO authenticated;
GRANT ALL ON public.signed_consents TO service_role;
ALTER TABLE public.signed_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage signed_consents" ON public.signed_consents
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'recepcao') OR public.has_role(auth.uid(),'profissional'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'recepcao') OR public.has_role(auth.uid(),'profissional'));
CREATE POLICY "client read own signed_consents" ON public.signed_consents
  FOR SELECT TO authenticated
  USING (client_id IN (SELECT public.get_my_client_ids()));

-- Seed default templates
INSERT INTO public.consent_templates (categoria, titulo, conteudo) VALUES
  ('pilates', 'Termo de Adesão - Pilates',
   'TERMO DE ADESÃO E RESPONSABILIDADE - PILATES

Eu, {nome}, declaro estar ciente das condições para a prática de Pilates oferecidas pela clínica, incluindo a necessidade de avaliação prévia, frequência regular e respeito às orientações dos profissionais.

Estou ciente das regras de cancelamento e fidelização do plano contratado.

Data: {data}'),
  ('fisioterapia', 'Termo de Consentimento - Fisioterapia',
   'TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO - FISIOTERAPIA

Eu, {nome}, autorizo a equipe de fisioterapia a realizar a avaliação e o tratamento fisioterapêutico, ciente de que os procedimentos visam reabilitação e podem incluir manobras manuais, eletroterapia e exercícios terapêuticos.

Fui informado(a) sobre os riscos e benefícios do tratamento.

Data: {data}'),
  ('estetica', 'Termo de Ciência - Estética',
   'TERMO DE CIÊNCIA E CONSENTIMENTO - PROCEDIMENTOS ESTÉTICOS

Eu, {nome}, declaro estar ciente da natureza dos procedimentos estéticos a serem realizados, dos resultados esperados, das possíveis reações adversas e da necessidade de seguir as orientações pós-procedimento.

Autorizo a realização dos procedimentos contratados.

Data: {data}');
