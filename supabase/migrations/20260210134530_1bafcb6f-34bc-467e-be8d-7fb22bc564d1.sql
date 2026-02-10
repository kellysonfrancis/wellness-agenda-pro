-- Storage bucket for landing page assets (logo, banner)
INSERT INTO storage.buckets (id, name, public) VALUES ('landing-assets', 'landing-assets', true);

-- Allow anyone to view landing assets (public page)
CREATE POLICY "Public can view landing assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'landing-assets');

-- Only admins can upload/update/delete
CREATE POLICY "Admins can manage landing assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'landing-assets' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update landing assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'landing-assets' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete landing assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'landing-assets' AND public.has_role(auth.uid(), 'admin'::app_role));

-- Landing page configuration table (single row)
CREATE TABLE public.landing_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_clinica text NOT NULL DEFAULT 'Clínica',
  subtitulo text DEFAULT 'Pilates · Fisioterapia · Estética',
  logo_url text,
  banner_url text,
  cor_primaria text DEFAULT '#0d7377',
  cor_fundo text DEFAULT '#f5f7f6',
  cor_texto text DEFAULT '#1a2e35',
  link_instagram text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.landing_config ENABLE ROW LEVEL SECURITY;

-- Anyone can read (public page needs it)
CREATE POLICY "Anyone can view landing_config"
ON public.landing_config FOR SELECT
USING (true);

-- Only admins can manage
CREATE POLICY "Admins can manage landing_config"
ON public.landing_config FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Insert default row
INSERT INTO public.landing_config (nome_clinica) VALUES ('Clínica');

-- Trigger for updated_at
CREATE TRIGGER update_landing_config_updated_at
BEFORE UPDATE ON public.landing_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();