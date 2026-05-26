import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { Button, Card, Field, Input, Textarea } from "@/components/u";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { fmtDateTime } from "@/lib/format";

export const Route = createFileRoute("/clientes/$id/anamnese")({
  component: () => (<AuthGate><AnamnesePage /></AuthGate>),
});

const SKIN_TYPES = ["Seca", "Oleosa", "Mista", "Normal", "Sensível"];

function AnamnesePage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [existing, setExisting] = useState<string | null>(null);
  const [consent_at, setConsentAt] = useState<string | null>(null);
  const [f, setF] = useState({
    chronic_diseases: "", medications: "", allergies: "", procedure_history: "",
    skin_type: "Normal", keloid_history: false, pregnancy_breastfeeding: false, consent_lgpd: false,
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("anamnesis").select("*").eq("client_id", id).maybeSingle();
      if (data) {
        setExisting(data.id as string);
        setConsentAt((data.consent_at as string | null) ?? null);
        setF({
          chronic_diseases: data.chronic_diseases ?? "",
          medications: data.medications ?? "",
          allergies: data.allergies ?? "",
          procedure_history: data.procedure_history ?? "",
          skin_type: data.skin_type ?? "Normal",
          keloid_history: !!data.keloid_history,
          pregnancy_breastfeeding: !!data.pregnancy_breastfeeding,
          consent_lgpd: !!data.consent_lgpd,
        });
      }
      setLoaded(true);
    })();
  }, [id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!f.consent_lgpd) return toast.error("É obrigatório aceitar o termo LGPD.");
    setBusy(true);
    const now = new Date().toISOString();
    const payload = {
      user_id: user.id, client_id: id,
      ...f,
      consent_at: consent_at ?? now,
      updated_at: now,
    };
    const { error } = existing
      ? await supabase.from("anamnesis").update(payload).eq("id", existing)
      : await supabase.from("anamnesis").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Anamnese salva!");
    navigate({ to: "/clientes/$id", params: { id } });
  };

  if (!loaded) return <div className="min-h-dvh flex items-center justify-center text-sm text-muted-foreground">Carregando...</div>;

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="mx-auto max-w-md flex items-center px-4 h-14 gap-2">
          <button onClick={() => history.back()} className="p-2 -ml-2"><ChevronLeft className="w-5 h-5" /></button>
          <h1 className="text-base font-semibold">Anamnese</h1>
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 py-4">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Doenças crônicas"><Textarea value={f.chronic_diseases} onChange={(e) => setF({ ...f, chronic_diseases: e.target.value })} /></Field>
          <Field label="Medicações em uso"><Textarea value={f.medications} onChange={(e) => setF({ ...f, medications: e.target.value })} /></Field>
          <Field label="Alergias"><Textarea value={f.allergies} onChange={(e) => setF({ ...f, allergies: e.target.value })} /></Field>
          <Field label="Histórico de procedimentos estéticos"><Textarea value={f.procedure_history} onChange={(e) => setF({ ...f, procedure_history: e.target.value })} /></Field>

          <Field label="Tipo de pele">
            <div className="grid grid-cols-3 gap-2">
              {SKIN_TYPES.map((s) => (
                <button type="button" key={s}
                  onClick={() => setF({ ...f, skin_type: s })}
                  className={`h-11 rounded-lg text-sm font-medium ${f.skin_type === s ? "bg-primary text-primary-foreground" : "bg-surface text-dark"}`}>
                  {s}
                </button>
              ))}
            </div>
          </Field>

          <Toggle label="Histórico de quelóide" value={f.keloid_history} onChange={(v) => setF({ ...f, keloid_history: v })} />
          <Toggle label="Gestante ou lactante" value={f.pregnancy_breastfeeding} onChange={(v) => setF({ ...f, pregnancy_breastfeeding: v })} />

          <Card className="bg-surface border-surface">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={f.consent_lgpd} onChange={(e) => setF({ ...f, consent_lgpd: e.target.checked })} className="mt-1 w-5 h-5 accent-[color:var(--color-primary)]" />
              <span className="text-sm text-dark">
                <strong>Termo LGPD:</strong> Autorizo o tratamento dos meus dados pessoais e de saúde pela clínica AESTIQ exclusivamente para finalidade estética e clínica, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).
              </span>
            </label>
            {consent_at && (
              <p className="text-[11px] text-muted-foreground mt-2">Consentimento registrado em {fmtDateTime(consent_at)}</p>
            )}
          </Card>

          <Button type="submit" full disabled={busy}>{busy ? "Salvando..." : existing ? "Atualizar anamnese" : "Salvar anamnese"}</Button>
        </form>
      </main>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)} className="w-full flex items-center justify-between bg-card border border-border rounded-lg px-4 h-14">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <span className={`w-11 h-6 rounded-full relative transition-colors ${value ? "bg-primary" : "bg-border"}`}>
        <span className={`absolute top-0.5 ${value ? "left-[22px]" : "left-0.5"} w-5 h-5 rounded-full bg-card transition-all`} />
      </span>
    </button>
  );
}
