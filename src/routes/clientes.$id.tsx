import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, FileText, Plus, MessageCircle, Camera, Save, Trash2, X, Pencil } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { Button, Card, EmptyState, Field, Input, Label, SectionTitle, Textarea } from "@/components/u";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fmtDate, fmtDateTime, initials, todayISO, waLink } from "@/lib/format";
import { toast } from "sonner";
import { PhoneInput } from "@/components/PhoneInput";

export const Route = createFileRoute("/clientes/$id")({
  component: () => (<AuthGate><ClientePage /></AuthGate>),
});

interface Client {
  id: string; name: string; phone: string | null; email: string | null;
  birth_date: string | null; notes: string | null;
  lgpd_consent: boolean; lgpd_consent_at: string | null;
}
interface Proc {
  id: string; date: string; procedure: string; product: string | null; product_lot: string | null;
  return_date: string | null; before_photo: string | null; after_photo: string | null;
  units: number | null; expiration_date: string | null; application_zone: string | null;
  notes: string | null;
}
interface Marker { id?: string; number: number; x: number; y: number; note: string | null; region: string; }

type Region = "rosto" | "pescoco" | "decote" | "membros_inferiores" | "corpo_inteiro";
const REGIONS: { value: Region; label: string }[] = [
  { value: "rosto", label: "Rosto" },
  { value: "pescoco", label: "Pescoço" },
  { value: "decote", label: "Decote" },
  { value: "membros_inferiores", label: "Membros inferiores" },
  { value: "corpo_inteiro", label: "Corpo inteiro" },
];

function signedUrl(path: string | null): Promise<string | null> {
  if (!path) return Promise.resolve(null);
  return supabase.storage.from("client-photos").createSignedUrl(path, 3600).then(r => r.data?.signedUrl ?? null);
}

