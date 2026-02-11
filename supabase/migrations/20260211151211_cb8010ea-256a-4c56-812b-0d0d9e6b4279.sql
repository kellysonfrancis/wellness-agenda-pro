
-- 1. Fix clinical_records: Professionals can only view their own records
DROP POLICY IF EXISTS "Profissionais can view clinical_records" ON public.clinical_records;
CREATE POLICY "Profissionais can view own clinical_records"
  ON public.clinical_records FOR SELECT
  USING (
    public.has_role(auth.uid(), 'profissional'::app_role)
    AND profissional_id IN (
      SELECT id FROM public.professionals WHERE user_id = auth.uid()
    )
  );

-- 2. Fix clients: Restrict by role instead of any authenticated user
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can update clients" ON public.clients;

-- Admins and recepcao can see all clients
CREATE POLICY "Admins can view all clients"
  ON public.clients FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Recepcao can view all clients"
  ON public.clients FOR SELECT
  USING (public.has_role(auth.uid(), 'recepcao'::app_role));

-- Professionals can view clients they have appointments with
CREATE POLICY "Profissionais can view assigned clients"
  ON public.clients FOR SELECT
  USING (
    public.has_role(auth.uid(), 'profissional'::app_role)
    AND id IN (
      SELECT DISTINCT a.client_id FROM public.appointments a
      WHERE a.profissional_id IN (
        SELECT p.id FROM public.professionals p WHERE p.user_id = auth.uid()
      )
    )
  );

-- Clientes can view own record (matched by email)
CREATE POLICY "Clientes can view own client record"
  ON public.clients FOR SELECT
  USING (
    public.has_role(auth.uid(), 'cliente'::app_role)
    AND email IN (SELECT p.email FROM public.profiles p WHERE p.user_id = auth.uid())
  );

-- Insert: admins, recepcao, profissionais
CREATE POLICY "Staff can insert clients"
  ON public.clients FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'recepcao'::app_role)
    OR public.has_role(auth.uid(), 'profissional'::app_role)
  );

-- Update: admins, recepcao
CREATE POLICY "Staff can update clients"
  ON public.clients FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'recepcao'::app_role)
  );

-- 3. Fix appointments: Restrict by role
DROP POLICY IF EXISTS "Authenticated users can view appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can update appointments" ON public.appointments;

-- Admins and recepcao see all
CREATE POLICY "Admins can view all appointments"
  ON public.appointments FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Recepcao can view all appointments"
  ON public.appointments FOR SELECT
  USING (public.has_role(auth.uid(), 'recepcao'::app_role));

-- Professionals see their own appointments
CREATE POLICY "Profissionais can view own appointments"
  ON public.appointments FOR SELECT
  USING (
    public.has_role(auth.uid(), 'profissional'::app_role)
    AND profissional_id IN (
      SELECT id FROM public.professionals WHERE user_id = auth.uid()
    )
  );

-- Clients see their own appointments
CREATE POLICY "Clientes can view own appointments"
  ON public.appointments FOR SELECT
  USING (
    public.has_role(auth.uid(), 'cliente'::app_role)
    AND client_id IN (
      SELECT c.id FROM public.clients c
      JOIN public.profiles p ON p.email = c.email
      WHERE p.user_id = auth.uid()
    )
  );

-- Insert: staff only
CREATE POLICY "Staff can insert appointments"
  ON public.appointments FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'recepcao'::app_role)
    OR public.has_role(auth.uid(), 'profissional'::app_role)
  );

-- Update: staff only
CREATE POLICY "Staff can update appointments"
  ON public.appointments FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'recepcao'::app_role)
    OR public.has_role(auth.uid(), 'profissional'::app_role)
  );

-- 4. Fix clinical_records: Remove recepcao access to clinical content
DROP POLICY IF EXISTS "Recepcao can view clinical_records" ON public.clinical_records;

-- 5. Create rate_limits table for public-booking rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  endpoint text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- No RLS needed - only accessed via service role in edge functions
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role (edge functions) should access this
CREATE POLICY "No direct access to rate_limits"
  ON public.rate_limits FOR ALL
  USING (false);

-- Index for fast lookups
CREATE INDEX idx_rate_limits_ip_endpoint ON public.rate_limits (ip_address, endpoint, created_at);
