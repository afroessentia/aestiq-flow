import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, ChevronLeft, ChevronRight, MessageCircle, Save } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/AppShell";
import { Button, EmptyState, Field } from "@/components/u";
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
  total_amount: number | null;
  deposit_amount: number | null;
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

interface WH { weekday: number; enabled: boolean; start_time: string | null; end_time: string | null; }

function AgendaPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selected, setSelected] = useState<Date>(new Date());
  const [appts, setAppts] = useState<Appt[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [workHours, setWorkHours] = useState<Record<number, WH>>({});

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + i); return d;
  }), [weekStart]);

  const load = () => {
    const from = isoDate(days[0]);
    const to = isoDate(days[6]);
    supabase.from("appointments")
      .select("id,client_id,client_name,procedure,date,time,status,pix_status,return_date,total_amount,deposit_amount,clients(id,name,phone)")
      .gte("date", from).lte("date", to).order("time")
      .then(({ data }) => setAppts((data as unknown as Appt[]) || []));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [days]);

  useEffect(() => {
    supabase.from("work_hours" as never).select("weekday,enabled,start_time,end_time").then(({ data }) => {
      const map: Record<number, WH> = {};
      ((data as unknown as WH[]) ?? []).forEach((r) => { map[r.weekday] = r; });
      setWorkHours(map);
    });
  }, []);

  const selectedISO = isoDate(selected);
  const dayAppts = appts.filter(a => a.date === selectedISO);
  const byHour: Record<string, Appt | undefined> = {};
  for (const a of dayAppts) byHour[fmtTime(a.time)] = a;

  const wh = workHours[selected.getDay()];
  const hoursList = useMemo(() => {
    if (!wh || !wh.enabled || !wh.start_time || !wh.end_time) {
      // If no schedule configured for any day, fall back to default; otherwise empty.
      return Object.keys(workHours).length === 0 ? HOURS : [];
    }
    const s = parseInt(wh.start_time.slice(0, 2), 10);
    const e = parseInt(wh.end_time.slice(0, 2), 10);
    const out: string[] = [];
    for (let h = s; h < e; h++) out.push(`${h.toString().padStart(2, "0")}:00`);
    return out;
  }, [wh, workHours]);

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
              className="flex flex-col items-center justify-center py-2 rounded-lg border"
              style={
                active
                  ? { backgroundColor: "#0F2C26", color: "#C39A54", borderColor: "#0F2C26" }
                  : { backgroundColor: "#FFFFFF", color: "#1A1A1A", borderColor: "#E8E3DB" }
              }
            >
              <span className="text-[10px] font-medium uppercase opacity-80">{DAY_NAMES[i]}</span>
              <span className="text-base font-bold" style={today && !active ? { color: "#C39A54" } : undefined}>{d.getDate()}</span>
            </button>
          );
        })}
      </div>

      <Link to="/agendamentos/novo" search={{ date: selectedISO } as never} className="block mb-4">
        <Button full><Plus className="w-5 h-5" /> Novo agendamento</Button>
      </Link>

      <div className="space-y-2">
        {hoursList.map((h) => {
          const a = byHour[h];
          return (
            <div key={h} className="flex gap-3">
              <div className="w-14 pt-3 text-xs font-semibold text-muted-foreground">{h}</div>
              {a ? (
                <button
                  type="button"
                  onClick={() => setOpenId(a.id)}
                  className="flex-1 text-left rounded-lg p-3 transition-colors"
                  style={{ backgroundColor: "#EBF2F0", borderLeft: "3px solid #0F2C26" }}
                >
                  <p className="font-semibold" style={{ color: "#0F2C26" }}>{a.client_name}</p>
                  <p className="text-xs text-muted-foreground">{a.procedure}</p>
                </button>
              ) : (
                <Link
                  to="/agendamentos/novo"
                  search={{ date: selectedISO, time: h } as never}
                  className="flex-1 h-14 md:h-12 border border-dashed rounded-lg flex items-center justify-center text-xs text-muted-foreground"
                  style={{ borderColor: "#E8E3DB" }}
                >
                  Disponível
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {hoursList.length === 0 && dayAppts.length === 0 && (
        <div className="mt-4"><EmptyState title="Dia sem expediente" hint="Configure os horários em Configurações." /></div>
      )}
      {hoursList.length > 0 && dayAppts.length === 0 && (
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
  const total = Number(appt.total_amount ?? 0);
  const deposit = Number(appt.deposit_amount ?? 0);
  const balance = Math.max(0, total - deposit);
  const BRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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

  const markBalancePaid = async () => {
    setBusy(true);
    const { error: e1 } = await supabase.from("appointments").update({ pix_status: "pago" }).eq("id", appt.id);
    // upsert financial entry
    const { data: ex } = await supabase.from("financial_entries").select("id").eq("appointment_id", appt.id).maybeSingle();
    if (ex?.id) {
      await supabase.from("financial_entries").update({
        status: "pago_totalmente",
        amount: total > 0 ? total : deposit,
        updated_at: new Date().toISOString(),
      }).eq("id", ex.id);
    } else {
      const { data: u } = await supabase.auth.getUser();
      await supabase.from("financial_entries").insert({
        user_id: u.user?.id,
        appointment_id: appt.id,
        client_name: appt.client_name,
        procedure: appt.procedure,
        entry_date: appt.date,
        amount: total > 0 ? total : deposit,
        status: "pago_totalmente",
      } as never);
    }
    setBusy(false);
    if (e1) return toast.error(e1.message);
    setPixStatus("pago");
    toast.success("Saldo marcado como pago");
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

          <div className="rounded-lg border border-border p-3 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">Valor total</p>
              <p className="text-sm font-semibold text-dark">{BRL(total)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">Sinal pago</p>
              <p className="text-sm font-semibold text-dark">{BRL(deposit)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">Saldo restante</p>
              <p className={`text-sm font-semibold ${balance > 0 ? "text-accent" : "text-primary"}`}>{BRL(balance)}</p>
            </div>
          </div>

          {balance > 0 && pixStatus !== "pago" && (
            <Button variant="secondary" full onClick={markBalancePaid} disabled={busy}>
              Marcar saldo como pago
            </Button>
          )}

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
