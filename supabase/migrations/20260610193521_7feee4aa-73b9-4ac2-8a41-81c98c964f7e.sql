
CREATE TABLE public.webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'stripe',
  event_id TEXT,
  event_type TEXT,
  status TEXT NOT NULL DEFAULT 'received',
  error_message TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX webhook_events_created_at_idx ON public.webhook_events (created_at DESC);
GRANT SELECT ON public.webhook_events TO authenticated;
GRANT ALL ON public.webhook_events TO service_role;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read webhook events"
  ON public.webhook_events FOR SELECT TO authenticated USING (true);
