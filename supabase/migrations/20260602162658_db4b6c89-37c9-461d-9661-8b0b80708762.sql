ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS pix_status text NOT NULL DEFAULT 'aguardando',
  ADD COLUMN IF NOT EXISTS return_date date;