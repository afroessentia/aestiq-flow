import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Wallet } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/AppShell";
import { Card, EmptyState, SectionTitle } from "@/components/u";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/financeiro")({
  component: () => (<AuthGate><FinanceiroPage /></AuthGate>),
});

type Status = "pago" | "pendente";
type Method = "" | "pix" | "dinheiro" | "cartao" | "outro";

interface Appt {
  id: string;
  client_name: string;
  procedure: string;
  date: string;
  deposit_amount: number | null;
  total_amount: number | null;
}


interface Entry {
  id: string;
  appointment_id: string | null;
  client_name: string;
  procedure: string;
  entry_date: string;
  amount: number;
  status: Status;
  payment_method: Method | string | null;
}

interface Row {
  key: string;
  entry: Entry | null;
  appt: Appt | null;
  client_name: string;
  procedure: string;
  date: string;
  amount: number;
  status: Status;
  payment_method: Method;
}

const METHOD_LABEL: Record<Exclude<Method, "">, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
  outro: "Outro",
};

function monthBounds(y: number, m: number) {
  const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const last = new Date(y, m + 1, 0).getDate();
  const end = `${y}-${String(m + 1).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { start, end };
}

const BRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function FinanceiroPage() {
  const { user } = useAuth();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const { start, end } = useMemo(() => monthBounds(year, month), [year, month]);

  const load = async () => {
    setLoading(true);
    const [a, e] = await Promise.all([
      supabase
        .from("appointments")
        .select("id,client_name,procedure,date,deposit_amount,total_amount")
        .eq("status", "realizado")
        .gte("date", start)
        .lte("date", end),
      supabase
        .from("financial_entries")
        .select("*")
        .gte("entry_date", start)
        .lte("entry_date", end),
    ]);
    const appts = (a.data as Appt[]) || [];
    const entries = (e.data as Entry[]) || [];
    const byAppt: Record<string, Entry> = {};
    entries.forEach((en) => { if (en.appointment_id) byAppt[en.appointment_id] = en; });

    const merged: Row[] = appts.map((ap) => {
      const ex = byAppt[ap.id];
      return {
        key: ap.id,
        appt: ap,
        entry: ex ?? null,
        client_name: ex?.client_name ?? ap.client_name,
        procedure: ex?.procedure ?? ap.procedure,
        date: ex?.entry_date ?? ap.date,
        amount: ex ? Number(ex.amount) : Number(ap.total_amount ?? ap.deposit_amount ?? 0),
        status: (ex?.status as Status) ?? "pendente",
        payment_method: (ex?.payment_method as Method) ?? "",
      };
    });


    // Include stand-alone entries (no appointment match in this month) too
    const apptIds = new Set(appts.map((x) => x.id));
    entries.forEach((en) => {
      if (en.appointment_id && apptIds.has(en.appointment_id)) return;
      merged.push({
        key: en.id,
        appt: null,
        entry: en,
        client_name: en.client_name,
        procedure: en.procedure,
        date: en.entry_date,
        amount: Number(en.amount),
        status: en.status,
        payment_method: (en.payment_method as Method) ?? "",
      });
    });

    merged.sort((x, y) => (x.date < y.date ? 1 : -1));
    setRows(merged);
    setLoading(false);
  };

  useEffect(() => { if (user) load(); /* eslint-disable-next-line */ }, [user, start, end]);

  const upsert = async (row: Row, patch: Partial<Pick<Row, "status" | "payment_method">>) => {
    if (!user) return;
    const next: Row = { ...row, ...patch };
    setRows((rs) => rs.map((r) => (r.key === row.key ? next : r)));

    if (row.entry) {
      const { error } = await supabase
        .from("financial_entries")
        .update({
          status: next.status,
          payment_method: next.payment_method || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.entry.id);
      if (error) toast.error("Erro ao atualizar"); else toast.success("Atualizado");
    } else {
      const { data, error } = await supabase
        .from("financial_entries")
        .insert({
          user_id: user.id,
          appointment_id: row.appt?.id ?? null,
          client_name: next.client_name,
          procedure: next.procedure,
          entry_date: next.date,
          amount: next.amount,
          status: next.status,
          payment_method: next.payment_method || null,
        })
        .select()
        .single();
      if (error) { toast.error("Erro ao salvar"); return; }
      setRows((rs) => rs.map((r) => (r.key === row.key ? { ...next, entry: data as Entry } : r)));
      toast.success("Salvo");
    }
  };

  const totalRecebido = rows.filter((r) => r.status === "pago").reduce((s, r) => s + r.amount, 0);
  const totalPendente = rows.filter((r) => r.status === "pendente").reduce((s, r) => s + r.amount, 0);
  const totalAtend = rows.length;

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(year - 1); } else setMonth(month - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(year + 1); } else setMonth(month + 1); };

  const monthLabel = new Date(year, month, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <AppShell title="Financeiro">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-2 rounded-md bg-surface" aria-label="Mês anterior">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <p className="text-sm font-semibold capitalize">{monthLabel}</p>
        <button onClick={nextMonth} className="p-2 rounded-md bg-surface" aria-label="Próximo mês">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <section className="grid grid-cols-3 gap-2 mb-6">
        <SummaryCard label="Recebido" value={BRL(totalRecebido)} tone="primary" />
        <SummaryCard label="Pendente" value={BRL(totalPendente)} tone="accent" />
        <SummaryCard label="Atendimentos" value={String(totalAtend)} tone="dark" />
      </section>

      <SectionTitle>Lançamentos</SectionTitle>
      {loading ? (
        <Card><p className="text-sm text-muted-foreground">Carregando...</p></Card>
      ) : rows.length === 0 ? (
        <EmptyState title="Nenhum lançamento no mês" hint="Marque atendimentos como Realizado na Agenda." />
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.key} className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{r.client_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.procedure} • {fmtDate(r.date)}</p>
                </div>
                <p className="font-semibold whitespace-nowrap">{BRL(r.amount)}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={r.status}
                  onChange={(e) => upsert(r, { status: e.target.value as Status })}
                  className="h-10 rounded-lg border border-border bg-card px-3 text-sm"
                >
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                </select>
                <select
                  value={r.payment_method}
                  onChange={(e) => upsert(r, { payment_method: e.target.value as Method })}
                  className="h-10 rounded-lg border border-border bg-card px-3 text-sm"
                >
                  <option value="">Forma de pagamento</option>
                  {(Object.keys(METHOD_LABEL) as Array<keyof typeof METHOD_LABEL>).map((k) => (
                    <option key={k} value={k}>{METHOD_LABEL[k]}</option>
                  ))}
                </select>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone: "primary" | "accent" | "dark" }) {
  const toneCls =
    tone === "primary" ? "text-primary" : tone === "accent" ? "text-accent" : "text-dark";
  return (
    <div className="rounded-xl bg-card border border-border p-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground leading-tight">{label}</p>
      <p className={`text-base font-bold mt-1 ${toneCls}`}>{value}</p>
    </div>
  );
}
