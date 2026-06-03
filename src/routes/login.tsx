import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button, Input, Field } from "@/components/u";
import { toast } from "sonner";
import { FileText, CalendarCheck, Wallet } from "lucide-react";
import logoAestiq from "@/assets/logo-aestiq.svg";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

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
    <div className="min-h-dvh flex flex-col md:flex-row" style={{ backgroundColor: "#FAFAF9" }}>
      {/* Left column — desktop only */}
      <aside
        className="hidden md:flex md:w-1/2 md:flex-col md:items-center md:justify-center md:px-12 md:py-16 md:text-white"
        style={{ backgroundColor: "#1A2E35" }}
      >
        <div className="max-w-sm w-full">
          <div className="w-20 h-20 rounded-full mb-6 flex items-center justify-center overflow-hidden" style={{ backgroundColor: "#2A9D8F" }}>
            <img src={logoAestiq} alt="AESTIQ" className="w-14 h-14 object-contain" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">AESTIQ</h2>
          <p className="text-sm text-white/70 mt-2 mb-10">
            Gestão para clínicas de estética avançada
          </p>
          <ul className="space-y-4">
            <li className="flex items-center gap-3 text-sm">
              <span className="inline-flex w-9 h-9 rounded-md items-center justify-center shrink-0" style={{ backgroundColor: "#2A9D8F" }}>
                <FileText className="w-4 h-4" />
              </span>
              Prontuário visual com fotos e mapeamento
            </li>
            <li className="flex items-center gap-3 text-sm">
              <span className="inline-flex w-9 h-9 rounded-md items-center justify-center shrink-0" style={{ backgroundColor: "#2A9D8F" }}>
                <CalendarCheck className="w-4 h-4" />
              </span>
              Seus dados são seus, exporte quando quiser
            </li>
            <li className="flex items-center gap-3 text-sm">
              <span className="inline-flex w-9 h-9 rounded-md items-center justify-center shrink-0" style={{ backgroundColor: "#2A9D8F" }}>
                <Wallet className="w-4 h-4" />
              </span>
              Financeiro por procedimento, sem planilha
            </li>
          </ul>
        </div>
      </aside>

      {/* Right column — form */}
      <div className="flex-1 flex flex-col justify-center px-6 md:px-12 py-10 md:bg-white">
        <div className="w-full max-w-md md:max-w-[420px] mx-auto">
          <div className="mb-10 text-center md:hidden">
            <img src={logoAestiq} alt="AESTIQ" className="w-24 h-24 mx-auto mb-4 object-contain" />
            <h1 className="text-3xl font-bold tracking-tight text-dark">AESTIQ</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gestão para clínicas de estética avançada
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <Field label="Nome completo">
                <Input
                  type="text"
                  required
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome completo"
                />
              </Field>
            )}
            <Field label="E-mail">
              <Input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
              />
            </Field>
            <Field label="Senha">
              <Input
                type="password"
                required
                minLength={6}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>

            <div className="flex justify-end -mt-2">
              <button
                type="button"
                onClick={async () => {
                  if (!email) {
                    toast.error("Informe seu e-mail para redefinir a senha");
                    return;
                  }
                  const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin,
                  });
                  if (error) toast.error(error.message);
                  else toast.success("E-mail de redefinição enviado");
                }}
                className="text-xs font-medium hover:underline"
                style={{ color: "#2A9D8F" }}
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
        </div>
      </div>
    </div>
  );
}
