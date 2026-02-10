-- Table to store WhatsApp line configurations
CREATE TABLE public.whatsapp_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  categorias TEXT[] NOT NULL DEFAULT '{}',
  access_token TEXT NOT NULL,
  phone_number_id TEXT NOT NULL,
  reminder_enabled BOOLEAN NOT NULL DEFAULT true,
  confirm_enabled BOOLEAN NOT NULL DEFAULT true,
  receipt_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_lines ENABLE ROW LEVEL SECURITY;

-- Only admins can manage WhatsApp lines
CREATE POLICY "Admins can manage whatsapp_lines"
  ON public.whatsapp_lines
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_whatsapp_lines_updated_at
  BEFORE UPDATE ON public.whatsapp_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Log table for sent messages
CREATE TABLE public.whatsapp_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  line_id UUID REFERENCES public.whatsapp_lines(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL, -- 'lembrete', 'confirmacao', 'recibo'
  destinatario TEXT NOT NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'enviado', -- 'enviado', 'entregue', 'lido', 'erro'
  meta_message_id TEXT,
  erro TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view whatsapp_log"
  ON public.whatsapp_log
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role insert whatsapp_log"
  ON public.whatsapp_log
  FOR INSERT
  WITH CHECK (true);