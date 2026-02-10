-- Allow clients to view their own entitlements
CREATE POLICY "Clientes can view own entitlements"
ON public.client_entitlements
FOR SELECT
USING (
  has_role(auth.uid(), 'cliente'::app_role)
  AND client_id IN (
    SELECT c.id FROM public.clients c
    JOIN public.profiles p ON p.email = c.email
    WHERE p.user_id = auth.uid()
  )
);

-- Allow clients to view their own payments
CREATE POLICY "Clientes can view own payments"
ON public.payments
FOR SELECT
USING (
  has_role(auth.uid(), 'cliente'::app_role)
  AND client_id IN (
    SELECT c.id FROM public.clients c
    JOIN public.profiles p ON p.email = c.email
    WHERE p.user_id = auth.uid()
  )
);