import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { Calendar, Home, Users, Bell, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";

const nav = [
  { to: "/", label: "Hoje", icon: Home },
  { to: "/agenda", label: "Agenda", icon: Calendar },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/retornos", label: "Retornos", icon: Bell },
];

export function AppShell({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  const { signOut } = useAuth();
  const router = useRouter();
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <header className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="mx-auto max-w-md flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-primary text-primary-foreground font-bold text-sm">A</span>
            <h1 className="text-base font-semibold tracking-tight">{title}</h1>
          </div>
          <div className="flex items-center gap-1">
            {right}
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
        <div className="mx-auto max-w-md grid grid-cols-4">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? path === "/" : path.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center justify-center gap-1 py-3 text-xs ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
