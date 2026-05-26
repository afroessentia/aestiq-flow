import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageCircle, Check } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/AppShell";
import { Button, Card, EmptyState } from "@/components/u";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate, waLink } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/retornos")({
  component: () => (<AuthGate><RetornosPage /></AuthGate>),
});

interface Ret {
  id: string; procedure: string; return_date: string;
  clients: { id: string; name: string; phone: string | null } | null;
}

function RetornosPage() {
  const [items, setItems] = useState<Ret[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from("procedures")
      .select("id,procedure,return_date,clients(id,name,phone)")
      .eq("return_done", false)
      .order("return_date", { ascending: true });
    setItems((data as unknown as Ret[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const markDone = async (id: string) => {
    const { error } = await supabase.from("procedures").update({ return_done: true }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Retorno marcado como concluído");
    load();
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <AppShell title="Retornos">
      {loading ? null : items.length === 0 ? (
        <EmptyState title="Sem retornos pendentes" hint="Tudo em dia por aqui." />
      ) : (
        <div className="space-y-2">
          {items.map((r) => {
            const overdue = r.return_date < today;
            return (
              <Card key={r.id}>
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 mt-2 rounded-full ${overdue ? "bg-accent" : "bg-primary"}`} />
                  <div className="flex-1 min-w-0">
                    <Link
                      to="/clientes/$id"
                      params={{ id: r.clients?.id ?? "" }}
                      className="font-semibold text-foreground truncate block"
                    >
                      {r.clients?.name ?? "Cliente"}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {r.procedure} • {overdue ? "Atrasado desde" : "Retorno em"} {fmtDate(r.return_date)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  {r.clients?.phone && (
                    <a
                      href={waLink(r.clients.phone, `Olá ${r.clients.name}! Tudo bem? Passando para lembrar do seu retorno para ${r.procedure} na AESTIQ. Posso confirmar um horário?`)}
                      target="_blank" rel="noreferrer"
                      className="flex-1 h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm inline-flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4" /> WhatsApp
                    </a>
                  )}
                  <Button type="button" variant="outline" size="md" onClick={() => markDone(r.id)}>
                    <Check className="w-4 h-4" /> Concluir
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
