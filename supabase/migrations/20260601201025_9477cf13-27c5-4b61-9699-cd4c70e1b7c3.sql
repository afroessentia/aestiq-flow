ALTER TABLE public.procedures ADD COLUMN IF NOT EXISTS product TEXT;
ALTER TABLE public.facial_markers ADD COLUMN IF NOT EXISTS region TEXT NOT NULL DEFAULT 'rosto';