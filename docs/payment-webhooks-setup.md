# Payment webhooks — setup

The storefront fulfils orders two ways:

1. **Redirect-verify** — the customer's browser calls `/api/verify-payment`
   (Paystack) or lands on `/api/stripe/confirm` (Stripe) after paying.
2. **Webhook** — Paystack / Stripe server-to-server POST to
   `/api/webhooks/paystack` and `/api/webhooks/stripe`.

Both paths call `fulfillOrder`, which is **idempotent**: the first one to
arrive wins and creates the Medusa order; the second one sees the
`processedPayment` lock in Sanity and silently returns. So enabling the
webhook never produces duplicate orders.

Without the webhook, ~1–3% of real-world payments never become orders
because the browser dies between payment success and the verify call.

---

## Paystack

1. **Paystack dashboard → Settings → API Keys & Webhooks**
2. **Webhook URL:** `https://impactperfumes.com/api/webhooks/paystack`
   (or the Vercel domain until the custom domain is attached)
3. **Authentication:** uses the same `PAYSTACK_SECRET_KEY` already on
   Vercel — Paystack signs requests with HMAC-SHA512 of the raw body
   using this key. No extra env var.
4. **Events:** Paystack sends all events. The handler only acts on
   `charge.success` and logs `charge.failed` / `refund.processed`.

To test:
```
# In Paystack dashboard there's a "Send test webhook" button.
# Or trigger a real test payment in test mode.
```

Verify in Vercel logs that you see `[paystack-webhook] event received`.

---

## Stripe

1. **Stripe dashboard → Developers → Webhooks → Add endpoint**
2. **Endpoint URL:** `https://impactperfumes.com/api/webhooks/stripe`
3. **Events to send:**
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `charge.dispute.created`
4. **Copy the signing secret** (starts with `whsec_…`) and add it on
   Vercel:
   ```
   vercel env add STRIPE_WEBHOOK_SECRET production
   # paste whsec_…
   ```
   Redeploy so the new env var is picked up.

To test (local):
```
stripe listen --forward-to https://impactperfumes.com/api/webhooks/stripe
stripe trigger payment_intent.succeeded
```

Verify in Vercel logs that you see `[stripe-webhook] event received`.

---

## How idempotency works

The first caller (whether redirect or webhook) for a given payment
reference creates a `processedPayment` document in Sanity with a
deterministic `_id` of `processed-payment-{reference}`. Subsequent
callers get a 409 from Sanity and skip fulfilment.

If Sanity is unreachable, the helper fails open (the call proceeds
without a lock). That trades a small duplicate-order risk for a
guaranteed-no-missed-orders risk.

Audit at: Sanity Studio → Operations → Processed Payments.

---

## What the webhooks don't yet handle

- **Auto-refund in Medusa** when Paystack/Stripe fires a refund event.
  For now those are logged with a warning and you reconcile in Medusa
  admin manually.
- **Dispute handling** — Stripe dispute events are logged. Respond from
  the Stripe dashboard.
- **Async-confirm payment methods** (bank transfer, USSD on Paystack,
  ACH on Stripe) — these will start working as soon as the Paystack
  webhook is enabled, because the redirect-verify path can't see them.
