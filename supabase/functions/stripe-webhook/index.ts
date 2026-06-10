// Stripe webhook handler — updates public.subscriptions
// Events handled:
//   checkout.session.completed
//   customer.subscription.created/updated/deleted
//   invoice.payment_failed
// Also logs every received event to public.webhook_events for debugging.

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

async function logEvent(params: {
  event_id?: string | null;
  event_type?: string | null;
  status: string;
  error_message?: string | null;
  payload?: unknown;
}) {
  try {
    await supabase.from("webhook_events").insert({
      source: "stripe",
      event_id: params.event_id ?? null,
      event_type: params.event_type ?? null,
      status: params.status,
      error_message: params.error_message ?? null,
      payload: params.payload ?? null,
    });
  } catch (e) {
    console.error("Failed to log webhook event:", e);
  }
}

async function upsertSubscription(sub: Stripe.Subscription, statusOverride?: string) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

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
    throw new Error(`No user_id found for customer ${customerId}`);
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
  if (error) throw new Error(`upsert error: ${error.message}`);
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
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Signature verification failed:", msg);
    await logEvent({ status: "signature_failed", error_message: msg, payload: { body: body.slice(0, 2000) } });
    return new Response("Invalid signature", { status: 401 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id ?? (session.metadata?.user_id as string | undefined);
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        if (userId && customerId) {
          await stripe.customers.update(customerId, { metadata: { user_id: userId } });
        }
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          await upsertSubscription(sub);
        }
        break;
      }
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
        await logEvent({ event_id: event.id, event_type: event.type, status: "ignored", payload: event });
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "content-type": "application/json" },
        });
    }

    await logEvent({ event_id: event.id, event_type: event.type, status: "processed", payload: event });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("Handler error:", msg);
    await logEvent({
      event_id: event.id,
      event_type: event.type,
      status: "error",
      error_message: stack ? `${msg}\n${stack}` : msg,
      payload: event,
    });
    return new Response("Handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
});
