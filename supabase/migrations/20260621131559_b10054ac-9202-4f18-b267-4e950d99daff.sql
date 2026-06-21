
-- nfse_settings (mesma postura de payment_settings: RLS bloqueia tudo; só service role acessa)
CREATE TABLE public.nfse_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('enotas','focus')),
  mode text NOT NULL DEFAULT 'sandbox' CHECK (mode IN ('sandbox','production')),
  api_key text,
  empresa_id text,
  webhook_secret text,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider)
);
CREATE UNIQUE INDEX nfse_settings_one_active ON public.nfse_settings (is_active) WHERE is_active = true;

GRANT ALL ON public.nfse_settings TO service_role;
ALTER TABLE public.nfse_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nfse_settings_block_all" ON public.nfse_settings FOR ALL USING (false) WITH CHECK (false);

CREATE TRIGGER trg_nfse_settings_updated_at BEFORE UPDATE ON public.nfse_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- invoices (notas emitidas)
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  provider text NOT NULL CHECK (provider IN ('enotas','focus')),
  provider_invoice_id text,
  ref text,
  status text NOT NULL DEFAULT 'processando',
  valor numeric NOT NULL DEFAULT 0,
  descricao text,
  pdf_url text,
  xml_url text,
  motivo_erro text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX invoices_payment_id_idx ON public.invoices (payment_id);
CREATE INDEX invoices_client_id_idx ON public.invoices (client_id);
CREATE UNIQUE INDEX invoices_provider_invoice_uq ON public.invoices (provider, provider_invoice_id) WHERE provider_invoice_id IS NOT NULL;
CREATE UNIQUE INDEX invoices_ref_uq ON public.invoices (ref) WHERE ref IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_admin_recepcao_select" ON public.invoices FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'recepcao'));
CREATE POLICY "invoices_admin_recepcao_insert" ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'recepcao'));
CREATE POLICY "invoices_admin_recepcao_update" ON public.invoices FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'recepcao'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'recepcao'));
CREATE POLICY "invoices_admin_delete" ON public.invoices FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
