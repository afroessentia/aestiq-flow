import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Copy } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { Button, Card, Field, Input, Textarea } from "@/components/u";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { buildPixPayload, qrUrl } from "@/lib/pix";
import { todayISO } from "@/lib/format";

interface Search { date?: string; time?: string }

export const Route = createFileRoute("/agendamentos/novo")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    date: typeof s.date === "string" ? s.date : undefined,
    time: typeof s.time === "string" ? s.time : undefined,
  }),
  component: () => (<AuthGate><NewAppt /></AuthGate>),
});

const PIX_KEY = "contato@aestiq.com.br";
const MERCHANT = "AESTIQ ESTETICA";
const CITY = "SAO PAULO";

function NewAppt() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const search = Route.useSearch();
  const [client_name, setName] = useState("");
  const [procedure, setProc] = useState("");
  const [date, setDate] = useState(search.date ?? todayISO());
  const [time, setTime] = useState(search.time ?? "09:00");
  const [notes, setNotes] = useState("");
  const [deposit, setDeposit] = useState("");
  const [busy, setBusy] = useState(false);

  const amount = Number(deposit.replace(",", ".")) || 0;
  const pixPayload = useMemo(
    () => buildPixPayload({ key: PIX_KEY, merchant: MERCHANT, city: CITY, amount: amount > 0 ? amount : undefined }),
    [amount],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("appointments").insert({
      user_id: user.id,
      client_name, procedure, date, time, notes: notes || null,
      deposit_amount: amount > 0 ? amount : null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Agendamento criado!");
    navigate({ to: "/agenda" });
  };

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="mx-auto max-w-md flex items-center px-4 h-14 gap-2">
          <button onClick={() => history.back()} className="p-2 -ml-2"><ChevronLeft className="w-5 h-5" /></button>
          <h1 className="text-base font-semibold">Novo agendamento</h1>
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 py-4">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Cliente"><Input required value={client_name} onChange={(e) => setName(e.target.value)} placeholder="Nome da cliente" /></Field>
          <Field label="Procedimento"><Input required value={procedure} onChange={(e) => setProc(e.target.value)} placeholder="Ex: Limpeza de pele" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data"><Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label="Horário"><Input type="time" required value={time} onChange={(e) => setTime(e.target.value)} /></Field>
          </div>
          <Field label="Observações"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Detalhes do atendimento" /></Field>

          <Field label="Valor do sinal (Pix) — opcional" hint="Informe o valor para gerar o QR Code com valor.">
            <Input inputMode="decimal" placeholder="0,00" value={deposit} onChange={(e) => setDeposit(e.target.value)} />
          </Field>

          <Card className="bg-surface border-surface">
            <p className="text-xs font-semibold uppercase tracking-wider text-dark/70 mb-3">Pix para sinal</p>
            <div className="flex items-center justify-center bg-card rounded-lg p-3 mb-3">
              <img src={qrUrl(pixPayload)} alt="QR Code Pix" className="w-56 h-56" />
            </div>
            <p className="text-xs text-muted-foreground mb-2">Chave: <span className="text-foreground font-medium">{PIX_KEY}</span></p>
            <textarea readOnly value={pixPayload} className="w-full text-[10px] font-mono p-2 rounded border border-border bg-card h-16 resize-none" />
            <Button
              type="button" variant="secondary" full size="md" className="mt-2"
              onClick={() => { navigator.clipboard.writeText(pixPayload); toast.success("Copiado!"); }}
            >
              <Copy className="w-4 h-4" /> Copiar código Pix
            </Button>
          </Card>

          <Button type="submit" full disabled={busy}>{busy ? "Salvando..." : "Salvar agendamento"}</Button>
        </form>
      </main>
    </div>
  );
}
