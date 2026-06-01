import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type ChangeEvent } from "react";
import { ChevronLeft, Camera } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { Button, Field, Input, Textarea } from "@/components/u";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { todayISO } from "@/lib/format";

export const Route = createFileRoute("/clientes/$id/procedimento")({
  component: () => (<AuthGate><NovoProc /></AuthGate>),
});

function NovoProc() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [procedure, setProcedure] = useState("");
  const [units, setUnits] = useState<string>("");
  const [product_lot, setLot] = useState("");
  const [expiration, setExpiration] = useState("");
  const [zone, setZone] = useState("");
  const [days, setDays] = useState(15);
  const [notes, setNotes] = useState("");
  const [before, setBefore] = useState<File | null>(null);
  const [after, setAfter] = useState<File | null>(null);

  const uploadPhoto = async (f: File, label: "antes" | "depois") => {
    if (!user) return null;
    const ext = f.name.split(".").pop() || "jpg";
    const path = `${user.id}/${id}/${Date.now()}-${label}.${ext}`;
    const { error } = await supabase.storage.from("client-photos").upload(path, f, { upsert: false });
    if (error) throw error;
    return path;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const [bp, ap] = await Promise.all([
        before ? uploadPhoto(before, "antes") : Promise.resolve(null),
        after ? uploadPhoto(after, "depois") : Promise.resolve(null),
      ]);
      const { error } = await supabase.from("procedures").insert({
        user_id: user.id, client_id: id,
        date, procedure,
        product_lot: product_lot || null,
        units: units ? Number(units) : null,
        expiration_date: expiration || null,
        application_zone: zone || null,
        days_until_return: days, notes: notes || null,
        before_photo: bp, after_photo: ap,
      });
      if (error) throw error;
      toast.success("Sessão registrada!");
      navigate({ to: "/clientes/$id", params: { id } });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="mx-auto max-w-md flex items-center px-4 h-14 gap-2">
          <button onClick={() => navigate({ to: "/clientes/$id", params: { id } })} className="p-2 -ml-2">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold">Nova sessão</h1>
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 py-4">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Data"><Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Produto / procedimento"><Input required value={procedure} onChange={(e) => setProcedure(e.target.value)} placeholder="Ex: Botox Allergan" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Unidades aplicadas"><Input type="number" min={0} value={units} onChange={(e) => setUnits(e.target.value)} placeholder="Ex: 30" /></Field>
            <Field label="Zona de aplicação"><Input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Ex: Glabela" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Lote"><Input value={product_lot} onChange={(e) => setLot(e.target.value)} placeholder="Nº do lote" /></Field>
            <Field label="Validade"><Input type="date" value={expiration} onChange={(e) => setExpiration(e.target.value)} /></Field>
          </div>
          <Field label="Dias até retorno"><Input type="number" min={1} value={days} onChange={(e) => setDays(Number(e.target.value) || 15)} /></Field>
          <Field label="Observações"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>

          <div className="grid grid-cols-2 gap-3">
            <PhotoInput label="Foto Antes" file={before} onChange={setBefore} />
            <PhotoInput label="Foto Depois" file={after} onChange={setAfter} />
          </div>

          <Button type="submit" full disabled={busy}>{busy ? "Salvando..." : "Salvar sessão"}</Button>
        </form>
      </main>
    </div>
  );
}

function PhotoInput({ label, file, onChange }: { label: string; file: File | null; onChange: (f: File | null) => void }) {
  const onPick = (e: ChangeEvent<HTMLInputElement>) => onChange(e.target.files?.[0] ?? null);
  const preview = file ? URL.createObjectURL(file) : null;
  return (
    <label className="aspect-square rounded-lg border-2 border-dashed border-border bg-card flex items-center justify-center cursor-pointer overflow-hidden">
      {preview ? (
        <img src={preview} alt={label} className="w-full h-full object-cover" />
      ) : (
        <div className="text-center px-2">
          <Camera className="w-6 h-6 mx-auto text-muted-foreground" />
          <p className="text-xs text-muted-foreground mt-1">{label}</p>
        </div>
      )}
      <input type="file" accept="image/*" capture="environment" onChange={onPick} className="hidden" />
    </label>
  );
}
