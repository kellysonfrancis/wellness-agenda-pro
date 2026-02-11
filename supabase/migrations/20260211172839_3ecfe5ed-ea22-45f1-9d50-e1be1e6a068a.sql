
-- Create helper function to get professional ID for current user
CREATE OR REPLACE FUNCTION public.get_my_professional_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT id FROM professionals WHERE user_id = auth.uid()
$$;

-- Create helper to get client IDs assigned to current professional
CREATE OR REPLACE FUNCTION public.get_my_assigned_client_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT DISTINCT a.client_id
  FROM appointments a
  WHERE a.profissional_id IN (SELECT id FROM professionals WHERE user_id = auth.uid())
$$;

-- Fix professional policies on clients
DROP POLICY IF EXISTS "Profissionais can view assigned clients" ON public.clients;
CREATE POLICY "Profissionais can view assigned clients"
ON public.clients FOR SELECT
USING (has_role(auth.uid(), 'profissional'::app_role) AND id IN (SELECT get_my_assigned_client_ids()));

-- Fix professional policies on appointments
DROP POLICY IF EXISTS "Profissionais can view own appointments" ON public.appointments;
CREATE POLICY "Profissionais can view own appointments"
ON public.appointments FOR SELECT
USING (has_role(auth.uid(), 'profissional'::app_role) AND profissional_id IN (SELECT get_my_professional_ids()));
