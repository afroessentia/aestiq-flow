import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { Calendar, Home, Users, Bell, LogOut, Settings, Wallet, Cake } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { useLogoUrl } from "@/lib/useLogo";
import { supabase } from "@/integrations/supabase/client";
import { upcomingBirthdayDays } from "@/lib/birthday";

const nav = [
  { to: "/", label: "Hoje", icon: Home },
  { to: "/agenda", label: "Agenda", icon: Calendar },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/retornos", label: "Retornos", icon: Bell },
] as const;

export function AppShell({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  const { signOut, user } = useAuth();
  const router = useRouter();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const logoUrl = useLogoUrl();
  const isHome = path === "/";
  const [hasBirthdays, setHasBirthdays] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("clients").select("birth_date").not("birth_date", "is", null).then(({ data }) => {
      const any = ((data as { birth_date: string | null }[]) || []).some(
        (c) => c.birth_date && upcomingBirthdayDays(c.birth_date) !== null,
      );
      setHasBirthdays(any);
    });
  }, [user, path]);

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <header className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="mx-auto max-w-md flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-primary text-primary-foreground font-bold text-sm overflow-hidden">
              {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" /> : "A"}
            </span>
            <h1 className="text-base font-semibold tracking-tight">{title}</h1>
          </div>
          <div className="flex items-center gap-1">
            {right}
            {isHome && (
              <Link to="/configuracoes" className="p-2 text-muted-foreground hover:text-foreground" aria-label="Configurações">
                <Settings className="w-5 h-5" />
              </Link>
            )}
            <button
              onClick={async () => { await signOut(); router.navigate({ to: "/login" }); }}
              className="p-2 text-muted-foreground hover:text-foreground"
              aria-label="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-md px-4 py-4 pb-28">
        {children}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-20 bg-background border-t border-border">
        <div className="mx-auto max-w-md grid grid-cols-5">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? path === "/" : path.startsWith(to);
            const showCake = to === "/retornos" && hasBirthdays;
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center justify-center gap-1 py-3 text-[11px] ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <span className="relative">
                  <Icon className="w-5 h-5" />
                  {showCake && (
                    <span className="absolute -top-1.5 -right-2 inline-flex items-center justify-center w-4 h-4 rounded-full bg-accent text-accent-foreground">
                      <Cake className="w-2.5 h-2.5" />
                    </span>
                  )}
                </span>
                <span className="font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
