-- Fix overly permissive INSERT policy on whatsapp_log
DROP POLICY "Service role insert whatsapp_log" ON public.whatsapp_log;

-- Only admins and service role can insert logs (edge function uses service role)
CREATE POLICY "Admins can insert whatsapp_log"
  ON public.whatsapp_log
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));