ALTER TABLE public.whatsapp_lines
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'meta',
  ADD COLUMN IF NOT EXISTS evolution_url text,
  ADD COLUMN IF NOT EXISTS evolution_instance text,
  ADD COLUMN IF NOT EXISTS evolution_api_key text,
  ADD COLUMN IF NOT EXISTS evolution_status text DEFAULT 'disconnected',
  ADD COLUMN IF NOT EXISTS evolution_phone text;

ALTER TABLE public.whatsapp_lines ALTER COLUMN access_token DROP NOT NULL;
ALTER TABLE public.whatsapp_lines ALTER COLUMN phone_number_id DROP NOT NULL;

ALTER TABLE public.whatsapp_lines DROP CONSTRAINT IF EXISTS whatsapp_lines_provider_check;
ALTER TABLE public.whatsapp_lines ADD CONSTRAINT whatsapp_lines_provider_check CHECK (provider IN ('meta','evolution'));