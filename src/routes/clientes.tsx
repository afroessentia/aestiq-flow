import { createFileRoute, Link, Outlet, useChildMatches } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Search, UserRound } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/AppShell";
import { Button, Card, EmptyState, Input, Field } from "@/components/u";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { initials } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/clientes")({
  component: () => (<AuthGate><ClientesPage /></AuthGate>),
});

interface Client { id: string; name: string; phone: string | null; email: string | null; }

function ClientesPage() {
  const childMatches = useChildMatches();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });

  const load = async () => {
    let req = supabase.from("clients").select("id,name,phone,email").order("name");
    if (q.trim()) req = req.ilike("name", `%${q.trim()}%`);
    const { data } = await req;
    setItems((data as Client[]) || []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q]);

  if (childMatches.length > 0) return <Outlet />;


  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("clients").insert({
      user_id: user.id, name: form.name, phone: form.phone || null, email: form.email || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Cliente adicionada!");
    setForm({ name: "", phone: "", email: "" });
    setOpen(false); load();
  };

  return (
    <AppShell title="Clientes">
      <div className="relative mb-4">
        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome" className="pl-10" />
      </div>

      <Button full onClick={() => setOpen(true)} className="mb-4"><Plus className="w-5 h-5" /> Nova cliente</Button>

      {items.length === 0 ? (
        <EmptyState title="Nenhuma cliente encontrada" hint="Adicione sua primeira cliente." />
      ) : (
        <div className="space-y-2">
          {items.map((c) => (
            <Link key={c.id} to="/clientes/$id" params={{ id: c.id }}>
              <Card className="flex items-center gap-3 active:bg-surface">
                <div className="w-11 h-11 rounded-full bg-surface text-primary font-semibold flex items-center justify-center">
                  {initials(c.name) || <UserRound className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.phone || c.email || "—"}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-30 bg-black/40 flex items-end" onClick={() => setOpen(false)}>
          <form
            onSubmit={create}
            onClick={(e) => e.stopPropagation()}
            className="bg-background w-full max-w-md mx-auto rounded-t-2xl p-5 space-y-4"
          >
            <div className="w-12 h-1 bg-border rounded-full mx-auto" />
            <h2 className="text-lg font-bold">Nova cliente</h2>
            <Field label="Nome completo"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="WhatsApp"><PhoneInput value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} /></Field>
            <Field label="E-mail"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <div className="flex gap-2">
              <Button type="button" variant="outline" full onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" full disabled={busy}>Salvar</Button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
