import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Plus, Trash2, Upload, Save, Download, FileText } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { Button, Card, Field, Input } from "@/components/u";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { PhoneInput } from "@/components/PhoneInput";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { resolveAssetUrl } from "@/lib/useLogo";
import { toast } from "sonner";
import jsPDF from "jspdf";

export const Route = createFileRoute("/configuracoes")({
  component: () => (<AuthGate><Settings /></AuthGate>),
});

const DAYS = [
  { wd: 1, label: "Segunda" },
  { wd: 2, label: "Terça" },
  { wd: 3, label: "Quarta" },
  { wd: 4, label: "Quinta" },
  { wd: 5, label: "Sexta" },
  { wd: 6, label: "Sábado" },
];

const PIX_TYPES = [
  { v: "cpf", label: "CPF" },
  { v: "cnpj", label: "CNPJ" },
  { v: "email", label: "E-mail" },
  { v: "telefone", label: "Telefone" },
  { v: "aleatoria", label: "Chave aleatória" },
];

const REG_TYPES = ["CRM", "CRBio", "CRF", "CREFITO", "COREN", "Outro"];

function Settings() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="mx-auto max-w-md md:max-w-[900px] flex items-center px-4 md:px-8 h-14 gap-2">
          <Link to="/" className="p-2 -ml-2"><ChevronLeft className="w-5 h-5" /></Link>
          <h1 className="text-base font-semibold">Configurações</h1>
        </div>
      </header>
      <main className="mx-auto max-w-md md:max-w-[900px] px-4 md:px-8 py-4 md:py-8 pb-12">
        <Tabs defaultValue="clinica" className="w-full md:flex md:gap-8 md:items-start">
          <TabsList className="grid grid-cols-4 w-full h-auto md:flex md:flex-col md:w-56 md:shrink-0 md:bg-transparent md:p-0 md:gap-1">
            <TabsTrigger value="clinica" className="text-xs md:text-sm md:w-full md:justify-start md:py-2.5">Clínica</TabsTrigger>
            <TabsTrigger value="procedimentos" className="text-xs md:text-sm md:w-full md:justify-start md:py-2.5">Procedimentos</TabsTrigger>
            <TabsTrigger value="horarios" className="text-xs md:text-sm md:w-full md:justify-start md:py-2.5">Horários</TabsTrigger>
            <TabsTrigger value="perfil" className="text-xs md:text-sm md:w-full md:justify-start md:py-2.5">Perfil</TabsTrigger>
          </TabsList>
          <div className="md:flex-1 md:min-w-0">
            <TabsContent value="clinica" className="mt-4 md:mt-0"><ClinicaTab /></TabsContent>
            <TabsContent value="procedimentos" className="mt-4 md:mt-0"><ProceduresTab /></TabsContent>
            <TabsContent value="horarios" className="mt-4 md:mt-0"><HoursTab /></TabsContent>
            <TabsContent value="perfil" className="mt-4 md:mt-0"><PerfilTab /></TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
}

