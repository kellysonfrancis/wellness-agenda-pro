
ALTER TABLE public.landing_config
ADD COLUMN mensagem_boas_vindas text DEFAULT NULL,
ADD COLUMN horario_funcionamento text DEFAULT NULL;
