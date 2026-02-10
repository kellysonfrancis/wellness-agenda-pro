
-- Drop the overly permissive policy
DROP POLICY "Profissionais can view own sales" ON public.sales;

-- Recreate: professionals see only sales where seller_id matches their professional record
CREATE POLICY "Profissionais can view own sales"
  ON public.sales FOR SELECT
  USING (
    has_role(auth.uid(), 'profissional'::app_role)
    AND seller_id IN (
      SELECT id FROM public.professionals WHERE user_id = auth.uid()
    )
  );

-- Also let professionals insert their own sales
CREATE POLICY "Profissionais can insert own sales"
  ON public.sales FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'profissional'::app_role)
    AND seller_id IN (
      SELECT id FROM public.professionals WHERE user_id = auth.uid()
    )
  );
