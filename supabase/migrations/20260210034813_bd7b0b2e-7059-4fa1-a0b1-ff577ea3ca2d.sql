
-- Categories table for managing service categories
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  descricao TEXT,
  cor TEXT DEFAULT '#6366f1',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view categories" ON public.categories FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Seed existing categories
INSERT INTO public.categories (nome, slug, descricao, cor) VALUES
  ('Pilates', 'pilates', 'Aulas de Pilates solo, duo e grupo', '#6366f1'),
  ('Fisioterapia', 'fisioterapia', 'Sessões de fisioterapia ortopédica, RPG e mais', '#06b6d4'),
  ('Estética', 'estetica', 'Procedimentos estéticos faciais e corporais', '#f59e0b');
