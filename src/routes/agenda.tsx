import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/AppShell";
import { Button, Card, EmptyState } from "@/components/u";
import { supabase } from "@/integrations/supabase/client";
import { fmtTime } from "@/lib/format";

export const Route = createFileRoute("/agenda")({
  component: () => (<AuthGate><AgendaPage /></AuthGate>),
});

interface Appt { id: string; client_name: string; procedure: string; date: string; time: string; }

const HOURS = Array.from({ length: 13 }, (_, i) => `${(8 + i).toString().padStart(2, "0")}:00`);
const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}
function isoDate(d: Date) {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

function AgendaPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selected, setSelected] = useState<Date>(new Date());
  const [appts, setAppts] = useState<Appt[]>([]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + i); return d;
  }), [weekStart]);

  useEffect(() => {
    const from = isoDate(days[0]);
    const to = isoDate(days[6]);
    supabase.from("appointments").select("id,client_name,procedure,date,time")
      .gte("date", from).lte("date", to).order("time")
      .then(({ data }) => setAppts((data as Appt[]) || []));
  }, [days]);

  const selectedISO = isoDate(selected);
  const dayAppts = appts.filter(a => a.date === selectedISO);
  const byHour: Record<string, Appt | undefined> = {};
  for (const a of dayAppts) byHour[fmtTime(a.time)] = a;

  return (
    <AppShell title="Agenda semanal">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); }} className="p-2 rounded-md bg-surface">
          <ChevronLeft className="w-5 h-5 text-dark" />
        </button>
        <p className="text-sm font-semibold text-dark">
          {weekStart.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
        </p>
        <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); }} className="p-2 rounded-md bg-surface">
          <ChevronRight className="w-5 h-5 text-dark" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-5">
        {days.map((d, i) => {
          const active = isoDate(d) === selectedISO;
          const today = isoDate(d) === isoDate(new Date());
          return (
            <button
              key={i}
              onClick={() => setSelected(d)}
              className={`flex flex-col items-center justify-center py-2 rounded-lg ${active ? "bg-primary text-primary-foreground" : "bg-surface text-dark"}`}
            >
              <span className="text-[10px] font-medium uppercase opacity-80">{DAY_NAMES[i]}</span>
              <span className={`text-base font-bold ${today && !active ? "text-primary" : ""}`}>{d.getDate()}</span>
            </button>
          );
        })}
      </div>

      <Link to="/agendamentos/novo" search={{ date: selectedISO } as never} className="block mb-4">
        <Button full><Plus className="w-5 h-5" /> Novo agendamento</Button>
      </Link>

      <div className="space-y-2">
        {HOURS.map((h) => {
          const a = byHour[h];
          return (
            <div key={h} className="flex gap-3">
              <div className="w-14 pt-3 text-xs font-semibold text-muted-foreground">{h}</div>
              {a ? (
                <Card className="flex-1 bg-surface border-surface">
                  <p className="font-semibold text-dark">{a.client_name}</p>
                  <p className="text-xs text-muted-foreground">{a.procedure}</p>
                </Card>
              ) : (
                <Link
                  to="/agendamentos/novo"
                  search={{ date: selectedISO, time: h } as never}
                  className="flex-1 h-14 border border-dashed border-border rounded-lg flex items-center justify-center text-xs text-muted-foreground active:bg-surface"
                >
                  Disponível
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {dayAppts.length === 0 && (
        <div className="mt-4"><EmptyState title="Nenhum atendimento neste dia" /></div>
      )}
    </AppShell>
  );
}
