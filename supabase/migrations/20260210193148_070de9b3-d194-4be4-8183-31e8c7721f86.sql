
CREATE TABLE public.category_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria TEXT NOT NULL UNIQUE,
  dias_semana INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5,6}',
  hora_inicio INTEGER NOT NULL DEFAULT 5,
  hora_fim INTEGER NOT NULL DEFAULT 21,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.category_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read category_schedules"
ON public.category_schedules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage category_schedules"
ON public.category_schedules FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_category_schedules_updated_at
BEFORE UPDATE ON public.category_schedules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Seed defaults for existing categories
INSERT INTO public.category_schedules (categoria, dias_semana, hora_inicio, hora_fim) VALUES
  ('pilates', '{1,2,3,4,5,6}', 6, 20),
  ('fisioterapia', '{1,2,3,4,5,6}', 7, 19),
  ('estetica', '{1,2,3,4,5}', 8, 18);
