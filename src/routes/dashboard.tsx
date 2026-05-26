import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Calendar, MessageCircle, Bell, CheckCircle2, DollarSign, LogOut } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { Card, EmptyState } from "@/components/u";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fmtTime, todayISO, waLink } from "@/lib/format";
import logoAestiq from "@/assets/logo-aestiq.svg";

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <AuthGate>
      <Dashboard />
    </AuthGate>
  ),
});

interface Appt {
  id: string;
  client_name: string;
  procedure: string;
  time: string;
  status: string;
  client_id: string | null;
  deposit_amount: number | null;
}
interface ClientRow {
  id: string;
  name: string;
  phone: string | null;
}
interface RetClient extends ClientRow {
  lastDate: string | null;
  daysSince: number;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  confirmado: { label: "Confirmado", cls: "bg-primary/15 text-primary" },
  pendente: { label: "Pendente", cls: "bg-accent/15 text-accent" },
  agendado: { label: "Pendente", cls: "bg-accent/15 text-accent" },
  realizado: { label: "Realizado", cls: "bg-dark/10 text-dark" },
  "no-show": { label: "No-show", cls: "bg-destructive/10 text-destructive" },
};

function statusBadge(s: string) {
  const m = STATUS_MAP[s] || STATUS_MAP.pendente;
  return <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${m.cls}`}>{m.label}</span>;
}

function clinicPhoneToMsg(name: string) {
  return `Olá ${name}! Aqui é da clínica AESTIQ. Gostaríamos de falar com você sobre seu atendimento.`;
}

function Dashboard() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [todayAppts, setTodayAppts] = useState<Appt[]>([]);
  const [clientsMap, setClientsMap] = useState<Record<string, ClientRow>>({});
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [monthCompleted, setMonthCompleted] = useState(0);
  const [returns, setReturns] = useState<RetClient[]>([]);
  const [loading, setLoading] = useState(true);

  const initials = useMemo(() => {
    const e = user?.email ?? "";
    return e.slice(0, 2).toUpperCase() || "AE";
  }, [user]);

  const clinicName = "Clínica AESTIQ";

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const today = todayISO();
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 15);
      const cutoffISO = cutoff.toISOString().slice(0, 10);

      const [tA, mA, cl, allA] = await Promise.all([
        supabase
          .from("appointments")
          .select("id,client_name,procedure,time,status,client_id,deposit_amount")
          .eq("date", today)
          .order("time"),
        supabase
          .from("appointments")
          .select("id,status,deposit_amount")
          .gte("date", monthStart)
          .lte("date", monthEnd),
        supabase.from("clients").select("id,name,phone"),
        supabase
          .from("appointments")
          .select("client_id,date")
          .not("client_id", "is", null)
          .order("date", { ascending: false }),
      ]);

      setTodayAppts((tA.data as Appt[]) || []);

      const monthRows = mA.data || [];
      setMonthCompleted(monthRows.filter((r) => r.status === "realizado").length);
      setMonthRevenue(
        monthRows.reduce((s, r) => s + (Number(r.deposit_amount) || 0), 0)
      );

      const clients = (cl.data as ClientRow[]) || [];
      const cMap: Record<string, ClientRow> = {};
      clients.forEach((c) => (cMap[c.id] = c));
      setClientsMap(cMap);

      const lastByClient: Record<string, string> = {};
      (allA.data || []).forEach((r) => {
        const cid = r.client_id as string | null;
        if (!cid) return;
        if (!lastByClient[cid] || r.date > lastByClient[cid]) lastByClient[cid] = r.date as string;
      });

      const ret: RetClient[] = clients
        .map((c) => {
          const last = lastByClient[c.id] || null;
          const days = last
            ? Math.floor(
                (new Date(today).getTime() - new Date(last).getTime()) / 86400000
              )
            : Infinity;
          return { ...c, lastDate: last, daysSince: days };
        })
        .filter((c) => c.daysSince >= 15 && (c.lastDate === null || c.lastDate < cutoffISO))
        .sort((a, b) => b.daysSince - a.daysSince);
      setReturns(ret);

      setLoading(false);
    };
    load();
  }, [user]);

  const todayCount = todayAppts.length;
  const pendingReturnsCount = returns.length;

  return (
    <div className="min-h-dvh" style={{ backgroundColor: "#FAFAF9", color: "#1C1C1E" }}>
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="mx-auto max-w-md flex items-center justify-between px-4 h-14">
          <img src={logoAestiq} alt="AESTIQ" className="w-9 h-9 object-contain" />
          <h1 className="text-sm font-semibold tracking-tight text-dark truncate">{clinicName}</h1>
          <div className="flex items-center gap-1">
            <div
              className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold"
              aria-label="Usuária"
              title={user?.email ?? ""}
            >
              {initials}
            </div>
            <button
              onClick={async () => {
                await signOut();
                router.navigate({ to: "/login" });
              }}
              className="p-2 text-muted-foreground"
              aria-label="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md px-4 py-4 pb-12">
        {/* Summary cards */}
        <section className="grid grid-cols-2 gap-3 mb-6">
          <SummaryCard
            icon={<Calendar className="w-4 h-4" />}
            label="Atendimentos hoje"
            value={loading ? "—" : String(todayCount)}
            tone="primary"
          />
          <SummaryCard
            icon={<Bell className="w-4 h-4" />}
            label="Retornos pendentes"
            value={loading ? "—" : String(pendingReturnsCount)}
            tone="accent"
          />
          <SummaryCard
            icon={<CheckCircle2 className="w-4 h-4" />}
            label="Concluídos no mês"
            value={loading ? "—" : String(monthCompleted)}
            tone="dark"
          />
          <SummaryCard
            icon={<DollarSign className="w-4 h-4" />}
            label="Receita do mês"
            value={
              loading
                ? "—"
                : monthRevenue.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                    maximumFractionDigits: 0,
                  })
            }
            tone="primary"
          />
        </section>

        {/* Today's agenda */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Agenda de hoje
            </h2>
            <Link to="/agenda" className="text-xs font-semibold text-primary">
              Ver agenda
            </Link>
          </div>

          {loading ? (
            <Card>
              <p className="text-sm text-muted-foreground">Carregando...</p>
            </Card>
          ) : todayAppts.length === 0 ? (
            <EmptyState title="Nenhum atendimento hoje" hint="Aproveite para organizar a semana." />
          ) : (
            <div className="space-y-2">
              {todayAppts.map((a) => {
                const phone = a.client_id ? clientsMap[a.client_id]?.phone : null;
                return (
                  <Card key={a.id} className="flex items-center gap-3">
                    <div className="text-center bg-surface rounded-lg px-3 py-2 min-w-[64px]">
                      <p className="text-base font-bold text-dark leading-none">{fmtTime(a.time)}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground truncate">{a.client_name}</p>
                        {statusBadge(a.status)}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{a.procedure}</p>
                    </div>
                    {phone ? (
                      <a
                        href={waLink(phone, clinicPhoneToMsg(a.client_name))}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-md bg-surface text-primary"
                        aria-label="WhatsApp"
                      >
                        <MessageCircle className="w-5 h-5" />
                      </a>
                    ) : null}
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* Return alerts */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Alertas de retorno
            </h2>
            <Link to="/retornos" className="text-xs font-semibold text-primary">
              Ver todos
            </Link>
          </div>

          {loading ? null : returns.length === 0 ? (
            <EmptyState title="Nenhum alerta de retorno" />
          ) : (
            <div className="space-y-2">
              {returns.slice(0, 8).map((c) => (
                <Card key={c.id} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/15 text-accent flex items-center justify-center font-semibold">
                    !
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.lastDate
                        ? `Sem retorno há ${c.daysSince} dias`
                        : "Nunca compareceu"}
                    </p>
                  </div>
                  {c.phone ? (
                    <a
                      href={waLink(
                        c.phone,
                        `Olá ${c.name}! Sentimos sua falta na AESTIQ. Que tal agendarmos seu próximo atendimento?`
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-md bg-surface text-primary"
                      aria-label="WhatsApp"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </a>
                  ) : null}
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "primary" | "accent" | "dark";
}) {
  const toneCls =
    tone === "primary"
      ? "bg-primary/10 text-primary"
      : tone === "accent"
      ? "bg-accent/15 text-accent"
      : "bg-dark/10 text-dark";
  return (
    <div className="rounded-xl bg-card border border-border p-3">
      <div className={`inline-flex items-center justify-center w-7 h-7 rounded-md mb-2 ${toneCls}`}>
        {icon}
      </div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground leading-tight">
        {label}
      </p>
      <p className="text-xl font-bold text-dark mt-0.5">{value}</p>
    </div>
  );
}
