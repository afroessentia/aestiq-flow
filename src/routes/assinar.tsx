import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/assinar")({
  component: AssinarPage,
});

const ACTIVE_STATUSES = ["active", "trialing"];
const STRIPE_CHECKOUT_URL =
  import.meta.env.VITE_STRIPE_CHECKOUT_URL || "https://buy.stripe.com/REPLACE_WITH_YOUR_PAYMENT_LINK";

function AssinarPage() {
  const { user, loading } = useAuth();
  const [check, setCheck] = useState<"loading" | "active" | "inactive">("loading");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setCheck(data && ACTIVE_STATUSES.includes(data.status ?? "") ? "active" : "inactive");
      });
  }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (check === "active") return <Navigate to="/dashboard" />;

  return (
    <div className="min-h-dvh flex items-center justify-center px-6 bg-background">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-3xl font-serif" style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
          Ative sua assinatura
        </h1>
        <p className="text-muted-foreground">
          Para acessar o Aestiq, você precisa de uma assinatura ativa.
        </p>
        <Button asChild className="w-full">
          <a
            href={`${STRIPE_CHECKOUT_URL}${STRIPE_CHECKOUT_URL.includes("?") ? "&" : "?"}client_reference_id=${encodeURIComponent(user.id)}&prefilled_email=${encodeURIComponent(user.email ?? "")}`}
            target="_blank"
            rel="noreferrer"
          >
            Assinar agora
          </a>
        </Button>
        <p className="text-xs text-muted-foreground">
          Após o pagamento, faça login novamente para liberar o acesso.
        </p>
      </div>
    </div>
  );
}
