
-- Inventory items
CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  unidade text NOT NULL DEFAULT 'un',
  quantidade numeric NOT NULL DEFAULT 0,
  estoque_minimo numeric NOT NULL DEFAULT 0,
  custo_unitario numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO authenticated;
GRANT ALL ON public.inventory_items TO service_role;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage inventory_items" ON public.inventory_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'recepcao'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'recepcao'));
CREATE TRIGGER trg_inventory_items_updated BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Service consumption
CREATE TABLE public.service_consumption (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantidade numeric NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(service_id, item_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_consumption TO authenticated;
GRANT ALL ON public.service_consumption TO service_role;
ALTER TABLE public.service_consumption ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage service_consumption" ON public.service_consumption
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Inventory movements
CREATE TABLE public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('entrada','saida','ajuste')),
  quantidade numeric NOT NULL,
  motivo text,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_movements TO authenticated;
GRANT ALL ON public.inventory_movements TO service_role;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage inventory_movements" ON public.inventory_movements
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'recepcao'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'recepcao'));

-- Index to enforce idempotency for automatic deduction (one 'saida' per appointment+item)
CREATE UNIQUE INDEX inventory_movements_appt_item_unique
  ON public.inventory_movements(appointment_id, item_id)
  WHERE appointment_id IS NOT NULL AND tipo = 'saida';

-- Trigger: when appointment becomes 'concluido', deduct stock for each consumption rule
CREATE OR REPLACE FUNCTION public.process_inventory_on_appointment_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  IF NEW.status = 'concluido' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'concluido') THEN
    FOR r IN
      SELECT sc.item_id, sc.quantidade
      FROM public.service_consumption sc
      WHERE sc.service_id = NEW.service_id
    LOOP
      BEGIN
        INSERT INTO public.inventory_movements(item_id, tipo, quantidade, motivo, appointment_id)
        VALUES (r.item_id, 'saida', r.quantidade, 'Baixa automática por atendimento', NEW.id);
        UPDATE public.inventory_items
          SET quantidade = quantidade - r.quantidade
          WHERE id = r.item_id;
      EXCEPTION WHEN unique_violation THEN
        -- already deducted for this appointment+item; skip
        NULL;
      END;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_appointment_inventory_baixa
  AFTER INSERT OR UPDATE OF status ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.process_inventory_on_appointment_complete();
