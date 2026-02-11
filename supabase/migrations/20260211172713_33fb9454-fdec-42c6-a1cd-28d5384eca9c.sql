
-- Create a helper function to get client IDs for the current user (breaks RLS recursion)
CREATE OR REPLACE FUNCTION public.get_my_client_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT c.id 
  FROM clients c
  JOIN profiles p ON p.email = c.email
  WHERE p.user_id = auth.uid()
$$;

-- Drop the problematic recursive policies
DROP POLICY IF EXISTS "Clientes can view own client record" ON public.clients;
DROP POLICY IF EXISTS "Clientes can view own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clientes can view own entitlements" ON public.client_entitlements;
DROP POLICY IF EXISTS "Clientes can view own payments" ON public.payments;

-- Recreate policies using the helper function (no recursion)
CREATE POLICY "Clientes can view own client record"
ON public.clients FOR SELECT
USING (has_role(auth.uid(), 'cliente'::app_role) AND id IN (SELECT get_my_client_ids()));

CREATE POLICY "Clientes can view own appointments"
ON public.appointments FOR SELECT
USING (has_role(auth.uid(), 'cliente'::app_role) AND client_id IN (SELECT get_my_client_ids()));

CREATE POLICY "Clientes can view own entitlements"
ON public.client_entitlements FOR SELECT
USING (has_role(auth.uid(), 'cliente'::app_role) AND client_id IN (SELECT get_my_client_ids()));

CREATE POLICY "Clientes can view own payments"
ON public.payments FOR SELECT
USING (has_role(auth.uid(), 'cliente'::app_role) AND client_id IN (SELECT get_my_client_ids()));