/* ---------------- CLÍNICA ---------------- */
function ClinicaTab() {
  const { user } = useAuth();
  const [clinic_name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [pixType, setPixType] = useState("email");
  const [pixKey, setPixKey] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("clinic_settings" as never)
        .select("*").eq("user_id", user.id).maybeSingle();
      const d = (data ?? {}) as Record<string, string | null>;
      setName(d.clinic_name ?? "");
      setCnpj(d.cnpj ?? "");
      setAddress(d.address ?? "");
      setPhone(d.phone ?? "");
      setWhatsapp(d.whatsapp ?? "");
      setLogoPath(d.logo_url ?? null);
      setPixType(d.pix_key_type ?? "email");
      setPixKey(d.pix_key ?? "");
      const u = await resolveAssetUrl(d.logo_url ?? null);
      setLogoUrl(u);
    })();
  }, [user?.id]);

  const onLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const ext = file.name.split(".").pop() || "png";
    const path = `${user.id}/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("clinic-assets").upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    setLogoPath(path);
    const u = await resolveAssetUrl(path);
    setLogoUrl(u);
    toast.success("Logo carregada (salve para confirmar)");
  };

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("clinic_settings" as never).upsert({
      user_id: user.id,
      clinic_name, cnpj, address, phone, whatsapp,
      logo_url: logoPath,
      pix_key_type: pixType,
      pix_key: pixKey,
      updated_at: new Date().toISOString(),
    } as never);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Clínica salva");
  };

  return (
    <div className="space-y-4">
      <Card className="flex items-center gap-3">
        <div className="w-16 h-16 rounded-lg bg-surface flex items-center justify-center overflow-hidden border border-border">
          {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" /> : <span className="text-2xl font-bold text-primary">A</span>}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Logo da clínica</p>
          <p className="text-xs text-muted-foreground">Substitui o ícone padrão em todo o app.</p>
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={onLogoChange} className="hidden" />
        <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload className="w-4 h-4" />
        </Button>
      </Card>

      <Field label="Nome da clínica"><Input value={clinic_name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="CNPJ"><Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" /></Field>
      <Field label="Endereço"><Input value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
      <Field label="Telefone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 0000-0000" /></Field>
      <Field label="WhatsApp Business">
        <PhoneInput value={whatsapp} onChange={setWhatsapp} />
      </Field>

      <Card className="space-y-3">
        <p className="text-sm font-semibold">Chave Pix</p>
        <Field label="Tipo">
          <select value={pixType} onChange={(e) => setPixType(e.target.value)}
            className="w-full h-12 rounded-lg border border-border bg-card px-3 text-base">
            {PIX_TYPES.map((p) => <option key={p.v} value={p.v}>{p.label}</option>)}
          </select>
        </Field>
        <Field label="Chave"><Input value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder="Digite a chave" /></Field>
      </Card>

      <Button full onClick={save} disabled={busy}><Save className="w-4 h-4" /> {busy ? "Salvando..." : "Salvar"}</Button>

      <ExportData userId={user?.id ?? null} />
    </div>
  );
}

/* ---------------- EXPORT DATA ---------------- */
function csvEscape(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(filename: string, headers: string[], rows: (string | number | null)[][]) {
  const lines = [headers.join(","), ...rows.map((r) => r.map(csvEscape).join(","))];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function ExportData({ userId }: { userId: string | null }) {
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const exportClients = async () => {
    if (!userId) return;
    setBusyKey("clients");
    try {
      const { data: clients, error } = await supabase
        .from("clients")
        .select("id,name,phone,email,birth_date,notes,lgpd_consent_at")
        .order("name");
      if (error) throw error;
      const ids = (clients ?? []).map((c) => c.id);
      const allergiesMap: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: ans } = await supabase
          .from("anamnesis").select("client_id,allergies").in("client_id", ids);
        (ans ?? []).forEach((a) => { if (a.allergies) allergiesMap[a.client_id] = a.allergies; });
      }
      downloadCsv(
        "clientes.csv",
        ["Nome", "WhatsApp", "E-mail", "Data de nascimento", "Alergias", "Consentimento LGPD"],
        (clients ?? []).map((c) => [
          c.name,
          c.phone ?? "",
          c.email ?? "",
          c.birth_date ?? "",
          allergiesMap[c.id] ?? c.notes ?? "",
          c.lgpd_consent_at ? new Date(c.lgpd_consent_at).toLocaleString("pt-BR") : "",
        ]),
      );
      toast.success("Clientes exportados");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao exportar");
    } finally {
      setBusyKey(null);
    }
  };

  const exportFinancial = async () => {
    if (!userId) return;
    setBusyKey("fin");
    try {
      const { data: appts, error } = await supabase
        .from("appointments")
        .select("id,client_name,procedure,date,total_amount,deposit_amount")
        .order("date", { ascending: false });
      if (error) throw error;
      const ids = (appts ?? []).map((a) => a.id);
      const entriesMap: Record<string, { status: string; payment_method: string | null }> = {};
      if (ids.length > 0) {
        const { data: ens } = await supabase
          .from("financial_entries").select("appointment_id,status,payment_method").in("appointment_id", ids);
        (ens ?? []).forEach((e) => { if (e.appointment_id) entriesMap[e.appointment_id] = { status: e.status, payment_method: e.payment_method }; });
      }
      const methodLabel: Record<string, string> = { pix: "Pix", dinheiro: "Dinheiro", cartao: "Cartão", outro: "Outro" };
      const statusLabel: Record<string, string> = { pago: "Pago", pendente: "Pendente" };
      downloadCsv(
        "financeiro.csv",
        ["Cliente", "Procedimento", "Data", "Valor total", "Status pagamento", "Forma de pagamento"],
        (appts ?? []).map((a) => {
          const en = entriesMap[a.id];
          const total = a.total_amount ?? a.deposit_amount ?? 0;
          return [
            a.client_name,
            a.procedure,
            a.date,
            Number(total).toFixed(2).replace(".", ","),
            en ? (statusLabel[en.status] ?? en.status) : "Pendente",
            en?.payment_method ? (methodLabel[en.payment_method] ?? en.payment_method) : "",
          ];
        }),
      );
      toast.success("Financeiro exportado");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao exportar");
    } finally {
      setBusyKey(null);
    }
  };

  const exportFinancialPDF = async () => {
    if (!userId) return;
    setBusyKey("pdf");
    try {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();
      const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(y, m + 1, 0).getDate();
      const end = `${y}-${String(m + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      const monthLabel = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

      const { data: clinic } = await supabase
        .from("clinic_settings" as never).select("clinic_name,logo_url").eq("user_id", userId).maybeSingle();
      const c = (clinic ?? {}) as { clinic_name?: string | null; logo_url?: string | null };
      const clinicName = c.clinic_name || "Clínica";
      const logoUrl = await resolveAssetUrl(c.logo_url ?? null);

      const { data: appts } = await supabase
        .from("appointments")
        .select("id,client_name,procedure,date,status,pix_status,total_amount,deposit_amount")
        .in("status", ["realizado", "noshow"])
        .gte("date", start).lte("date", end);
      const { data: entries } = await supabase
        .from("financial_entries").select("*").gte("entry_date", start).lte("entry_date", end);

      const byAppt: Record<string, { status: string; payment_method: string | null; amount: number }> = {};
      (entries ?? []).forEach((e) => {
        if (e.appointment_id) byAppt[e.appointment_id] = { status: e.status, payment_method: e.payment_method, amount: Number(e.amount) };
      });

      const STATUS: Record<string, string> = {
        pendente: "Pendente", sinal_pago: "Sinal pago", pago_totalmente: "Pago totalmente",
        noshow: "No-show", pago: "Pago totalmente",
      };
      const METHOD: Record<string, string> = { pix: "Pix", dinheiro: "Dinheiro", cartao: "Cartão", outro: "Outro" };

      interface Tx { client: string; procedure: string; date: string; total: number; method: string; status: string; isNoShow: boolean; received: number; pending: number; }
      const txs: Tx[] = [];
      (appts ?? []).forEach((a) => {
        const ex = byAppt[a.id];
        const total = Number(a.total_amount ?? ex?.amount ?? 0);
        const deposit = Number(a.deposit_amount ?? 0);
        let status: string = ex?.status ?? "pendente";
        if (a.status === "noshow") status = "noshow";
        else if (!ex && a.pix_status === "pago") status = "sinal_pago";
        const isNoShow = status === "noshow";
        let received = 0; let pending = 0;
        if (status === "pago_totalmente" || status === "pago") received = total;
        else if (status === "sinal_pago") { received = deposit; pending = Math.max(0, total - deposit); }
        else if (status === "pendente") pending = total;
        txs.push({
          client: a.client_name, procedure: a.procedure, date: a.date,
          total, method: ex?.payment_method ? (METHOD[ex.payment_method] ?? ex.payment_method) : "—",
          status: STATUS[status] ?? status, isNoShow, received, pending,
        });
      });
      (entries ?? []).forEach((en) => {
        if (en.appointment_id && (appts ?? []).some((a) => a.id === en.appointment_id)) return;
        const total = Number(en.amount);
        const status = en.status;
        const isNoShow = status === "noshow";
        let received = 0; let pending = 0;
        if (status === "pago_totalmente" || status === "pago") received = total;
        else if (status === "pendente") pending = total;
        txs.push({
          client: en.client_name, procedure: en.procedure, date: en.entry_date,
          total, method: en.payment_method ? (METHOD[en.payment_method] ?? en.payment_method) : "—",
          status: STATUS[status] ?? status, isNoShow, received, pending,
        });
      });

      txs.sort((a, b) => (a.date < b.date ? -1 : 1));

      const totalRecebido = txs.reduce((s, t) => s + t.received, 0);
      const totalPendente = txs.reduce((s, t) => s + t.pending, 0);
      const totalAtend = txs.length;
      const noShowCount = txs.filter((t) => t.isNoShow).length;
      const noShowRate = totalAtend > 0 ? (noShowCount / totalAtend) * 100 : 0;

      const BRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      const fmtD = (s: string) => { const [yy, mm, dd] = s.split("-"); return `${dd}/${mm}/${yy}`; };

      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 40;
      let y2 = margin;

      if (logoUrl) {
        try {
          const res = await fetch(logoUrl);
          const blob = await res.blob();
          const dataUrl: string = await new Promise((resolve) => {
            const fr = new FileReader();
            fr.onload = () => resolve(fr.result as string);
            fr.readAsDataURL(blob);
          });
          pdf.addImage(dataUrl, "PNG", margin, y2, 50, 50);
        } catch { /* ignore */ }
      }
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(18);
      pdf.text(clinicName, margin + 60, y2 + 22);
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(11);
      pdf.text("Relatório financeiro", margin + 60, y2 + 40);
      y2 += 70;

      pdf.setFontSize(10); pdf.setTextColor(80);
      pdf.text(`Período: ${monthLabel}`, margin, y2);
      pdf.text(`Emitido em: ${now.toLocaleDateString("pt-BR")}`, pageW - margin, y2, { align: "right" });
      y2 += 20;

      pdf.setDrawColor(200); pdf.line(margin, y2, pageW - margin, y2);
      y2 += 18;

      pdf.setTextColor(20); pdf.setFont("helvetica", "bold"); pdf.setFontSize(12);
      pdf.text("Resumo", margin, y2); y2 += 16;
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(11);
      const lines = [
        `Receita total recebida: ${BRL(totalRecebido)}`,
        `Total pendente: ${BRL(totalPendente)}`,
        `Número de atendimentos: ${totalAtend}`,
        `Taxa de no-show: ${noShowRate.toFixed(1)}% (${noShowCount}/${totalAtend})`,
      ];
      lines.forEach((l) => { pdf.text(l, margin, y2); y2 += 16; });

      y2 += 10;
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(12);
      pdf.text("Transações", margin, y2); y2 += 14;

      const cols = [
        { h: "Cliente", w: 110 },
        { h: "Procedimento", w: 110 },
        { h: "Data", w: 60 },
        { h: "Valor", w: 70 },
        { h: "Pagamento", w: 70 },
        { h: "Status", w: 95 },
      ];
      const drawHeader = () => {
        pdf.setFillColor(240, 240, 240); pdf.rect(margin, y2, pageW - margin * 2, 18, "F");
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(9); pdf.setTextColor(20);
        let x = margin + 4;
        cols.forEach((c) => { pdf.text(c.h, x, y2 + 12); x += c.w; });
        y2 += 18;
      };
      drawHeader();
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(9);

      txs.forEach((t) => {
        if (y2 > pageH - margin - 30) {
          pdf.addPage(); y2 = margin; drawHeader();
          pdf.setFont("helvetica", "normal"); pdf.setFontSize(9);
        }
        let x = margin + 4;
        const cells = [t.client, t.procedure, fmtD(t.date), BRL(t.total), t.method, t.status];
        cells.forEach((val, i) => {
          const txt = pdf.splitTextToSize(String(val), cols[i].w - 6)[0] ?? "";
          pdf.text(txt, x, y2 + 12);
          x += cols[i].w;
        });
        pdf.setDrawColor(230); pdf.line(margin, y2 + 16, pageW - margin, y2 + 16);
        y2 += 18;
      });

      pdf.save(`relatorio-financeiro-${y}-${String(m + 1).padStart(2, "0")}.pdf`);
      toast.success("Relatório gerado");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar PDF");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <Card className="space-y-3">
      <p className="text-sm font-semibold">Exportar dados</p>
      <Button variant="secondary" full onClick={exportClients} disabled={busyKey === "clients"}>
        <Download className="w-4 h-4" /> {busyKey === "clients" ? "Exportando..." : "Exportar clientes (CSV)"}
      </Button>
      <Button variant="secondary" full onClick={exportFinancial} disabled={busyKey === "fin"}>
        <Download className="w-4 h-4" /> {busyKey === "fin" ? "Exportando..." : "Exportar financeiro (CSV)"}
      </Button>
      <Button variant="secondary" full onClick={exportFinancialPDF} disabled={busyKey === "pdf"}>
        <FileText className="w-4 h-4" /> {busyKey === "pdf" ? "Gerando..." : "Exportar relatório financeiro (PDF)"}
      </Button>
    </Card>
  );
}


