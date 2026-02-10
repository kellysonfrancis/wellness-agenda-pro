
CREATE TABLE public.landing_testimonials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  depoimento text NOT NULL,
  avaliacao integer NOT NULL DEFAULT 5 CHECK (avaliacao >= 1 AND avaliacao <= 5),
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.landing_testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active testimonials"
ON public.landing_testimonials FOR SELECT
USING (ativo = true);

CREATE POLICY "Admins can manage testimonials"
ON public.landing_testimonials FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));
