import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Copy, ChevronDown, Search as SearchIcon, AlertTriangle } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { Button, Card, Field, Input, Textarea } from "@/components/u";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { todayISO } from "@/lib/format";


interface Search { date?: string; time?: string }

export const Route = createFileRoute("/agendamentos/novo")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    date: typeof s.date === "string" ? s.date : undefined,
    time: typeof s.time === "string" ? s.time : undefined,
  }),
  component: () => (<AuthGate><NewAppt /></AuthGate>),
});

const DEFAULT_PIX_KEY = "";
const PIX_TYPE_LABEL: Record<string, string> = {
  cpf: "CPF",
  cnpj: "CNPJ",
  email: "E-mail",
  telefone: "Telefone",
  aleatoria: "Chave aleatória",
};

const DEFAULT_PROCEDURES = [
  "Toxina Botulínica",
  "Preenchimento Labial",
  "Preenchimento Malar",
  "Bioestimulador de Colágeno",
  "Skinbooster",
  "Peeling Químico",
  "Limpeza de Pele",
];



interface ClientRow { id: string; name: string }

function NewAppt() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const search = Route.useSearch();
  const [clientId, setClientId] = useState("");
  const [client_name, setName] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const [clientOpen, setClientOpen] = useState(false);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const clientBoxRef = useRef<HTMLDivElement>(null);
  const [procedure, setProc] = useState("");
  const [date, setDate] = useState(search.date ?? todayISO());
  const [time, setTime] = useState(search.time ?? "09:00");
  const [notes, setNotes] = useState("");
  const [deposit, setDeposit] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [procedures, setProcedures] = useState<string[]>(DEFAULT_PROCEDURES);
  const [pixKey, setPixKey] = useState(DEFAULT_PIX_KEY);
  const [pixType, setPixType] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    supabase.from("clients").select("id,name").order("name").then(({ data }) => {
      setClients(data ?? []);
    });
    supabase.from("clinic_procedures" as never).select("name,default_price").eq("user_id", user.id).order("name").then(({ data }) => {
      const list = ((data as unknown as { name: string }[]) ?? []).map((p) => p.name);
      if (list.length > 0) setProcedures(list);
    });
    supabase.from("clinic_settings" as never).select("pix_key,pix_key_type").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      const d = (data ?? {}) as { pix_key?: string | null; pix_key_type?: string | null };
      if (d.pix_key) setPixKey(d.pix_key);
      if (d.pix_key_type) setPixType(d.pix_key_type);
    });
  }, [user]);



  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (clientBoxRef.current && !clientBoxRef.current.contains(e.target as Node)) {
        setClientOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filteredClients = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(q));
  }, [clients, clientQuery]);

  const amount = Number(deposit.replace(",", ".")) || 0;
  const pixPayload = useMemo(
    () => buildPixPayload({ key: pixKey, merchant, city: CITY, amount: amount > 0 ? amount : undefined }),
    [amount, pixKey, merchant],
  );


  const pickClient = (c: ClientRow) => {
    setClientId(c.id);
    setName(c.name);
    setClientQuery(c.name);
    setClientOpen(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!client_name) return toast.error("Selecione um cliente");
    if (!procedure) return toast.error("Selecione um procedimento");
    setBusy(true);
    const { error } = await supabase.from("appointments").insert({
      user_id: user.id,
      client_id: clientId || null,
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
          <Field label="Cliente">
            <div ref={clientBoxRef} className="relative">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={clientQuery}
                  onChange={(e) => { setClientQuery(e.target.value); setClientOpen(true); setClientId(""); setName(e.target.value); }}
                  onFocus={() => setClientOpen(true)}
                  placeholder="Buscar cliente..."
                  className="pl-9"
                  autoComplete="off"
                />
              </div>
              {clientOpen && (
                <div className="absolute z-30 mt-1 w-full max-h-60 overflow-auto rounded-md border border-border bg-card shadow-lg">
                  {filteredClients.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum cliente encontrado</div>
                  ) : (
                    filteredClients.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => pickClient(c)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                      >
                        {c.name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </Field>
          <Field label="Procedimento">
            <div className="relative">
              <select
                required
                value={procedure}
                onChange={(e) => setProc(e.target.value)}
                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm appearance-none pr-9 focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="" disabled>Selecione um procedimento</option>
                {procedures.map((p: string) => (<option key={p} value={p}>{p}</option>))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50 pointer-events-none" />
            </div>
          </Field>
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
            <p className="text-xs text-muted-foreground mb-2">Chave: <span className="text-foreground font-medium">{pixKey}</span></p>
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
