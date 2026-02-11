
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
  
  -- Auto-assign 'cliente' role for regular signups and OAuth (Google, etc.)
  -- Only skip role assignment if the user explicitly chose 'funcionario_pendente'
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'cliente') = 'cliente' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'cliente'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;
