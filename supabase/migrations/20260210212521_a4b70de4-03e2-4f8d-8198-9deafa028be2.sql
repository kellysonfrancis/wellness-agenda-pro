
-- Add pausas (breaks) column to category_schedules as JSONB array [{inicio: 12, fim: 13}]
ALTER TABLE public.category_schedules
ADD COLUMN pausas jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Create holidays table
CREATE TABLE public.holidays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data DATE NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  recorrente BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add unique constraint on date
ALTER TABLE public.holidays ADD CONSTRAINT holidays_data_unique UNIQUE (data);

-- Enable RLS
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- Admins can manage holidays
CREATE POLICY "Admins can manage holidays"
ON public.holidays
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can view holidays
CREATE POLICY "Authenticated users can view holidays"
ON public.holidays
FOR SELECT
USING (auth.uid() IS NOT NULL);
