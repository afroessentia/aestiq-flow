
-- Clients
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  birth_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX clients_user_id_idx ON public.clients(user_id);
CREATE INDEX clients_name_idx ON public.clients(user_id, name);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_select" ON public.clients FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_insert" ON public.clients FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update" ON public.clients FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_delete" ON public.clients FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Anamnesis (one per client)
CREATE TABLE public.anamnesis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,
  chronic_diseases TEXT,
  medications TEXT,
  allergies TEXT,
  procedure_history TEXT,
  skin_type TEXT,
  keloid_history BOOLEAN NOT NULL DEFAULT false,
  pregnancy_breastfeeding BOOLEAN NOT NULL DEFAULT false,
  consent_lgpd BOOLEAN NOT NULL DEFAULT false,
  consent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.anamnesis TO authenticated;
GRANT ALL ON public.anamnesis TO service_role;
ALTER TABLE public.anamnesis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_select" ON public.anamnesis FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_insert" ON public.anamnesis FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update" ON public.anamnesis FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_delete" ON public.anamnesis FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Procedures
CREATE TABLE public.procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  procedure TEXT NOT NULL,
  product_lot TEXT,
  days_until_return INTEGER NOT NULL DEFAULT 15,
  return_date DATE GENERATED ALWAYS AS (date + days_until_return) STORED,
  before_photo TEXT,
  after_photo TEXT,
  notes TEXT,
  return_done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX procedures_user_idx ON public.procedures(user_id);
CREATE INDEX procedures_client_idx ON public.procedures(client_id);
CREATE INDEX procedures_return_idx ON public.procedures(user_id, return_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.procedures TO authenticated;
GRANT ALL ON public.procedures TO service_role;
ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_select" ON public.procedures FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_insert" ON public.procedures FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update" ON public.procedures FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_delete" ON public.procedures FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Appointments
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  procedure TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  notes TEXT,
  deposit_amount NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'agendado',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX appointments_user_date_idx ON public.appointments(user_id, date, time);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_select" ON public.appointments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_insert" ON public.appointments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update" ON public.appointments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_delete" ON public.appointments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Storage bucket for client photos
INSERT INTO storage.buckets (id, name, public) VALUES ('client-photos', 'client-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "auth_read_photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'client-photos');
CREATE POLICY "auth_upload_photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'client-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "auth_update_photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'client-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "auth_delete_photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'client-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "public_read_photos" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'client-photos');
