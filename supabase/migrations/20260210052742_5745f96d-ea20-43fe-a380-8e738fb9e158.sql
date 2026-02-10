
-- Create waitlist status enum
CREATE TYPE public.waitlist_status AS ENUM ('aguardando', 'notificado', 'agendado', 'expirado', 'cancelado');

-- Create waitlist table
CREATE TABLE public.waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id),
  profissional_id UUID REFERENCES public.professionals(id),
  dia_semana TEXT,
  horario_preferido TEXT,
  observacoes TEXT,
  status public.waitlist_status NOT NULL DEFAULT 'aguardando',
  notificado_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins can manage waitlist"
  ON public.waitlist FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Recepcao can manage
CREATE POLICY "Recepcao can manage waitlist"
  ON public.waitlist FOR ALL
  USING (public.has_role(auth.uid(), 'recepcao'::app_role));

-- Profissionais can view
CREATE POLICY "Profissionais can view waitlist"
  ON public.waitlist FOR SELECT
  USING (public.has_role(auth.uid(), 'profissional'::app_role));

-- Updated_at trigger
CREATE TRIGGER update_waitlist_updated_at
  BEFORE UPDATE ON public.waitlist
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Index
CREATE INDEX idx_waitlist_status ON public.waitlist(status, created_at);