/* ---------------- PROCEDIMENTOS ---------------- */
interface Proc { id: string; name: string; default_price: number | null; }
function ProceduresTab() {
  const { user } = useAuth();
  const [items, setItems] = useState<Proc[]>([]);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("clinic_procedures" as never)
      .select("id,name,default_price").eq("user_id", user.id).order("name");
    setItems((data as unknown as Proc[]) ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const add = async () => {
    if (!user || !newName.trim()) return;
    const price = Number(newPrice.replace(",", ".")) || null;
    const { error } = await supabase.from("clinic_procedures" as never).insert({
      user_id: user.id, name: newName.trim(), default_price: price,
    } as never);
    if (error) return toast.error(error.message);
    setNewName(""); setNewPrice("");
    load();
  };
  const remove = async (id: string) => {
    await supabase.from("clinic_procedures" as never).delete().eq("id", id);
    load();
  };
  const updateRow = async (id: string, patch: Partial<Proc>) => {
    setItems((cur) => cur.map((p) => p.id === id ? { ...p, ...patch } : p));
  };
  const saveAll = async () => {
    setBusy(true);
    for (const p of items) {
      await supabase.from("clinic_procedures" as never)
        .update({ name: p.name, default_price: p.default_price } as never).eq("id", p.id);
    }
    setBusy(false);
    toast.success("Procedimentos salvos");
  };

  return (
    <div className="space-y-3">
      <Card className="space-y-2">
        <p className="text-sm font-semibold">Adicionar procedimento</p>
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome" />
        <Input inputMode="decimal" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="Preço (R$)" />
        <Button onClick={add} full variant="secondary"><Plus className="w-4 h-4" /> Adicionar</Button>
      </Card>

      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum procedimento cadastrado</p>
        ) : items.map((p) => (
          <Card key={p.id} className="space-y-2">
            <div className="flex gap-2">
              <Input value={p.name} onChange={(e) => updateRow(p.id, { name: e.target.value })} />
              <button onClick={() => remove(p.id)} className="p-2 text-destructive" aria-label="Excluir">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            <Input
              inputMode="decimal"
              value={p.default_price ?? ""}
              onChange={(e) => updateRow(p.id, { default_price: Number(e.target.value.replace(",", ".")) || null })}
              placeholder="Preço (R$)"
            />
          </Card>
        ))}
      </div>

      {items.length > 0 && (
        <Button full onClick={saveAll} disabled={busy}><Save className="w-4 h-4" /> {busy ? "Salvando..." : "Salvar alterações"}</Button>
      )}
    </div>
  );
}