function ClientePage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [c, setC] = useState<Client | null>(null);
  const [procs, setProcs] = useState<Proc[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, { before: string | null; after: string | null }>>({});
  const [hasAnamnesis, setHasAnamnesis] = useState(false);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [region, setRegion] = useState<Region>("rosto");
  const [selectedMarker, setSelectedMarker] = useState<number | null>(null);
  const [savingHeader, setSavingHeader] = useState(false);
  const [savingMarkers, setSavingMarkers] = useState(false);
  const [savingPhotos, setSavingPhotos] = useState(false);
  const [showAddPair, setShowAddPair] = useState(false);
  const [newBefore, setNewBefore] = useState<File | null>(null);
  const [newAfter, setNewAfter] = useState<File | null>(null);
  const [showNewSession, setShowNewSession] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const reloadProcs = async () => {
    const { data: pr } = await supabase.from("procedures")
      .select("id,date,procedure,product,product_lot,return_date,before_photo,after_photo,units,expiration_date,application_zone,notes")
      .eq("client_id", id).order("date", { ascending: false });
    const ps = (pr as unknown as Proc[]) || [];
    setProcs(ps);
    const t: Record<string, { before: string | null; after: string | null }> = {};
    await Promise.all(ps.map(async p => {
      const [b, a] = await Promise.all([signedUrl(p.before_photo), signedUrl(p.after_photo)]);
      t[p.id] = { before: b, after: a };
    }));
    setThumbs(t);
  };

  useEffect(() => {
    (async () => {
      const { data: cli } = await supabase.from("clients")
        .select("id,name,phone,email,birth_date,notes,lgpd_consent,lgpd_consent_at")
        .eq("id", id).single();
      setC(cli as Client | null);
      await reloadProcs();
      const { data: an } = await supabase.from("anamnesis").select("id").eq("client_id", id).maybeSingle();
      setHasAnamnesis(!!an);
      const { data: mk } = await supabase.from("facial_markers")
        .select("id,number,x,y,note,region").eq("client_id", id).order("number");
      setMarkers((mk as unknown as Marker[]) || []);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const photoPairs = useMemo(
    () => procs.filter(p => thumbs[p.id]?.before || thumbs[p.id]?.after),
    [procs, thumbs]
  );

  const regionMarkers = useMemo(() => markers.filter(m => m.region === region), [markers, region]);

  if (!c) return <div className="min-h-dvh flex items-center justify-center text-sm text-muted-foreground">Carregando...</div>;

  const updateClient = (patch: Partial<Client>) => setC(prev => prev ? { ...prev, ...patch } : prev);

  const saveHeader = async () => {
    if (!c || !user) return;
    setSavingHeader(true);
    const payload: Partial<Client> = {
      name: c.name, phone: c.phone, email: c.email,
      birth_date: c.birth_date || null, notes: c.notes,
      lgpd_consent: c.lgpd_consent,
      lgpd_consent_at: c.lgpd_consent ? (c.lgpd_consent_at || new Date().toISOString()) : null,
    };
    const { error } = await supabase.from("clients").update(payload).eq("id", c.id);
    setSavingHeader(false);
    if (error) return toast.error(error.message);
    if (c.lgpd_consent && !c.lgpd_consent_at) updateClient({ lgpd_consent_at: payload.lgpd_consent_at as string });
    toast.success("Dados salvos");
  };

  const toggleConsent = (v: boolean) => updateClient({
    lgpd_consent: v,
    lgpd_consent_at: v ? (c.lgpd_consent_at || new Date().toISOString()) : null,
  });

  // Facial mapping
  const handleFaceClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const number = (regionMarkers.reduce((m, k) => Math.max(m, k.number), 0)) + 1;
    setMarkers(prev => [...prev, { number, x, y, note: "", region }]);
    setSelectedMarker(number);
  };

  const removeMarker = (num: number) => {
    setMarkers(prev => prev.filter(m => !(m.number === num && m.region === region)));
    if (selectedMarker === num) setSelectedMarker(null);
  };

  const updateMarkerNote = (num: number, note: string) => {
    setMarkers(prev => prev.map(m => (m.number === num && m.region === region) ? { ...m, note } : m));
  };

  const saveMarkers = async () => {
    if (!user) return;
    setSavingMarkers(true);
    // Replace only this region's markers
    const { error: delErr } = await supabase.from("facial_markers")
      .delete().eq("client_id", id).eq("region", region);
    if (delErr) { setSavingMarkers(false); return toast.error(delErr.message); }
    if (regionMarkers.length > 0) {
      const rows = regionMarkers.map(m => ({
        user_id: user.id, client_id: id, number: m.number, x: m.x, y: m.y,
        note: m.note || null, region,
      }));
      const { error } = await supabase.from("facial_markers").insert(rows);
      if (error) { setSavingMarkers(false); return toast.error(error.message); }
    }
    setSavingMarkers(false);
    toast.success("Mapeamento salvo");
  };

  const uploadOne = async (f: File, label: "antes" | "depois") => {
    if (!user) return null;
    const ext = f.name.split(".").pop() || "jpg";
    const path = `${user.id}/${id}/${Date.now()}-${label}.${ext}`;
    const { error } = await supabase.storage.from("client-photos").upload(path, f, { upsert: false });
    if (error) throw error;
    return path;
  };

  const savePhotoPair = async () => {
    if (!user) return;
    if (!newBefore && !newAfter) return toast.error("Selecione ao menos uma foto");
    setSavingPhotos(true);
    try {
      const [bp, ap] = await Promise.all([
        newBefore ? uploadOne(newBefore, "antes") : Promise.resolve(null),
        newAfter ? uploadOne(newAfter, "depois") : Promise.resolve(null),
      ]);
      const today = new Date().toISOString().slice(0, 10);
      const { error } = await supabase.from("procedures").insert({
        user_id: user.id, client_id: id, date: today,
        procedure: "Sessão fotográfica",
        before_photo: bp, after_photo: ap, days_until_return: 15,
      });
      if (error) throw error;
      toast.success("Comparação adicionada");
      setNewBefore(null); setNewAfter(null); setShowAddPair(false);
      await reloadProcs();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSavingPhotos(false);
    }
  };

  const deletePair = async (procId: string) => {
    if (!confirm("Excluir esta comparação?")) return;
    const { error } = await supabase.from("procedures").delete().eq("id", procId);
    if (error) return toast.error(error.message);
    toast.success("Comparação removida");
    await reloadProcs();
  };

  return (
    <div className="min-h-dvh bg-background pb-16">
      <header className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="mx-auto max-w-md flex items-center px-4 h-14 gap-2">
          <button onClick={() => navigate({ to: "/clientes" })} className="p-2 -ml-2" aria-label="Voltar">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold truncate">Prontuário</h1>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-4 space-y-6">
        {/* 1. Client header */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-full bg-surface text-primary font-bold flex items-center justify-center text-lg">
              {initials(c.name)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-dark truncate">{c.name}</h2>
              <p className="text-sm text-muted-foreground truncate">{c.phone || c.email || "—"}</p>
            </div>
            {c.phone && (
              <a href={waLink(c.phone, `Olá ${c.name}!`)} target="_blank" rel="noreferrer"
                 className="p-2.5 rounded-md bg-surface text-primary" aria-label="WhatsApp">
                <MessageCircle className="w-5 h-5" />
              </a>
            )}
          </div>

          <div className="space-y-3">
            <Field label="Nome completo">
              <Input value={c.name} onChange={(e) => updateClient({ name: e.target.value })} />
            </Field>
            <Field label="Data de nascimento">
              <Input type="date" value={c.birth_date || ""} onChange={(e) => updateClient({ birth_date: e.target.value })} />
            </Field>
            <Field label="WhatsApp">
              <PhoneInput value={c.phone} onChange={(v) => updateClient({ phone: v })} />
            </Field>
            <Field label="E-mail">
              <Input type="email" value={c.email || ""} onChange={(e) => updateClient({ email: e.target.value })} />
            </Field>
            <Field label="Alergias e histórico breve">
              <Textarea value={c.notes || ""} onChange={(e) => updateClient({ notes: e.target.value })}
                        placeholder="Ex: alergia a lidocaína, hipertensão controlada..." />
            </Field>

            <label className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 cursor-pointer">
              <input type="checkbox" className="mt-1 w-5 h-5 accent-primary"
                     checked={c.lgpd_consent} onChange={(e) => toggleConsent(e.target.checked)} />
              <div className="text-sm">
                <p className="font-medium text-foreground">Paciente autorizou coleta e uso de dados conforme LGPD</p>
                {c.lgpd_consent && c.lgpd_consent_at && (
                  <p className="text-xs text-muted-foreground mt-1">Aceito em {fmtDateTime(c.lgpd_consent_at)}</p>
                )}
              </div>
            </label>

            <Button full onClick={saveHeader} disabled={savingHeader}>
              <Save className="w-4 h-4" /> {savingHeader ? "Salvando..." : "Salvar dados"}
            </Button>
          </div>

          <div className="mt-4">
            <Link to="/clientes/$id/anamnese" params={{ id }}>
              <Button variant={hasAnamnesis ? "secondary" : "dark"} full size="md">
                <FileText className="w-4 h-4" /> Anamnese
              </Button>
            </Link>
          </div>
        </section>

        {/* 2. Before / after photos — multiple pairs */}
        <section>
          <SectionTitle>Fotos antes e depois</SectionTitle>

          {photoPairs.length === 0 && !showAddPair && (
            <EmptyState title="Nenhuma comparação ainda" hint="Adicione a primeira comparação abaixo." />
          )}

          <div className="space-y-3">
            {photoPairs.map(p => (
              <Card key={p.id}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">{fmtDate(p.date)}</p>
                  <button onClick={() => deletePair(p.id)} className="p-1 text-muted-foreground"
                          aria-label="Excluir comparação">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Compare label="Antes" url={thumbs[p.id]?.before} />
                  <Compare label="Depois" url={thumbs[p.id]?.after} />
                </div>
              </Card>
            ))}
          </div>

          {showAddPair ? (
            <Card className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Nova comparação</p>
                <button onClick={() => { setShowAddPair(false); setNewBefore(null); setNewAfter(null); }}
                        className="p-1 text-muted-foreground" aria-label="Cancelar">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <PhotoInput label="Antes" file={newBefore} onChange={setNewBefore} />
                <PhotoInput label="Depois" file={newAfter} onChange={setNewAfter} />
              </div>
              <Button full className="mt-3" onClick={savePhotoPair} disabled={savingPhotos}>
                <Save className="w-4 h-4" /> {savingPhotos ? "Enviando..." : "Salvar comparação"}
              </Button>
            </Card>
          ) : (
            <Button variant="dark" full className="mt-3" onClick={() => setShowAddPair(true)}>
              <Plus className="w-4 h-4" /> Adicionar comparação
            </Button>
          )}
        </section>

        {/* 3. Facial / body mapping */}
        <section>
          <SectionTitle>Mapeamento corporal</SectionTitle>
          <Card>
            <Field label="Região do corpo">
              <select
                value={region}
                onChange={(e) => { setRegion(e.target.value as Region); setSelectedMarker(null); }}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {REGIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </Field>

            <p className="text-xs text-muted-foreground mt-3 mb-2">
              Toque na silhueta para marcar zonas de aplicação. Cada ponto fica numerado.
            </p>
            <div className="relative w-full aspect-[3/4] bg-surface rounded-lg overflow-hidden select-none">
              <svg
                ref={svgRef}
                viewBox="0 0 300 400"
                onClick={handleFaceClick}
                className="absolute inset-0 w-full h-full cursor-crosshair"
              >
                <RegionSilhouette region={region} />

                {regionMarkers.map(m => (
                  <g key={m.number} onClick={(e) => { e.stopPropagation(); setSelectedMarker(m.number); }}>
                    <circle cx={(m.x / 100) * 300} cy={(m.y / 100) * 400} r={selectedMarker === m.number ? 14 : 12}
                            fill="#2A9D8F" stroke="#FAFAF9" strokeWidth="2" />
                    <text x={(m.x / 100) * 300} y={(m.y / 100) * 400 + 4}
                          textAnchor="middle" fontSize="11" fontWeight="700" fill="#FAFAF9">
                      {m.number}
                    </text>
                  </g>
                ))}
              </svg>
            </div>

            {regionMarkers.length > 0 && (
              <div className="mt-3 space-y-2">
                {regionMarkers.map(m => (
                  <div key={m.number}
                       className={`rounded-lg border p-2 ${selectedMarker === m.number ? "border-primary" : "border-border"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                        {m.number}
                      </span>
                      <Label className="!mb-0 flex-1">Anotação do ponto</Label>
                      <button onClick={() => removeMarker(m.number)} className="p-1 text-muted-foreground" aria-label="Remover">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <Input value={m.note || ""} onChange={(e) => updateMarkerNote(m.number, e.target.value)}
                           placeholder="Ex: 4U Botox glabela" />
                  </div>
                ))}
              </div>
            )}

            <Button full className="mt-3" onClick={saveMarkers} disabled={savingMarkers}>
              <Save className="w-4 h-4" /> {savingMarkers ? "Salvando..." : "Salvar mapeamento"}
            </Button>
          </Card>
        </section>

        {/* 4 + 5. Session timeline */}
        <section>
          <SectionTitle
            action={
              <button onClick={() => setShowNewSession(true)}
                      className="text-xs font-semibold text-primary">+ Nova sessão</button>
            }
          >
            Histórico de sessões
          </SectionTitle>

          {procs.length === 0 ? (
            <EmptyState title="Nenhuma sessão registrada ainda" hint="Adicione a primeira sessão pelo botão acima." />
          ) : (
            <div className="space-y-2">
              {procs.map(p => {
                const thumb = thumbs[p.id]?.before;
                return (
                  <Link key={p.id} to="/clientes/$id/sessoes/$sid" params={{ id, sid: p.id }}>
                    <Card className="flex gap-3 active:bg-surface">
                      <div className="w-14 h-14 rounded-lg bg-surface overflow-hidden shrink-0 flex items-center justify-center">
                        {thumb
                          ? <img src={thumb} alt="" className="w-full h-full object-cover" />
                          : <Camera className="w-5 h-5 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{p.procedure}</p>
                        <p className="text-xs text-muted-foreground">{fmtDate(p.date)}</p>
                        {p.application_zone && (
                          <p className="text-xs text-muted-foreground truncate">{p.application_zone}{p.units ? ` · ${p.units}U` : ""}</p>
                        )}
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <NewSessionDialog
        open={showNewSession}
        onClose={() => setShowNewSession(false)}
        onSaved={async () => { setShowNewSession(false); await reloadProcs(); }}
        clientId={id}
        userId={user?.id ?? null}
      />
    </div>
  );
}

function NewSessionDialog({
  open, onClose, onSaved, clientId, userId,
}: {
  open: boolean; onClose: () => void; onSaved: () => void;
  clientId: string; userId: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [procedure, setProcedure] = useState("");
  const [product, setProduct] = useState("");
  const [units, setUnits] = useState("");
  const [lot, setLot] = useState("");
  const [expiration, setExpiration] = useState("");
  const [zone, setZone] = useState("");
  const [notes, setNotes] = useState("");

  const reset = () => {
    setProcedure(""); setProduct(""); setUnits(""); setLot("");
    setExpiration(""); setZone(""); setNotes("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (!procedure.trim()) return toast.error("Informe o procedimento");
    setBusy(true);
    const { error } = await supabase.from("procedures").insert({
      user_id: userId, client_id: clientId,
      date: todayISO(),
      procedure: procedure.trim(),
      product: product || null,
      units: units ? Number(units) : null,
      product_lot: lot || null,
      expiration_date: expiration || null,
      application_zone: zone || null,
      notes: notes || null,
      days_until_return: 15,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Sessão registrada!");
    reset();
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova sessão</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Nome do procedimento">
            <Input required value={procedure} onChange={(e) => setProcedure(e.target.value)} placeholder="Ex: Toxina Botulínica" />
          </Field>
          <Field label="Produto utilizado">
            <Input value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Ex: Botox Allergan" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Unidades aplicadas">
              <Input type="number" min={0} value={units} onChange={(e) => setUnits(e.target.value)} placeholder="Ex: 30" />
            </Field>
            <Field label="Zona de aplicação">
              <Input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Ex: Glabela" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Lote">
              <Input value={lot} onChange={(e) => setLot(e.target.value)} placeholder="Nº do lote" />
            </Field>
            <Field label="Validade">
              <Input type="date" value={expiration} onChange={(e) => setExpiration(e.target.value)} />
            </Field>
          </div>
          <Field label="Observações">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <Button type="submit" full disabled={busy}>
            <Save className="w-4 h-4" /> {busy ? "Salvando..." : "Salvar sessão"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Compare({ label, url }: { label: string; url: string | null | undefined }) {
  return (
    <div className="aspect-square rounded-lg overflow-hidden bg-surface relative">
      {url ? (
        <img src={url} alt={label} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">Sem foto</div>
      )}
      <span className="absolute bottom-1 left-1 text-[10px] bg-dark/80 text-primary-foreground px-1.5 py-0.5 rounded">
        {label}
      </span>
    </div>
  );
}

function PhotoInput({ label, file, onChange }: { label: string; file: File | null; onChange: (f: File | null) => void }) {
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
      <input type="file" accept="image/*" capture="environment"
             onChange={(e) => onChange(e.target.files?.[0] ?? null)} className="hidden" />
    </label>
  );
}

function RegionSilhouette({ region }: { region: Region }) {
  const stroke = "#1A2E35";
  const fill = "#FAFAF9";
  switch (region) {
    case "rosto":
      return (
        <g>
          <ellipse cx="150" cy="200" rx="100" ry="140" fill={fill} stroke={stroke} strokeWidth="2" />
          <line x1="70" y1="180" x2="230" y2="180" stroke={stroke} strokeOpacity="0.25" strokeDasharray="3 3" />
          <ellipse cx="115" cy="180" rx="14" ry="6" fill="none" stroke={stroke} strokeOpacity="0.5" />
          <ellipse cx="185" cy="180" rx="14" ry="6" fill="none" stroke={stroke} strokeOpacity="0.5" />
          <line x1="150" y1="180" x2="150" y2="245" stroke={stroke} strokeOpacity="0.4" />
          <path d="M140 245 Q150 255 160 245" fill="none" stroke={stroke} strokeOpacity="0.5" />
          <line x1="100" y1="285" x2="200" y2="285" stroke={stroke} strokeOpacity="0.25" strokeDasharray="3 3" />
          <path d="M125 285 Q150 300 175 285" fill="none" stroke={stroke} strokeOpacity="0.6" strokeWidth="1.5" />
          <path d="M95 160 Q115 152 135 160" fill="none" stroke={stroke} strokeOpacity="0.5" strokeWidth="2" />
          <path d="M165 160 Q185 152 205 160" fill="none" stroke={stroke} strokeOpacity="0.5" strokeWidth="2" />
        </g>
      );
    case "pescoco":
      return (
        <g>
          {/* Lower jaw line */}
          <path d="M70 70 Q150 130 230 70" fill="none" stroke={stroke} strokeOpacity="0.4" strokeWidth="2" />
          {/* Neck */}
          <path d="M100 70 L100 280 Q150 320 200 280 L200 70" fill={fill} stroke={stroke} strokeWidth="2" />
          {/* Shoulders */}
          <path d="M40 300 Q100 270 150 300 Q200 270 260 300 L260 360 L40 360 Z" fill={fill} stroke={stroke} strokeWidth="2" />
          {/* Adam's apple hint */}
          <line x1="150" y1="120" x2="150" y2="240" stroke={stroke} strokeOpacity="0.2" strokeDasharray="3 3" />
        </g>
      );
    case "decote":
      return (
        <g>
          {/* Neck */}
          <path d="M110 30 L110 110 Q150 140 190 110 L190 30" fill={fill} stroke={stroke} strokeWidth="2" />
          {/* Shoulders + chest */}
          <path d="M20 180 Q80 130 150 160 Q220 130 280 180 L280 380 L20 380 Z"
                fill={fill} stroke={stroke} strokeWidth="2" />
          {/* Collarbone hint */}
          <path d="M60 180 Q150 200 240 180" fill="none" stroke={stroke} strokeOpacity="0.3" strokeDasharray="3 3" />
          {/* Sternum / décolleté V */}
          <path d="M150 160 L120 280 M150 160 L180 280" fill="none" stroke={stroke} strokeOpacity="0.3" />
        </g>
      );
    case "membros_inferiores":
      return (
        <g>
          {/* Hip line */}
          <path d="M70 30 Q150 60 230 30 L240 80 L60 80 Z" fill={fill} stroke={stroke} strokeWidth="2" />
          {/* Left leg */}
          <path d="M75 80 Q90 200 100 380 L140 380 Q138 200 140 80 Z" fill={fill} stroke={stroke} strokeWidth="2" />
          {/* Right leg */}
          <path d="M225 80 Q210 200 200 380 L160 380 Q162 200 160 80 Z" fill={fill} stroke={stroke} strokeWidth="2" />
          {/* Knee hints */}
          <ellipse cx="118" cy="240" rx="14" ry="8" fill="none" stroke={stroke} strokeOpacity="0.4" />
          <ellipse cx="182" cy="240" rx="14" ry="8" fill="none" stroke={stroke} strokeOpacity="0.4" />
        </g>
      );
    case "corpo_inteiro":
      return (
        <g>
          {/* Head */}
          <ellipse cx="150" cy="45" rx="26" ry="32" fill={fill} stroke={stroke} strokeWidth="2" />
          {/* Neck */}
          <rect x="138" y="74" width="24" height="14" fill={fill} stroke={stroke} strokeWidth="2" />
          {/* Torso */}
          <path d="M95 90 Q150 100 205 90 L220 220 Q150 240 80 220 Z" fill={fill} stroke={stroke} strokeWidth="2" />
          {/* Arms */}
          <path d="M95 92 Q70 95 60 110 L52 210 L72 215 L88 120 Z" fill={fill} stroke={stroke} strokeWidth="2" />
          <path d="M205 92 Q230 95 240 110 L248 210 L228 215 L212 120 Z" fill={fill} stroke={stroke} strokeWidth="2" />
          {/* Hips */}
          <path d="M85 220 Q150 240 215 220 L222 260 L78 260 Z" fill={fill} stroke={stroke} strokeWidth="2" />
          {/* Legs */}
          <path d="M88 260 Q98 320 108 388 L142 388 Q140 320 142 260 Z" fill={fill} stroke={stroke} strokeWidth="2" />
          <path d="M212 260 Q202 320 192 388 L158 388 Q160 320 158 260 Z" fill={fill} stroke={stroke} strokeWidth="2" />
        </g>
      );
  }
}
