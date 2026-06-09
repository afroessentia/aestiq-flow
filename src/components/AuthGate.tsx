import { Navigate, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

const ACTIVE_STATUSES = ["active", "trialing"];

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [subStatus, setSubStatus] = useState<"loading" | "active" | "inactive">("loading");

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setSubStatus("loading");
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setSubStatus(data && ACTIVE_STATUSES.includes(data.status ?? "") ? "active" : "inactive");
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (loading || (user && subStatus === "loading")) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-muted-foreground text-sm">
        Carregando...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  if (subStatus === "inactive" && location.pathname !== "/assinar") {
    return <Navigate to="/assinar" />;
  }
  return <>{children}</>;
}