/* ---------------- HORÁRIOS ---------------- */
interface WH { weekday: number; enabled: boolean; start_time: string | null; end_time: string | null; }
function HoursTab() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Record<number, WH>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("work_hours" as never)
        .select("weekday,enabled,start_time,end_time").eq("user_id", user.id);
      const map: Record<number, WH> = {};
      DAYS.forEach((d) => {
        map[d.wd] = { weekday: d.wd, enabled: false, start_time: "09:00", end_time: "18:00" };
      });
      ((data as unknown as WH[]) ?? []).forEach((r) => {
        map[r.weekday] = { ...r, start_time: r.start_time?.slice(0, 5) ?? "09:00", end_time: r.end_time?.slice(0, 5) ?? "18:00" };
      });
      setRows(map);
    })();
  }, [user?.id]);

  const update = (wd: number, patch: Partial<WH>) => {
    setRows((r) => ({ ...r, [wd]: { ...r[wd], ...patch } }));
  };

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const payload = DAYS.map((d) => ({
      user_id: user.id,
      weekday: d.wd,
      enabled: rows[d.wd]?.enabled ?? false,
      start_time: rows[d.wd]?.start_time || null,
      end_time: rows[d.wd]?.end_time || null,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from("work_hours" as never)
      .upsert(payload as never, { onConflict: "user_id,weekday" } as never);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Horários salvos");
  };

  return (
    <div className="space-y-3">
      {DAYS.map((d) => {
        const r = rows[d.wd] ?? { weekday: d.wd, enabled: false, start_time: "09:00", end_time: "18:00" };
        return (
          <Card key={d.wd} className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-dark">{d.label}</p>
              <Switch checked={r.enabled} onCheckedChange={(v) => update(d.wd, { enabled: v })} />
            </div>
            {r.enabled && (
              <div className="grid grid-cols-2 gap-2">
                <Field label="Início">
                  <Input type="time" value={r.start_time ?? ""} onChange={(e) => update(d.wd, { start_time: e.target.value })} />
                </Field>
                <Field label="Fim">
                  <Input type="time" value={r.end_time ?? ""} onChange={(e) => update(d.wd, { end_time: e.target.value })} />
                </Field>
              </div>
            )}
          </Card>
        );
      })}
      <Button full onClick={save} disabled={busy}><Save className="w-4 h-4" /> {busy ? "Salvando..." : "Salvar"}</Button>
    </div>
  );
}

/* ---------------- PERFIL ---------------- */
function PerfilTab() {
  const { user } = useAuth();
  const [full_name, setFullName] = useState("");
  const [regType, setRegType] = useState("CRM");
  const [regNum, setRegNum] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("professional_settings" as never)
        .select("*").eq("user_id", user.id).maybeSingle();
      const d = (data ?? {}) as Record<string, string | null>;
      setFullName(d.full_name ?? "");
      setRegType(d.registration_type ?? "CRM");
      setRegNum(d.registration_number ?? "");
      setSpecialty(d.specialty ?? "");
      setPhotoPath(d.photo_url ?? null);
      setPhotoUrl(await resolveAssetUrl(d.photo_url ?? null));
    })();
  }, [user?.id]);

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const ext = file.name.split(".").pop() || "png";
    const path = `${user.id}/profile-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("clinic-assets").upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    setPhotoPath(path);
    setPhotoUrl(await resolveAssetUrl(path));
  };

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const { error: e1 } = await supabase.from("professional_settings" as never).upsert({
      user_id: user.id,
      full_name, registration_type: regType, registration_number: regNum,
      specialty, photo_url: photoPath,
      updated_at: new Date().toISOString(),
    } as never);
    // Sync to auth metadata so dashboard greeting reflects the change
    if (full_name.trim()) {
      await supabase.auth.updateUser({ data: { full_name: full_name.trim() } });
    }
    setBusy(false);
    if (e1) return toast.error(e1.message);
    toast.success("Perfil salvo");
  };

  return (
    <div className="space-y-4">
      <Card className="flex items-center gap-3">
        <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center overflow-hidden border border-border">
          {photoUrl ? <img src={photoUrl} alt="Foto" className="w-full h-full object-cover" /> : <span className="text-xl font-bold text-primary">{(full_name || "?").slice(0,1).toUpperCase()}</span>}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Foto de perfil</p>
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={onPhoto} className="hidden" />
        <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload className="w-4 h-4" />
        </Button>
      </Card>

      <Field label="Nome completo"><Input value={full_name} onChange={(e) => setFullName(e.target.value)} /></Field>
      <div className="grid grid-cols-[120px_1fr] gap-2">
        <Field label="Registro">
          <select value={regType} onChange={(e) => setRegType(e.target.value)}
            className="w-full h-12 rounded-lg border border-border bg-card px-3 text-base">
            {REG_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Número"><Input value={regNum} onChange={(e) => setRegNum(e.target.value)} /></Field>
      </div>
      <Field label="Especialidade"><Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} /></Field>

      <Button full onClick={save} disabled={busy}><Save className="w-4 h-4" /> {busy ? "Salvando..." : "Salvar"}</Button>
    </div>
  );
}
