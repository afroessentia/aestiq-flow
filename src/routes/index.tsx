import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Calendar, MessageCircle, ChevronRight } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/AppShell";
import { Button, Card, EmptyState, SectionTitle } from "@/components/u";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fmtDate, fmtTime, todayISO, waLink } from "@/lib/format";

export const Route = createFileRoute("/")({
  component: () => (
    <AuthGate>
      <Dashboard />
    </AuthGate>
  ),
});

interface Appt { id: string; client_name: string; procedure: string; time: string; notes: string | null; }
interface Ret { id: string; procedure: string; return_date: string; client_name: string; clients: { id: string; name: string; phone: string | null } | null; }

function Dashboard() {
  const { user } = useAuth();
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const metaName =
    (meta.full_name as string | undefined) ||
    (meta.name as string | undefined) ||
    "";
  const [profileName, setProfileName] = useState("");
  const rawName = metaName || profileName;
  const firstName = rawName.trim().split(/\s+/)[0] || "";
  const greeting = firstName ? `Olá, ${firstName} 👋` : "Olá 👋";
  const [appts, setAppts] = useState<Appt[]>([]);
  const [returns, setReturns] = useState<Ret[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const today = todayISO();
      const [a, r] = await Promise.all([
        supabase.from("appointments").select("id,client_name,procedure,time,notes").eq("date", today).order("time"),
        supabase
          .from("appointments")
          .select("id,procedure,return_date,client_name,clients(id,name,phone)")
          .not("return_date", "is", null)
          .lte("return_date", today)
          .order("return_date", { ascending: true })
          .limit(10),
      ]);
      setAppts((a.data as Appt[]) || []);
      setReturns((r.data as unknown as Ret[]) || []);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (metaName || !user?.id) return;
    // Fallback: try profiles table for a display name. Table may not exist — ignore errors.
    (async () => {
      try {
        const { data } = await supabase
          .from("profiles" as never)
          .select("full_name,display_name,name,first_name")
          .eq("id", user.id)
          .maybeSingle();
        const d = (data ?? {}) as Record<string, string | null>;
        const n = d.full_name || d.display_name || d.name || d.first_name || "";
        if (n) setProfileName(n);
      } catch {
        /* no-op */
      }
    })();
  }, [user?.id, metaName]);

  return (
    <AppShell title="AESTIQ">
      <div className="mb-5">
        <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p>
        <h2 className="text-2xl font-bold text-dark mt-0.5">{greeting}</h2>
      </div>

      <Link to="/agendamentos/novo" className="block mb-6">
        <Button full size="lg" variant="primary">
          <Plus className="w-5 h-5" /> Novo agendamento
        </Button>
      </Link>

      <SectionTitle action={<Link to="/agenda" className="text-xs font-semibold text-primary">Ver agenda</Link>}>
        Atendimentos de hoje
      </SectionTitle>
      {loading ? (
        <Card><p className="text-sm text-muted-foreground">Carregando...</p></Card>
      ) : appts.length === 0 ? (
        <EmptyState title="Nenhum atendimento hoje" hint="Aproveite para organizar a semana." />
      ) : (
        <div className="space-y-2">
          {appts.map((a) => (
            <Card key={a.id} className="flex items-center gap-3">
              <div className="text-center bg-surface rounded-lg px-3 py-2 min-w-[64px]">
                <p className="text-lg font-bold text-dark leading-none">{fmtTime(a.time)}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{a.client_name}</p>
                <p className="text-xs text-muted-foreground truncate">{a.procedure}</p>
              </div>
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </Card>
          ))}
        </div>
      )}

      <div className="mt-8">
        <SectionTitle action={<Link to="/retornos" className="text-xs font-semibold text-primary">Ver todos</Link>}>
          Retornos pendentes
        </SectionTitle>
        {loading ? null : returns.length === 0 ? (
          <EmptyState title="Nenhum retorno pendente" />
        ) : (
          <div className="space-y-2">
            {returns.slice(0, 4).map((r) => (
              <Card key={r.id} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/15 text-accent flex items-center justify-center font-semibold">!</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{r.clients?.name ?? r.client_name ?? "Cliente"}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.procedure} • retorno {fmtDate(r.return_date)}</p>
                </div>
                {r.clients?.phone ? (
                  <a
                    href={waLink(r.clients.phone, `Olá ${r.clients.name}! Lembrete do seu retorno para ${r.procedure} na AESTIQ.`)}
                    target="_blank" rel="noreferrer"
                    className="p-2 rounded-md bg-surface text-primary"
                    aria-label="WhatsApp"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </a>
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
