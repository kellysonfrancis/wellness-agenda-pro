
-- Table: professional schedules (working hours per professional per day of week)
CREATE TABLE public.professional_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  dia_semana integer NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  hora_inicio integer NOT NULL DEFAULT 8,
  hora_fim integer NOT NULL DEFAULT 18,
  pausas jsonb NOT NULL DEFAULT '[]'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (professional_id, dia_semana)
);

ALTER TABLE public.professional_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage professional_schedules"
ON public.professional_schedules FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view professional_schedules"
ON public.professional_schedules FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_professional_schedules_updated_at
BEFORE UPDATE ON public.professional_schedules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Table: professional_services (link professionals to specific services)
CREATE TABLE public.professional_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (professional_id, service_id)
);

ALTER TABLE public.professional_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage professional_services"
ON public.professional_services FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view professional_services"
ON public.professional_services FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Seed professional_services from existing professionals' especialidades
-- This auto-links professionals to all services in their specialty categories
INSERT INTO public.professional_services (professional_id, service_id)
SELECT p.id, s.id
FROM professionals p
CROSS JOIN LATERAL unnest(p.especialidades) AS esp(cat)
JOIN services s ON s.categoria = esp.cat AND s.ativo = true
WHERE p.ativo = true
ON CONFLICT DO NOTHING;
