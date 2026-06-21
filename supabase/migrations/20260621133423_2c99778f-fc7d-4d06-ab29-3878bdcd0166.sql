
-- 1. commission_rates: restrict SELECT to admin + profissional only (was any authenticated)
DROP POLICY IF EXISTS "Authenticated can view commission_rates" ON public.commission_rates;
CREATE POLICY "Staff can view commission_rates" ON public.commission_rates
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'profissional'::app_role));

-- 2. Defense-in-depth restrictive policies blocking anon
CREATE POLICY "Block anon from clinical_records" ON public.clinical_records
  AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "Block anon from whatsapp_lines" ON public.whatsapp_lines
  AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "Block anon from inventory_items" ON public.inventory_items
  AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "Block anon from inventory_movements" ON public.inventory_movements
  AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

-- 3. Block clientes explicitly from inventory tables (defense in depth)
CREATE POLICY "Block clientes from inventory_items" ON public.inventory_items
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (NOT public.has_role(auth.uid(), 'cliente'::app_role))
  WITH CHECK (NOT public.has_role(auth.uid(), 'cliente'::app_role));

CREATE POLICY "Block clientes from inventory_movements" ON public.inventory_movements
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (NOT public.has_role(auth.uid(), 'cliente'::app_role))
  WITH CHECK (NOT public.has_role(auth.uid(), 'cliente'::app_role));
