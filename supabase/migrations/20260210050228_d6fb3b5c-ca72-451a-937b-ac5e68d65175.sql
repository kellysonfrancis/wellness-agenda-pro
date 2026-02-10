
-- Add flag to professionals table
ALTER TABLE public.professionals ADD COLUMN ve_todas_comissoes boolean NOT NULL DEFAULT false;

-- Drop existing restrictive SELECT policy for professionals
DROP POLICY IF EXISTS "Profissionais can view own sales" ON public.sales;

-- Recreate: professionals see own sales OR all if flag is true
CREATE POLICY "Profissionais can view sales"
  ON public.sales FOR SELECT
  USING (
    has_role(auth.uid(), 'profissional'::app_role)
    AND (
      seller_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.professionals
        WHERE user_id = auth.uid() AND ve_todas_comissoes = true
      )
    )
  );

-- Drop existing recepcao policy
DROP POLICY IF EXISTS "Recepcao can manage sales" ON public.sales;

-- Recepcao: own sales only, unless ve_todas_comissoes is true (via profiles linked to professionals or direct check)
-- Since recepcao users may not be in professionals table, we need a different approach.
-- Let's add the same column to a new table or use profiles. 
-- Actually, let's keep it simple: add a column to profiles for non-professional staff.
-- Better approach: create a simple permissions table or add to profiles.

-- Add ve_todas_vendas to profiles for recepcao users
ALTER TABLE public.profiles ADD COLUMN ve_todas_vendas boolean NOT NULL DEFAULT false;

-- Recepcao SELECT: own sales or all if flag is true
CREATE POLICY "Recepcao can view sales"
  ON public.sales FOR SELECT
  USING (
    has_role(auth.uid(), 'recepcao'::app_role)
    AND (
      seller_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE user_id = auth.uid() AND ve_todas_vendas = true
      )
    )
  );

-- Recepcao INSERT: only own sales
CREATE POLICY "Recepcao can insert own sales"
  ON public.sales FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'recepcao'::app_role)
    AND seller_id = auth.uid()
  );
