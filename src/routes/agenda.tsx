import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, ChevronLeft, ChevronRight, MessageCircle, Save } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/AppShell";
import { Button, Card, EmptyState, Field } from "@/components/u";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate, fmtTime, waLink } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/agenda")({
  component: () => (<AuthGate><AgendaPage /></AuthGate>),
});

type ApptStatus = "agendado" | "confirmado" | "realizado" | "noshow";
type PixStatus = "aguardando" | "pago";

interface Appt {
  id: string;
  client_id: string | null;
  client_name: string;
  procedure: string;
  date: string;
  time: string;
  status: ApptStatus;
  pix_status: PixStatus;
  return_date: string | null;
  clients: { id: string; name: string; phone: string | null } | null;
}

const HOURS = Array.from({ length: 13 }, (_, i) => `${(8 + i).toString().padStart(2, "0")}:00`);
const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const STATUS_LABELS: Record<ApptStatus, string> = {
  agendado: "Pendente",
  confirmado: "Confirmado",
  realizado: "Realizado",
  noshow: "No-show",
};

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
  const [openId, setOpenId] = useState<string | null>(null);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + i); return d;
  }), [weekStart]);

  const load = () => {
    const from = isoDate(days[0]);
    const to = isoDate(days[6]);
    supabase.from("appointments")
      .select("id,client_id,client_name,procedure,date,time,status,pix_status,return_date,clients(id,name,phone)")
      .gte("date", from).lte("date", to).order("time")
      .then(({ data }) => setAppts((data as unknown as Appt[]) || []));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [days]);

  const selectedISO = isoDate(selected);
  const dayAppts = appts.filter(a => a.date === selectedISO);
  const byHour: Record<string, Appt | undefined> = {};
  for (const a of dayAppts) byHour[fmtTime(a.time)] = a;

  const openAppt = appts.find(a => a.id === openId) ?? null;

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
                <button
                  type="button"
                  onClick={() => setOpenId(a.id)}
                  className="flex-1 text-left"
                >
                  <Card className="bg-surface border-surface active:bg-surface/80">
                    <p className="font-semibold text-dark">{a.client_name}</p>
                    <p className="text-xs text-muted-foreground">{a.procedure}</p>
                  </Card>
                </button>
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

      <ApptDialog
        appt={openAppt}
        onClose={() => setOpenId(null)}
        onSaved={() => { setOpenId(null); load(); }}
      />
    </AppShell>
  );
}

function ApptDialog({ appt, onClose, onSaved }: { appt: Appt | null; onClose: () => void; onSaved: () => void }) {
  const [status, setStatus] = useState<ApptStatus>("agendado");
  const [pixStatus, setPixStatus] = useState<PixStatus>("aguardando");
  const [returnDate, setReturnDate] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!appt) return;
    setStatus((appt.status as ApptStatus) || "agendado");
    setPixStatus((appt.pix_status as PixStatus) || "aguardando");
    setReturnDate(appt.return_date ?? "");
  }, [appt]);

  if (!appt) return null;

  const phone = appt.clients?.phone ?? null;

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("appointments").update({
      status,
      pix_status: pixStatus,
      return_date: returnDate || null,
    }).eq("id", appt.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Agendamento atualizado");
    onSaved();
  };

  return (
    <Dialog open={!!appt} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do agendamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg bg-surface p-3 space-y-1">
            <p className="text-sm"><span className="text-muted-foreground">Cliente:</span> <span className="font-semibold text-dark">{appt.client_name}</span></p>
            <p className="text-sm"><span className="text-muted-foreground">Procedimento:</span> <span className="font-semibold text-dark">{appt.procedure}</span></p>
            <p className="text-sm"><span className="text-muted-foreground">Data:</span> <span className="font-semibold text-dark">{fmtDate(appt.date)} às {fmtTime(appt.time)}</span></p>
          </div>

          <Field label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value as ApptStatus)}
              className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm">
              {(Object.keys(STATUS_LABELS) as ApptStatus[]).map((k) => (
                <option key={k} value={k}>{STATUS_LABELS[k]}</option>
              ))}
            </select>
          </Field>

          <Field label="Status do Pix">
            <select value={pixStatus} onChange={(e) => setPixStatus(e.target.value as PixStatus)}
              className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm">
              <option value="aguardando">Aguardando pagamento</option>
              <option value="pago">Pago</option>
            </select>
          </Field>

          <Field label="Data de retorno" hint="Define quando o cliente aparecerá na tela de Retornos.">
            <input
              type="date"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              className="h-12 w-full rounded-lg border border-border bg-card px-4 text-base text-foreground focus:outline-none focus:border-primary"
            />
          </Field>

          {phone && (
            <a
              href={waLink(phone, `Olá ${appt.client_name}!`)}
              target="_blank" rel="noreferrer"
              className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm inline-flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" /> Abrir WhatsApp
            </a>
          )}

          <Button full onClick={save} disabled={busy}>
            <Save className="w-4 h-4" /> {busy ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
