import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, ChevronDown, ChevronRight } from "lucide-react";

type WebhookEvent = {
  id: string;
  source: string;
  event_id: string | null;
  event_type: string | null;
  status: string;
  error_message: string | null;
  payload: unknown;
  created_at: string;
};

export const Route = createFileRoute("/webhook-events")({
  component: WebhookEventsPage,
});

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "processed") return "default";
  if (status === "error" || status === "signature_failed") return "destructive";
  if (status === "ignored") return "secondary";
  return "outline";
}

function WebhookEventsPage() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("webhook_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) console.error(error);
    setEvents((data as WebhookEvent[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <AppShell
      title="Webhook Events"
      right={
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      }
    >
      <div className="space-y-3 max-w-5xl mx-auto p-4">
        <p className="text-sm text-muted-foreground">
          Últimos 100 eventos recebidos pelo webhook do Stripe. Use para depurar falhas de assinatura.
        </p>

        {loading && events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum evento registrado ainda.</p>
        ) : (
          events.map((ev) => {
            const isOpen = !!expanded[ev.id];
            return (
              <Card key={ev.id}>
                <CardContent className="p-4 space-y-2">
                  <button
                    type="button"
                    className="flex items-start justify-between gap-3 w-full text-left"
                    onClick={() => setExpanded((m) => ({ ...m, [ev.id]: !m[ev.id] }))}
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 mt-1 shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 mt-1 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={statusVariant(ev.status)}>{ev.status}</Badge>
                          <span className="font-mono text-sm truncate">{ev.event_type ?? "—"}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 font-mono break-all">
                          {ev.event_id ?? "(sem event_id)"}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(ev.created_at).toLocaleString("pt-BR")}
                    </span>
                  </button>

                  {ev.error_message && (
                    <pre className="text-xs bg-destructive/10 text-destructive p-2 rounded whitespace-pre-wrap break-all max-h-48 overflow-auto">
                      {ev.error_message}
                    </pre>
                  )}

                  {isOpen && (
                    <pre className="text-xs bg-muted p-2 rounded whitespace-pre-wrap break-all max-h-96 overflow-auto">
                      {JSON.stringify(ev.payload, null, 2)}
                    </pre>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
