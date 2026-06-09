// Stripe webhook handler — updates public.subscriptions
// Events handled:
//   customer.subscription.created
//   customer.subscription.updated
//   customer.subscription.deleted
//   invoice.payment_failed

import Stripe from "https://esm.sh/stripe@16.12.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, stripe-signature",
};

async function upsertSubscription(sub: Stripe.Subscription, statusOverride?: string) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  // Resolve user_id: prefer existing row mapping, fallback to customer metadata
  let userId: string | null = null;
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (existing?.user_id) {
    userId = existing.user_id;
  } else {
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer.deleted) {
      userId = (customer.metadata?.user_id as string | undefined) ?? null;
    }
  }

  if (!userId) {
    console.error("No user_id found for customer", customerId);
    return;
  }

  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      status: statusOverride ?? sub.status,
      price_id: sub.items.data[0]?.price.id ?? null,
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) console.error("upsert error:", error);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("Signature verification failed:", err);
    return new Response("Invalid signature", { status: 401 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await upsertSubscription(event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
          await upsertSubscription(sub, "past_due");
        }
        break;
      }
      default:
        console.log("Unhandled event:", event.type);
    }
  } catch (err) {
    console.error("Handler error:", err);
    return new Response("Handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
});
