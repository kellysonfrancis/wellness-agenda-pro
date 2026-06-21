
ALTER TABLE public.whatsapp_lines
  ADD COLUMN IF NOT EXISTS birthday_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expiry_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.whatsapp_log
  ADD COLUMN IF NOT EXISTS entitlement_id uuid REFERENCES public.client_entitlements(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_log_entitlement_tipo ON public.whatsapp_log(entitlement_id, tipo);
CREATE INDEX IF NOT EXISTS idx_whatsapp_log_client_tipo_date ON public.whatsapp_log(client_id, tipo, created_at);
