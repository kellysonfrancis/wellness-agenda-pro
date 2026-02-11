
-- Add explicit DENY policy for anonymous users on clients table
CREATE POLICY "Deny anonymous access to clients"
ON public.clients AS RESTRICTIVE FOR ALL
TO anon
USING (false);
