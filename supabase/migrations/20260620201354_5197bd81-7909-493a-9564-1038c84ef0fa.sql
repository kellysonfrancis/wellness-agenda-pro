
-- 1. clients.user_id + backfill + update get_my_client_ids + handle_new_user
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);

UPDATE public.clients c
SET user_id = p.user_id
FROM public.profiles p
WHERE p.email = c.email AND c.user_id IS NULL;

CREATE OR REPLACE FUNCTION public.get_my_client_ids()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id FROM public.clients WHERE user_id = auth.uid()
$function$;

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
  
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'cliente') = 'cliente' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'cliente'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    INSERT INTO public.clients (nome, email, telefone, user_id)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', ''),
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'whatsapp', NEW.raw_user_meta_data->>'telefone', ''),
      NEW.id
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Trigger to block non-admins from changing their own email on profiles
CREATE OR REPLACE FUNCTION public.prevent_profile_email_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar o e-mail';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS prevent_profile_email_change_trg ON public.profiles;
CREATE TRIGGER prevent_profile_email_change_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_email_change();

-- 5. transfer_funds atomic function
CREATE OR REPLACE FUNCTION public.transfer_funds(
  p_origem uuid,
  p_destino uuid,
  p_valor numeric,
  p_descricao text
) RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_saldo numeric;
  v_tx_id uuid;
BEGIN
  IF p_origem = p_destino THEN
    RAISE EXCEPTION 'Origem e destino devem ser diferentes';
  END IF;
  IF p_valor IS NULL OR p_valor <= 0 THEN
    RAISE EXCEPTION 'Valor deve ser maior que zero';
  END IF;

  SELECT saldo_atual INTO v_saldo FROM public.bank_accounts WHERE id = p_origem FOR UPDATE;
  IF v_saldo IS NULL THEN
    RAISE EXCEPTION 'Conta de origem não encontrada';
  END IF;
  IF v_saldo < p_valor THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;

  UPDATE public.bank_accounts SET saldo_atual = saldo_atual - p_valor WHERE id = p_origem;
  UPDATE public.bank_accounts SET saldo_atual = saldo_atual + p_valor WHERE id = p_destino;

  INSERT INTO public.account_transactions (conta_origem_id, conta_destino_id, tipo, valor, descricao)
  VALUES (p_origem, p_destino, 'transferencia', p_valor, COALESCE(p_descricao, 'Transferência'))
  RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.transfer_funds(uuid, uuid, numeric, text) TO authenticated;

-- 6. sales commission recalc trigger
CREATE OR REPLACE FUNCTION public.recalc_sale_commission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_perc numeric;
BEGIN
  SELECT percentual INTO v_perc FROM public.commission_rates WHERE categoria = NEW.categoria LIMIT 1;
  IF v_perc IS NULL THEN
    v_perc := 0;
  END IF;
  NEW.percentual_comissao := v_perc;
  NEW.valor_comissao := COALESCE(NEW.valor_venda, 0) * v_perc / 100;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS recalc_sale_commission_trg ON public.sales;
CREATE TRIGGER recalc_sale_commission_trg
  BEFORE INSERT OR UPDATE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.recalc_sale_commission();

-- 7. appointments no-overlap exclusion constraint
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_no_overlap;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_no_overlap
  EXCLUDE USING gist (
    profissional_id WITH =,
    tstzrange(inicio_em, fim_em) WITH &&
  ) WHERE (status NOT IN ('cancelado','faltou'));
