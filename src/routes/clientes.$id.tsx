import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, FileText, Plus, MessageCircle, Camera, Save, Trash2 } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { Button, Card, EmptyState, Field, Input, Label, SectionTitle, Textarea } from "@/components/u";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fmtDate, fmtDateTime, initials, waLink } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/clientes/$id")({
  component: () => (<AuthGate><ClientePage /></AuthGate>),
});

interface Client {
  id: string; name: string; phone: string | null; email: string | null;
  birth_date: string | null; notes: string | null;
  lgpd_consent: boolean; lgpd_consent_at: string | null;
}
interface Proc {
  id: string; date: string; procedure: string; product_lot: string | null;
  return_date: string | null; before_photo: string | null; after_photo: string | null;
  units: number | null; expiration_date: string | null; application_zone: string | null;
  notes: string | null;
}
interface Marker { id?: string; number: number; x: number; y: number; note: string | null; }

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
  const [selectedMarker, setSelectedMarker] = useState<number | null>(null);
  const [savingHeader, setSavingHeader] = useState(false);
  const [savingMarkers, setSavingMarkers] = useState(false);
  const [savingPhotos, setSavingPhotos] = useState(false);
  const [newBefore, setNewBefore] = useState<File | null>(null);
  const [newAfter, setNewAfter] = useState<File | null>(null);

  useEffect(() => {
    (async () => {
      const { data: cli } = await supabase.from("clients")
        .select("id,name,phone,email,birth_date,notes,lgpd_consent,lgpd_consent_at")
        .eq("id", id).single();
      setC(cli as Client | null);

      const { data: pr } = await supabase.from("procedures")
        .select("id,date,procedure,product_lot,return_date,before_photo,after_photo,units,expiration_date,application_zone,notes")
        .eq("client_id", id).order("date", { ascending: false });
      const ps = (pr as Proc[]) || [];
      setProcs(ps);

      const t: Record<string, { before: string | null; after: string | null }> = {};
      await Promise.all(ps.map(async p => {
        const [b, a] = await Promise.all([signedUrl(p.before_photo), signedUrl(p.after_photo)]);
        t[p.id] = { before: b, after: a };
      }));
      setThumbs(t);

      const { data: an } = await supabase.from("anamnesis").select("id").eq("client_id", id).maybeSingle();
      setHasAnamnesis(!!an);

      const { data: mk } = await supabase.from("facial_markers")
        .select("id,number,x,y,note").eq("client_id", id).order("number");
      setMarkers((mk as Marker[]) || []);
    })();
  }, [id]);

  const latestPair = useMemo(() => {
    const first = procs.find(p => thumbs[p.id]?.before || thumbs[p.id]?.after);
    return first ? { proc: first, urls: thumbs[first.id] } : null;
  }, [procs, thumbs]);

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
  const svgRef = useRef<SVGSVGElement | null>(null);
  const handleFaceClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const number = (markers.reduce((m, k) => Math.max(m, k.number), 0)) + 1;
    setMarkers(prev => [...prev, { number, x, y, note: "" }]);
    setSelectedMarker(number);
  };

  const removeMarker = (num: number) => {
    setMarkers(prev => prev.filter(m => m.number !== num));
    if (selectedMarker === num) setSelectedMarker(null);
  };

  const updateMarkerNote = (num: number, note: string) => {
    setMarkers(prev => prev.map(m => m.number === num ? { ...m, note } : m));
  };

  const saveMarkers = async () => {
    if (!user) return;
    setSavingMarkers(true);
    const { error: delErr } = await supabase.from("facial_markers").delete().eq("client_id", id);
    if (delErr) { setSavingMarkers(false); return toast.error(delErr.message); }
    if (markers.length > 0) {
      const rows = markers.map(m => ({
        user_id: user.id, client_id: id, number: m.number, x: m.x, y: m.y, note: m.note || null,
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
      toast.success("Fotos adicionadas");
      setNewBefore(null); setNewAfter(null);
      // reload
      const { data: pr } = await supabase.from("procedures")
        .select("id,date,procedure,product_lot,return_date,before_photo,after_photo,units,expiration_date,application_zone,notes")
        .eq("client_id", id).order("date", { ascending: false });
      const ps = (pr as Proc[]) || [];
      setProcs(ps);
      const t: Record<string, { before: string | null; after: string | null }> = {};
      await Promise.all(ps.map(async p => {
        const [b, a] = await Promise.all([signedUrl(p.before_photo), signedUrl(p.after_photo)]);
        t[p.id] = { before: b, after: a };
      }));
      setThumbs(t);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSavingPhotos(false);
    }
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
              <Input inputMode="tel" placeholder="(11) 99999-9999" value={c.phone || ""}
                     onChange={(e) => updateClient({ phone: e.target.value })} />
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

          <div className="grid grid-cols-2 gap-2 mt-4">
            <Link to="/clientes/$id/anamnese" params={{ id }}>
              <Button variant={hasAnamnesis ? "secondary" : "dark"} full size="md">
                <FileText className="w-4 h-4" /> Anamnese
              </Button>
            </Link>
            <Link to="/clientes/$id/procedimento" params={{ id }}>
              <Button full size="md"><Plus className="w-4 h-4" /> Sessão</Button>
            </Link>
          </div>
        </section>

        {/* 2. Before / after photos */}
        <section>
          <SectionTitle>Fotos antes e depois</SectionTitle>

          {latestPair && (
            <Card className="mb-3">
              <p className="text-xs text-muted-foreground mb-2">Última comparação · {fmtDate(latestPair.proc.date)}</p>
              <div className="grid grid-cols-2 gap-2">
                <Compare label="Antes" url={latestPair.urls?.before} />
                <Compare label="Depois" url={latestPair.urls?.after} />
              </div>
            </Card>
          )}

          <Card>
            <p className="text-sm font-medium mb-2">Adicionar nova comparação</p>
            <div className="grid grid-cols-2 gap-3">
              <PhotoInput label="Antes" file={newBefore} onChange={setNewBefore} />
              <PhotoInput label="Depois" file={newAfter} onChange={setNewAfter} />
            </div>
            <Button full className="mt-3" onClick={savePhotoPair} disabled={savingPhotos}>
              <Save className="w-4 h-4" /> {savingPhotos ? "Enviando..." : "Salvar fotos"}
            </Button>
          </Card>
        </section>

        {/* 3. Facial mapping */}
        <section>
          <SectionTitle>Mapeamento facial</SectionTitle>
          <Card>
            <p className="text-xs text-muted-foreground mb-2">
              Toque no rosto para marcar zonas de aplicação. Cada ponto fica numerado.
            </p>
            <div className="relative w-full aspect-[3/4] bg-surface rounded-lg overflow-hidden select-none">
              <svg
                ref={svgRef}
                viewBox="0 0 300 400"
                onClick={handleFaceClick}
                className="absolute inset-0 w-full h-full cursor-crosshair"
              >
                {/* Head oval */}
                <ellipse cx="150" cy="200" rx="100" ry="140" fill="#FAFAF9" stroke="#1A2E35" strokeWidth="2" />
                {/* Eye line */}
                <line x1="70" y1="180" x2="230" y2="180" stroke="#1A2E35" strokeOpacity="0.25" strokeDasharray="3 3" />
                <ellipse cx="115" cy="180" rx="14" ry="6" fill="none" stroke="#1A2E35" strokeOpacity="0.5" />
                <ellipse cx="185" cy="180" rx="14" ry="6" fill="none" stroke="#1A2E35" strokeOpacity="0.5" />
                {/* Nose line */}
                <line x1="150" y1="180" x2="150" y2="245" stroke="#1A2E35" strokeOpacity="0.4" />
                <path d="M140 245 Q150 255 160 245" fill="none" stroke="#1A2E35" strokeOpacity="0.5" />
                {/* Mouth line */}
                <line x1="100" y1="285" x2="200" y2="285" stroke="#1A2E35" strokeOpacity="0.25" strokeDasharray="3 3" />
                <path d="M125 285 Q150 300 175 285" fill="none" stroke="#1A2E35" strokeOpacity="0.6" strokeWidth="1.5" />
                {/* Brows */}
                <path d="M95 160 Q115 152 135 160" fill="none" stroke="#1A2E35" strokeOpacity="0.5" strokeWidth="2" />
                <path d="M165 160 Q185 152 205 160" fill="none" stroke="#1A2E35" strokeOpacity="0.5" strokeWidth="2" />

                {markers.map(m => (
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

            {markers.length > 0 && (
              <div className="mt-3 space-y-2">
                {markers.map(m => (
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
              <Link to="/clientes/$id/procedimento" params={{ id }}
                    className="text-xs font-semibold text-primary">+ Nova sessão</Link>
            }
          >
            Histórico de sessões
          </SectionTitle>

          {procs.length === 0 ? (
            <EmptyState title="Nenhuma sessão registrada" hint="Adicione a primeira sessão pelo botão acima." />
          ) : (
            <div className="space-y-2">
              {procs.map(p => {
                const thumb = thumbs[p.id]?.after || thumbs[p.id]?.before;
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
    </div>
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
