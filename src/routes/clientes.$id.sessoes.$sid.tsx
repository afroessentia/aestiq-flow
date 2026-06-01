import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { Card, EmptyState } from "@/components/u";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/clientes/$id/sessoes/$sid")({
  component: () => (<AuthGate><SessaoPage /></AuthGate>),
});

interface Sessao {
  id: string; date: string; procedure: string;
  product_lot: string | null; units: number | null;
  expiration_date: string | null; application_zone: string | null;
  return_date: string | null; notes: string | null;
  before_photo: string | null; after_photo: string | null;
}

function SessaoPage() {
  const { id, sid } = Route.useParams();
  const navigate = useNavigate();
  const [s, setS] = useState<Sessao | null>(null);
  const [loading, setLoading] = useState(true);
  const [urls, setUrls] = useState<{ before: string | null; after: string | null }>({ before: null, after: null });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("procedures")
        .select("id,date,procedure,product_lot,units,expiration_date,application_zone,return_date,notes,before_photo,after_photo")
        .eq("id", sid).maybeSingle();
      setS(data as Sessao | null);
      if (data) {
        const sign = async (p: string | null) => p
          ? (await supabase.storage.from("client-photos").createSignedUrl(p, 3600)).data?.signedUrl ?? null
          : null;
        const [b, a] = await Promise.all([sign(data.before_photo), sign(data.after_photo)]);
        setUrls({ before: b, after: a });
      }
      setLoading(false);
    })();
  }, [sid]);

  return (
    <div className="min-h-dvh bg-background pb-10">
      <header className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="mx-auto max-w-md flex items-center px-4 h-14 gap-2">
          <button onClick={() => navigate({ to: "/clientes/$id", params: { id } })} className="p-2 -ml-2" aria-label="Voltar">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold truncate">Detalhe da sessão</h1>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-4 space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-10">Carregando...</p>
        ) : !s ? (
          <EmptyState title="Sessão não encontrada" />
        ) : (
          <>
            <Card>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{fmtDate(s.date)}</p>
              <h2 className="text-lg font-bold text-dark mt-1">{s.procedure}</h2>
            </Card>

            <Card className="grid grid-cols-2 gap-3 text-sm">
              <Detail label="Unidades" value={s.units ? `${s.units}U` : "—"} />
              <Detail label="Zona" value={s.application_zone || "—"} />
              <Detail label="Lote" value={s.product_lot || "—"} />
              <Detail label="Validade" value={s.expiration_date ? fmtDate(s.expiration_date) : "—"} />
              <Detail label="Retorno" value={s.return_date ? fmtDate(s.return_date) : "—"} />
            </Card>

            {s.notes && (
              <Card>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Observações</p>
                <p className="text-sm whitespace-pre-wrap">{s.notes}</p>
              </Card>
            )}

            <Card>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Antes e depois</p>
              <div className="grid grid-cols-2 gap-2">
                <Photo label="Antes" url={urls.before} />
                <Photo label="Depois" url={urls.after} />
              </div>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function Photo({ label, url }: { label: string; url: string | null }) {
  return (
    <div className="aspect-square rounded-lg overflow-hidden bg-surface relative">
      {url ? (
        <img src={url} alt={label} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">Sem foto</div>
      )}
      <span className="absolute bottom-1 left-1 text-[10px] bg-dark/80 text-primary-foreground px-1.5 py-0.5 rounded">{label}</span>
    </div>
  );
}
