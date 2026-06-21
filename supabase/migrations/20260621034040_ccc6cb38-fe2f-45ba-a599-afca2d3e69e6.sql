
-- evolution_photos table
CREATE TABLE public.evolution_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  record_id uuid REFERENCES public.clinical_records(id) ON DELETE SET NULL,
  tipo text NOT NULL CHECK (tipo IN ('antes','depois')),
  path text NOT NULL,
  consentimento boolean NOT NULL DEFAULT false,
  consentimento_redes boolean NOT NULL DEFAULT false,
  observacao text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX evolution_photos_client_idx ON public.evolution_photos(client_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.evolution_photos TO authenticated;
GRANT ALL ON public.evolution_photos TO service_role;

ALTER TABLE public.evolution_photos ENABLE ROW LEVEL SECURITY;

-- Admin / profissional / recepcao manage all
CREATE POLICY "Staff manage evolution photos"
ON public.evolution_photos
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'profissional'::app_role)
  OR public.has_role(auth.uid(), 'recepcao'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'profissional'::app_role)
  OR public.has_role(auth.uid(), 'recepcao'::app_role)
);

-- Client reads their own
CREATE POLICY "Clients read own evolution photos"
ON public.evolution_photos
FOR SELECT
TO authenticated
USING (client_id IN (SELECT public.get_my_client_ids()));

-- Storage policies for clinical-photos (private bucket)
-- Only staff can upload/read/delete via direct storage API; clients receive signed URLs from edge function.
CREATE POLICY "Staff read clinical-photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'clinical-photos' AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'profissional'::app_role)
    OR public.has_role(auth.uid(), 'recepcao'::app_role)
  )
);

CREATE POLICY "Staff upload clinical-photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'clinical-photos' AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'profissional'::app_role)
    OR public.has_role(auth.uid(), 'recepcao'::app_role)
  )
);

CREATE POLICY "Staff update clinical-photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'clinical-photos' AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'profissional'::app_role)
  )
);

CREATE POLICY "Staff delete clinical-photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'clinical-photos' AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'profissional'::app_role)
  )
);
