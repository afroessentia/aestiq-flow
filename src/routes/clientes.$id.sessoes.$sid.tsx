import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, Pencil, Save, X } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { Button, Card, EmptyState, Field, Input, Textarea } from "@/components/u";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/clientes/$id/sessoes/$sid")({
  component: () => (<AuthGate><SessaoPage /></AuthGate>),
});

interface Sessao {
  id: string; date: string; procedure: string;
  product: string | null; product_lot: string | null; units: number | null;
  expiration_date: string | null; application_zone: string | null;
  return_date: string | null; notes: string | null;
  before_photo: string | null; after_photo: string | null;
}

function SessaoPage() {
  const { id, sid } = Route.useParams();
  const navigate = useNavigate();
  const [s, setS] = useState<Sessao | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [urls, setUrls] = useState<{ before: string | null; after: string | null }>({ before: null, after: null });

  const load = async () => {
    const { data } = await supabase.from("procedures")
      .select("id,date,procedure,product,product_lot,units,expiration_date,application_zone,return_date,notes,before_photo,after_photo")
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
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [sid]);

  const save = async () => {
    if (!s) return;
    setSaving(true);
    const { error } = await supabase.from("procedures").update({
      procedure: s.procedure,
      product: s.product || null,
      product_lot: s.product_lot || null,
      units: s.units ?? null,
      expiration_date: s.expiration_date || null,
      application_zone: s.application_zone || null,
      notes: s.notes || null,
    }).eq("id", sid);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Sessão atualizada");
    setEditing(false);
  };

  const upd = (patch: Partial<Sessao>) => setS(prev => prev ? { ...prev, ...patch } : prev);

  return (
    <div className="min-h-dvh bg-background pb-10">
      <header className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="mx-auto max-w-md flex items-center px-4 h-14 gap-2">
          <button onClick={() => navigate({ to: "/clientes/$id", params: { id } })} className="p-2 -ml-2" aria-label="Voltar">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold truncate flex-1">Detalhe da sessão</h1>
          {s && !editing && (
            <button onClick={() => setEditing(true)} className="p-2 text-primary" aria-label="Editar">
              <Pencil className="w-5 h-5" />
            </button>
          )}
          {s && editing && (
            <button onClick={() => { setEditing(false); load(); }} className="p-2 text-muted-foreground" aria-label="Cancelar">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-4 space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-10">Carregando...</p>
        ) : !s ? (
          <EmptyState title="Sessão não encontrada" />
        ) : !editing ? (
          <>
            <Card>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{fmtDate(s.date)}</p>
              <h2 className="text-lg font-bold text-dark mt-1">{s.procedure}</h2>
              {s.product && <p className="text-sm text-muted-foreground mt-1">{s.product}</p>}
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

            {(urls.before || urls.after) && (
              <Card>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Antes e depois</p>
                <div className="grid grid-cols-2 gap-2">
                  <Photo label="Antes" url={urls.before} />
                  <Photo label="Depois" url={urls.after} />
                </div>
              </Card>
            )}

            <Button full variant="dark" onClick={() => setEditing(true)}>
              <Pencil className="w-4 h-4" /> Editar sessão
            </Button>
          </>
        ) : (
          <Card className="space-y-3">
            <Field label="Nome do procedimento">
              <Input value={s.procedure} onChange={(e) => upd({ procedure: e.target.value })} />
            </Field>
            <Field label="Produto utilizado">
              <Input value={s.product || ""} onChange={(e) => upd({ product: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Unidades">
                <Input type="number" min={0} value={s.units ?? ""} onChange={(e) => upd({ units: e.target.value ? Number(e.target.value) : null })} />
              </Field>
              <Field label="Zona de aplicação">
                <Input value={s.application_zone || ""} onChange={(e) => upd({ application_zone: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Lote">
                <Input value={s.product_lot || ""} onChange={(e) => upd({ product_lot: e.target.value })} />
              </Field>
              <Field label="Validade">
                <Input type="date" value={s.expiration_date || ""} onChange={(e) => upd({ expiration_date: e.target.value })} />
              </Field>
            </div>
            <Field label="Observações">
              <Textarea value={s.notes || ""} onChange={(e) => upd({ notes: e.target.value })} />
            </Field>
            <Button full onClick={save} disabled={saving}>
              <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </Card>
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
