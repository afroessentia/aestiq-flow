-- Add LGPD consent to clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS lgpd_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lgpd_consent_at timestamptz;

-- Add session detail fields to procedures
ALTER TABLE public.procedures
  ADD COLUMN IF NOT EXISTS units integer,
  ADD COLUMN IF NOT EXISTS expiration_date date,
  ADD COLUMN IF NOT EXISTS application_zone text;

-- Facial markers table
CREATE TABLE IF NOT EXISTS public.facial_markers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid NOT NULL,
  number integer NOT NULL,
  x numeric NOT NULL,
  y numeric NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.facial_markers TO authenticated;
GRANT ALL ON public.facial_markers TO service_role;

ALTER TABLE public.facial_markers ENABLE ROW LEVEL SECURITY;

CREATE POLICY own_select ON public.facial_markers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY own_insert ON public.facial_markers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY own_update ON public.facial_markers FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY own_delete ON public.facial_markers FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_facial_markers_client ON public.facial_markers(client_id);