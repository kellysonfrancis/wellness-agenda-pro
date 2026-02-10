-- Add new columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS data_nascimento date,
ADD COLUMN IF NOT EXISTS endereco text,
ADD COLUMN IF NOT EXISTS cpf text,
ADD COLUMN IF NOT EXISTS whatsapp text;

-- Update the handle_new_user trigger function to save extra fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email, telefone, data_nascimento, endereco, cpf, whatsapp)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'telefone',
    CASE WHEN NEW.raw_user_meta_data->>'data_nascimento' IS NOT NULL 
         THEN (NEW.raw_user_meta_data->>'data_nascimento')::date 
         ELSE NULL END,
    NEW.raw_user_meta_data->>'endereco',
    NEW.raw_user_meta_data->>'cpf',
    NEW.raw_user_meta_data->>'whatsapp'
  );
  
  -- Auto-assign 'cliente' role if specified in metadata
  IF NEW.raw_user_meta_data->>'role' = 'cliente' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'cliente'::app_role);
  END IF;
  
  RETURN NEW;
END;
$function$;