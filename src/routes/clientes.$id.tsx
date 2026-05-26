import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, FileText, Plus, MessageCircle } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { Button, Card, EmptyState, SectionTitle } from "@/components/u";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate, initials, waLink } from "@/lib/format";

export const Route = createFileRoute("/clientes/$id")({
  component: () => (<AuthGate><ClientePage /></AuthGate>),
});

interface Client { id: string; name: string; phone: string | null; email: string | null; }
interface Proc {
  id: string; date: string; procedure: string; product_lot: string | null; return_date: string;
  before_photo: string | null; after_photo: string | null;
}

function signedFromPath(path: string | null): Promise<string | null> {
  if (!path) return Promise.resolve(null);
  return supabase.storage.from("client-photos").createSignedUrl(path, 3600).then(r => r.data?.signedUrl ?? null);
}

function ClientePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [c, setC] = useState<Client | null>(null);
  const [procs, setProcs] = useState<Proc[]>([]);
  const [photos, setPhotos] = useState<{ url: string; date: string; label: string }[]>([]);
  const [hasAnamnesis, setHasAnamnesis] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: cli } = await supabase.from("clients").select("id,name,phone,email").eq("id", id).single();
      setC(cli as Client | null);
      const { data: pr } = await supabase.from("procedures").select("id,date,procedure,product_lot,return_date,before_photo,after_photo").eq("client_id", id).order("date", { ascending: false });
      const ps = (pr as Proc[]) || [];
      setProcs(ps);
      const { data: an } = await supabase.from("anamnesis").select("id").eq("client_id", id).maybeSingle();
      setHasAnamnesis(!!an);
      // signed URLs for gallery
      const all: { url: string; date: string; label: string }[] = [];
      for (const p of ps) {
        const [b, a] = await Promise.all([signedFromPath(p.before_photo), signedFromPath(p.after_photo)]);
        if (b) all.push({ url: b, date: p.date, label: "Antes" });
        if (a) all.push({ url: a, date: p.date, label: "Depois" });
      }
      setPhotos(all);
    })();
  }, [id]);

  if (!c) return <div className="min-h-dvh flex items-center justify-center text-sm text-muted-foreground">Carregando...</div>;

  return (
    <div className="min-h-dvh bg-background pb-10">
      <header className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="mx-auto max-w-md flex items-center px-4 h-14 gap-2">
          <button onClick={() => navigate({ to: "/clientes" })} className="p-2 -ml-2"><ChevronLeft className="w-5 h-5" /></button>
          <h1 className="text-base font-semibold truncate">Ficha da cliente</h1>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-4 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-surface text-primary font-bold flex items-center justify-center">{initials(c.name)}</div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-dark truncate">{c.name}</h2>
            <p className="text-sm text-muted-foreground truncate">{c.phone || c.email || "—"}</p>
          </div>
          {c.phone && (
            <a href={waLink(c.phone, `Olá ${c.name}!`)} target="_blank" rel="noreferrer" className="p-2 rounded-md bg-surface text-primary">
              <MessageCircle className="w-5 h-5" />
            </a>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Link to="/clientes/$id/anamnese" params={{ id }}>
            <Button variant={hasAnamnesis ? "secondary" : "dark"} full size="md">
              <FileText className="w-4 h-4" /> Anamnese
            </Button>
          </Link>
          <Link to="/clientes/$id/procedimento" params={{ id }}>
            <Button full size="md"><Plus className="w-4 h-4" /> Procedimento</Button>
          </Link>
        </div>

        <div>
          <SectionTitle>Histórico de procedimentos</SectionTitle>
          {procs.length === 0 ? (
            <EmptyState title="Sem procedimentos registrados" />
          ) : (
            <div className="space-y-2">
              {procs.map((p) => (
                <Card key={p.id}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{p.procedure}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmtDate(p.date)}{p.product_lot ? ` • Lote ${p.product_lot}` : ""}
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider bg-surface text-dark px-2 py-1 rounded">
                      Retorno {fmtDate(p.return_date)}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <SectionTitle>Galeria</SectionTitle>
          {photos.length === 0 ? (
            <EmptyState title="Nenhuma foto enviada ainda" />
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((p, i) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden bg-surface relative">
                  <img src={p.url} alt={p.label} className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 left-1 text-[10px] bg-dark/80 text-primary-foreground px-1.5 py-0.5 rounded">{p.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
