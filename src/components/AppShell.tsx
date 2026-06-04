import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { Calendar, Home, Users, Bell, LogOut, Settings, Wallet, Cake } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { useLogoUrl, useClinicName } from "@/lib/useLogo";
import { supabase } from "@/integrations/supabase/client";
import { upcomingBirthdayDays } from "@/lib/birthday";
import logoAestiq from "@/assets/logo-aestiq.svg";
import logoMonogram from "@/assets/logo-monogram.svg";

const nav = [
  { to: "/", label: "Hoje", icon: Home },
  { to: "/agenda", label: "Agenda", icon: Calendar },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/retornos", label: "Retornos", icon: Bell },
] as const;

const desktopNav = [...nav, { to: "/configuracoes", label: "Configurações", icon: Settings }] as const;

export function AppShell({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  const { signOut, user } = useAuth();
  const router = useRouter();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const logoUrl = useLogoUrl();
  const clinicName = useClinicName();
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

  const logoNode = (
    <span className="inline-flex items-center justify-center w-9 h-9 overflow-hidden" style={{ color: "#C39A54" }}>
      {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" /> : <img src={logoMonogram} alt="" className="w-full h-full object-contain" />}
    </span>
  );

  return (
    <div className="min-h-dvh bg-background flex flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-60 md:z-30"
        style={{ backgroundColor: "#0F2C26", color: "rgba(250,248,245,0.7)" }}
      >
        <div className="flex flex-col items-center gap-2 px-5 py-6 border-b" style={{ borderColor: "rgba(195,154,84,0.18)" }}>
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-12 w-auto object-contain" />
          ) : (
            <img
              src={new URL("../assets/logo-aestiq.svg", import.meta.url).href}
              alt="AESTIQ"
              className="h-14 w-auto object-contain"
              style={{ color: "#C39A54", filter: "none" }}
            />
          )}
          {clinicName && (
            <span className="text-[12px] truncate max-w-full text-center" style={{ color: "rgba(250,248,245,0.55)" }}>
              {clinicName}
            </span>
          )}
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {desktopNav.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? path === "/" : path.startsWith(to);
            const showCake = to === "/retornos" && hasBirthdays;
            return (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors"
                style={
                  active
                    ? { color: "#C39A54", backgroundColor: "rgba(195,154,84,0.10)" }
                    : { color: "rgba(250,248,245,0.7)" }
                }
              >
                <span className="relative">
                  <Icon className="w-5 h-5" />
                  {showCake && (
                    <span className="absolute -top-1.5 -right-2 inline-flex items-center justify-center w-4 h-4 rounded-full" style={{ backgroundColor: "#C39A54", color: "#0F2C26" }}>
                      <Cake className="w-2.5 h-2.5" />
                    </span>
                  )}
                </span>
                {label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={async () => { await signOut(); router.navigate({ to: "/login" }); }}
          className="m-3 flex items-center gap-3 px-3 py-2 rounded-md text-sm"
          style={{ color: "rgba(250,248,245,0.7)" }}
        >
          <LogOut className="w-5 h-5" /> Sair
        </button>
      </aside>

      <div className="flex-1 flex flex-col md:ml-60">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-background border-b border-border">
          <div className="mx-auto w-full max-w-[1100px] flex items-center justify-between px-4 md:px-8 h-14">
            <div className="flex items-center gap-2">
              <span className="md:hidden">{logoNode}</span>
              <h1 className="text-base font-semibold tracking-tight">{title}</h1>
            </div>
            <div className="flex items-center gap-1">
              {right}
              {isHome && (
                <Link to="/configuracoes" className="p-2 text-muted-foreground hover:text-foreground md:hidden" aria-label="Configurações">
                  <Settings className="w-5 h-5" />
                </Link>
              )}
              <button
                onClick={async () => { await signOut(); router.navigate({ to: "/login" }); }}
                className="p-2 text-muted-foreground hover:text-foreground md:hidden"
                aria-label="Sair"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 mx-auto w-full max-w-[1100px] px-4 md:px-8 py-4 md:py-8 pb-28 md:pb-12">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-20 bg-background border-t border-border md:hidden">
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
