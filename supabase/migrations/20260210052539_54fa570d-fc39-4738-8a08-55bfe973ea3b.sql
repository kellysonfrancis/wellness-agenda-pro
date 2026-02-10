
-- Create enum for record types
CREATE TYPE public.clinical_record_type AS ENUM ('anamnese', 'evolucao', 'observacao', 'alta');

-- Create clinical_records table
CREATE TABLE public.clinical_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  profissional_id UUID NOT NULL REFERENCES public.professionals(id),
  tipo public.clinical_record_type NOT NULL DEFAULT 'evolucao',
  conteudo TEXT NOT NULL,
  data_registro DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clinical_records ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins can manage clinical_records"
  ON public.clinical_records FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Professionals can view and insert records
CREATE POLICY "Profissionais can view clinical_records"
  ON public.clinical_records FOR SELECT
  USING (public.has_role(auth.uid(), 'profissional'::app_role));

CREATE POLICY "Profissionais can insert clinical_records"
  ON public.clinical_records FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'profissional'::app_role)
    AND profissional_id IN (
      SELECT id FROM public.professionals WHERE user_id = auth.uid()
    )
  );

-- Recepcao can view
CREATE POLICY "Recepcao can view clinical_records"
  ON public.clinical_records FOR SELECT
  USING (public.has_role(auth.uid(), 'recepcao'::app_role));

-- Updated_at trigger
CREATE TRIGGER update_clinical_records_updated_at
  BEFORE UPDATE ON public.clinical_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Index for fast lookups
CREATE INDEX idx_clinical_records_client ON public.clinical_records(client_id, data_registro DESC);
