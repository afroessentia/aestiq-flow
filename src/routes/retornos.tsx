import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageCircle, Check } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/AppShell";
import { Button, Card, EmptyState } from "@/components/u";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate, todayISO, waLink } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/retornos")({
  component: () => (<AuthGate><RetornosPage /></AuthGate>),
});

interface ApptRow {
  id: string;
  client_id: string | null;
  client_name: string;
  procedure: string;
  date: string;
  return_date: string | null;
  status: string;
  clients: { id: string; name: string; phone: string | null } | null;
}
interface Pending {
  appt_id: string;
  client_id: string | null;
  client_name: string;
  client_phone: string | null;
  procedure: string;
  return_date: string;
}

function RetornosPage() {
  const [items, setItems] = useState<Pending[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const today = todayISO();
    const in7 = new Date();
    in7.setDate(in7.getDate() + 7);
    const horizon = in7.toISOString().slice(0, 10);
    const { data } = await supabase
      .from("appointments")
      .select("id,client_id,client_name,procedure,date,return_date,status,clients(id,name,phone)")
      .not("return_date", "is", null)
      .lte("return_date", horizon)
      .order("return_date", { ascending: true });
    const rows = ((data as unknown as ApptRow[]) || []);

    // Build a map: client_id -> latest appointment date
    const latestByClient = new Map<string, string>();
    for (const r of rows) {
      if (!r.client_id) continue;
      const cur = latestByClient.get(r.client_id);
      if (!cur || r.date > cur) latestByClient.set(r.client_id, r.date);
    }
    // Need to also consider appointments that aren't in this filtered set: query all future appts per client.
    const clientIds = Array.from(new Set(rows.map(r => r.client_id).filter(Boolean) as string[]));
    const futureByClient = new Map<string, string>();
    if (clientIds.length > 0) {
      const { data: f } = await supabase
        .from("appointments")
        .select("client_id,date")
        .in("client_id", clientIds);
      for (const r of (f ?? []) as { client_id: string; date: string }[]) {
        if (!r.client_id) continue;
        const cur = futureByClient.get(r.client_id);
        if (!cur || r.date > cur) futureByClient.set(r.client_id, r.date);
      }
    }

    const pending: Pending[] = [];
    const seen = new Set<string>();
    for (const r of rows) {
      if (!r.return_date) continue;
      // Skip if client has any newer appointment after the return date
      if (r.client_id) {
        const latest = futureByClient.get(r.client_id) ?? r.date;
        if (latest > r.return_date) continue;
        // dedupe per client — keep earliest overdue
        if (seen.has(r.client_id)) continue;
        seen.add(r.client_id);
      }
      pending.push({
        appt_id: r.id,
        client_id: r.client_id,
        client_name: r.clients?.name ?? r.client_name,
        client_phone: r.clients?.phone ?? null,
        procedure: r.procedure,
        return_date: r.return_date,
      });
    }
    setItems(pending);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const markDone = async (apptId: string) => {
    const { error } = await supabase.from("appointments").update({ return_date: null }).eq("id", apptId);
    if (error) return toast.error(error.message);
    toast.success("Retorno concluído");
    load();
  };

  const today = todayISO();

  return (
    <AppShell title="Retornos">
      {loading ? null : items.length === 0 ? (
        <EmptyState title="Sem retornos pendentes" hint="Tudo em dia por aqui." />
      ) : (
        <div className="space-y-2">
          {items.map((r) => {
            const overdue = r.return_date < today;
            return (
              <Card key={r.appt_id}>
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 mt-2 rounded-full ${overdue ? "bg-accent" : "bg-primary"}`} />
                  <div className="flex-1 min-w-0">
                    {r.client_id ? (
                      <Link to="/clientes/$id" params={{ id: r.client_id }} className="font-semibold text-foreground truncate block">
                        {r.client_name}
                      </Link>
                    ) : (
                      <p className="font-semibold text-foreground truncate">{r.client_name}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {r.procedure} • {overdue ? "Atrasado desde" : "Retorno em"} {fmtDate(r.return_date)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  {r.client_phone && (
                    <a
                      href={waLink(r.client_phone, `Olá ${r.client_name}! Tudo bem? Passando para lembrar do seu retorno para ${r.procedure} na AESTIQ. Posso confirmar um horário?`)}
                      target="_blank" rel="noreferrer"
                      className="flex-1 h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm inline-flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4" /> WhatsApp
                    </a>
                  )}
                  <Button type="button" variant="outline" size="md" onClick={() => markDone(r.appt_id)}>
                    <Check className="w-4 h-4" /> Concluir
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
