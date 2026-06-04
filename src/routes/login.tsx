import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button, Input, Field } from "@/components/u";
import { toast } from "sonner";
import { FileText, CalendarCheck, Wallet } from "lucide-react";
import logoMonogram from "@/assets/logo-monogram.svg";
import aestiqLogoAsset from "@/assets/aestiq-logo.png.asset.json";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const GOLD = "#C39A54";
const PETROLEUM = "#0F2C26";
const IVORY = "#FAF8F5";

function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/" });
  }, [user, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vinda de volta!");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName.trim() },
          },
        });
        if (error) throw error;
        toast.success("Cadastro realizado!");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao autenticar";
      toast.error(msg.includes("Invalid") ? "Credenciais inválidas" : msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col md:flex-row" style={{ backgroundColor: IVORY }}>
      {/* Left column — desktop only */}
      <aside
        className="hidden md:flex md:w-1/2 md:flex-col md:items-center md:justify-center md:px-16 md:py-16"
        style={{ backgroundColor: PETROLEUM }}
      >
        <div className="max-w-md w-full flex flex-col items-center">
          <img
            src={aestiqLogoAsset.url}
            alt="AESTIQ"
            className="w-[280px] h-auto object-contain mb-12"
          />
          <p
            className="text-center mb-14 px-2"
            style={{
              color: GOLD,
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontStyle: "italic",
              fontWeight: 500,
              fontSize: "28px",
              lineHeight: 1.3,
            }}
          >
            O essencial da estética,<br />do prontuário ao retorno
          </p>
          <ul className="space-y-6 w-full max-w-sm">
            {[
              { Icon: FileText, label: "Prontuário visual com fotos e mapeamento" },
              { Icon: CalendarCheck, label: "Seus dados são seus, exporte quando quiser" },
              { Icon: Wallet, label: "Financeiro por procedimento, sem planilha" },
            ].map(({ Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-4"
                style={{
                  color: "rgba(250,248,245,0.92)",
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontWeight: 300,
                  fontSize: "16px",
                  lineHeight: 1.5,
                  letterSpacing: "0.01em",
                }}
              >
                <span
                  className="inline-flex w-11 h-11 rounded-full items-center justify-center shrink-0"
                  style={{ backgroundColor: "rgba(195,154,84,0.12)", color: GOLD }}
                >
                  <Icon className="w-5 h-5" strokeWidth={1.5} />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Right column — form */}
      <div className="flex-1 flex flex-col justify-center px-6 md:px-16 py-10" style={{ backgroundColor: IVORY }}>
        <div className="w-full max-w-md md:max-w-[420px] mx-auto">
          {/* Mobile header — logo + slogan */}
          <div className="mb-10 text-center md:hidden">
            <img
              src={aestiqLogoAsset.url}
              alt="AESTIQ"
              className="w-[200px] h-auto object-contain mx-auto mb-5"
            />
            <p
              className="px-4"
              style={{
                color: GOLD,
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontStyle: "italic",
                fontWeight: 500,
                fontSize: "20px",
                lineHeight: 1.35,
              }}
            >
              O essencial da estética,<br />do prontuário ao retorno
            </p>
          </div>

          <h2
            className="text-3xl mb-1"
            style={{ fontFamily: "var(--font-serif)", color: PETROLEUM, fontWeight: 500 }}
          >
            Entrar
          </h2>
          <p className="text-sm text-muted-foreground mb-6">Acesse sua conta para continuar</p>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <Field label="Nome completo">
                <Input type="text" required autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome completo" />
              </Field>
            )}
            <Field label="E-mail">
              <Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
            </Field>
            <Field label="Senha">
              <Input type="password" required minLength={6} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </Field>

            <div className="flex justify-end -mt-2">
              <button
                type="button"
                onClick={async () => {
                  if (!email) { toast.error("Informe seu e-mail para redefinir a senha"); return; }
                  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
                  if (error) toast.error(error.message);
                  else toast.success("E-mail de redefinição enviado");
                }}
                className="text-xs font-medium hover:underline"
                style={{ color: GOLD }}
              >
                Esqueceu sua senha?
              </button>
            </div>

            <Button type="submit" full disabled={busy}>
              {busy ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
            </Button>

            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="block w-full text-sm text-muted-foreground py-2"
            >
              {mode === "login" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
            </button>
          </form>

          {/* Mobile benefits */}
          <div className="md:hidden mt-10 pt-8 border-t" style={{ borderColor: "rgba(15,44,38,0.12)" }}>
            <ul className="space-y-4">
              {[
                { Icon: FileText, label: "Prontuário visual com fotos e mapeamento" },
                { Icon: CalendarCheck, label: "Seus dados são seus, exporte quando quiser" },
                { Icon: Wallet, label: "Financeiro por procedimento, sem planilha" },
              ].map(({ Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-3"
                  style={{
                    color: "#1A1A1A",
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontWeight: 400,
                    fontSize: "14px",
                    lineHeight: 1.5,
                  }}
                >
                  <span
                    className="inline-flex w-9 h-9 rounded-full items-center justify-center shrink-0"
                    style={{ backgroundColor: "rgba(195,154,84,0.14)", color: GOLD }}
                  >
                    <Icon className="w-4 h-4" strokeWidth={1.5} />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
