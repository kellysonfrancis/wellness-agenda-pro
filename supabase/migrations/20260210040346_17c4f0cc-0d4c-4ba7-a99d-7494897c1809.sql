
-- Create enums
CREATE TYPE public.expense_type AS ENUM ('fixa', 'variavel');
CREATE TYPE public.expense_category AS ENUM ('aluguel', 'salarios', 'materiais', 'equipamentos', 'marketing', 'manutencao', 'impostos', 'outros');
CREATE TYPE public.bank_account_type AS ENUM ('corrente', 'caixa', 'digital', 'maquininha');
CREATE TYPE public.payment_status AS ENUM ('pendente', 'pago', 'parcial', 'estornado', 'isento');
CREATE TYPE public.payment_method AS ENUM ('pix', 'cartao', 'dinheiro', 'transferencia', 'outro');
CREATE TYPE public.transaction_type AS ENUM ('entrada', 'saida', 'transferencia');

-- Bank accounts
CREATE TABLE public.bank_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo public.bank_account_type NOT NULL,
  banco TEXT,
  saldo_inicial NUMERIC NOT NULL DEFAULT 0,
  saldo_atual NUMERIC NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage bank_accounts"
  ON public.bank_accounts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Recepcao can view bank_accounts"
  ON public.bank_accounts FOR SELECT
  USING (has_role(auth.uid(), 'recepcao'::app_role));

CREATE TRIGGER update_bank_accounts_updated_at
  BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Expenses
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo public.expense_type NOT NULL,
  categoria public.expense_category NOT NULL DEFAULT 'outros',
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  data_vencimento DATE NOT NULL,
  pago BOOLEAN NOT NULL DEFAULT false,
  pago_em TIMESTAMPTZ,
  conta_origem_id UUID REFERENCES public.bank_accounts(id),
  recorrente BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage expenses"
  ON public.expenses FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Recepcao can view expenses"
  ON public.expenses FOR SELECT
  USING (has_role(auth.uid(), 'recepcao'::app_role));

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Payments
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) NOT NULL,
  appointment_id UUID REFERENCES public.appointments(id),
  conta_destino_id UUID REFERENCES public.bank_accounts(id),
  valor_total NUMERIC NOT NULL DEFAULT 0,
  valor_pago NUMERIC NOT NULL DEFAULT 0,
  status public.payment_status NOT NULL DEFAULT 'pendente',
  metodo public.payment_method NOT NULL DEFAULT 'pix',
  pago_em TIMESTAMPTZ,
  referencia TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payments"
  ON public.payments FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Recepcao can manage payments"
  ON public.payments FOR ALL
  USING (has_role(auth.uid(), 'recepcao'::app_role));

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Account transactions
CREATE TABLE public.account_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conta_origem_id UUID REFERENCES public.bank_accounts(id),
  conta_destino_id UUID REFERENCES public.bank_accounts(id),
  tipo public.transaction_type NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  descricao TEXT NOT NULL,
  referencia TEXT,
  payment_id UUID REFERENCES public.payments(id),
  expense_id UUID REFERENCES public.expenses(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.account_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage account_transactions"
  ON public.account_transactions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Recepcao can view account_transactions"
  ON public.account_transactions FOR SELECT
  USING (has_role(auth.uid(), 'recepcao'::app_role));

-- Seed bank accounts
INSERT INTO public.bank_accounts (nome, tipo, banco, saldo_inicial, saldo_atual) VALUES
  ('Itaú Conta Corrente', 'corrente', 'Itaú', 15000, 9400),
  ('Nubank PJ', 'digital', 'Nubank', 5000, 5950),
  ('Maquininha Stone', 'maquininha', 'Stone', 0, 480),
  ('Caixa da Recepção', 'caixa', NULL, 500, 350);
