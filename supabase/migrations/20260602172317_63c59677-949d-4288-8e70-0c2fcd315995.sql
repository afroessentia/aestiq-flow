
-- Clinic settings (one per user)
CREATE TABLE public.clinic_settings (
  user_id UUID PRIMARY KEY,
  clinic_name TEXT,
  cnpj TEXT,
  address TEXT,
  phone TEXT,
  whatsapp TEXT,
  logo_url TEXT,
  pix_key_type TEXT,
  pix_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_settings TO authenticated;
GRANT ALL ON public.clinic_settings TO service_role;
ALTER TABLE public.clinic_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_select ON public.clinic_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY own_insert ON public.clinic_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY own_update ON public.clinic_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY own_delete ON public.clinic_settings FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Professional profile
CREATE TABLE public.professional_settings (
  user_id UUID PRIMARY KEY,
  full_name TEXT,
  registration_type TEXT,
  registration_number TEXT,
  specialty TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.professional_settings TO authenticated;
GRANT ALL ON public.professional_settings TO service_role;
ALTER TABLE public.professional_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_select ON public.professional_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY own_insert ON public.professional_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY own_update ON public.professional_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY own_delete ON public.professional_settings FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Procedures offered
CREATE TABLE public.clinic_procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  default_price NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_procedures TO authenticated;
GRANT ALL ON public.clinic_procedures TO service_role;
ALTER TABLE public.clinic_procedures ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_select ON public.clinic_procedures FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY own_insert ON public.clinic_procedures FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY own_update ON public.clinic_procedures FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY own_delete ON public.clinic_procedures FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Weekly working hours (one row per weekday per user)
CREATE TABLE public.work_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  weekday SMALLINT NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  enabled BOOLEAN NOT NULL DEFAULT false,
  start_time TIME,
  end_time TIME,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, weekday)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_hours TO authenticated;
GRANT ALL ON public.work_hours TO service_role;
ALTER TABLE public.work_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_select ON public.work_hours FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY own_insert ON public.work_hours FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY own_update ON public.work_hours FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY own_delete ON public.work_hours FOR DELETE TO authenticated USING (auth.uid() = user_id);
