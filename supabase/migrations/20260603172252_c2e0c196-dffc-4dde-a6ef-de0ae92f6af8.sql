CREATE TABLE public.financial_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  appointment_id uuid UNIQUE,
  client_name text NOT NULL,
  procedure text NOT NULL,
  entry_date date NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente',
  payment_method text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_entries TO authenticated;
GRANT ALL ON public.financial_entries TO service_role;

ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY own_select ON public.financial_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY own_insert ON public.financial_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY own_update ON public.financial_entries FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY own_delete ON public.financial_entries FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_financial_entries_user_date ON public.financial_entries(user_id, entry_date);