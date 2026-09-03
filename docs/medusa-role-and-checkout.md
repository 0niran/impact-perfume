# Architecture: Medusa's role and the checkout flow

**Status:** as-built (describes production today), 2026-09.

## TL;DR

Medusa is the **catalogue + inventory + order system-of-record**. It is **not**
the checkout, payment, or shipping engine. Payments run through Paystack (NGN)
and Stripe (CAD) **in the storefront**; delivery runs through GIG **in the
storefront**. Medusa only ever *records* an order after the money is already
captured elsewhere.

Read this before "fixing" a Medusa region that has no payment provider, or a
fulfilment set with no shipping options. In this design those are **expected**,
not bugs.

## What Medusa owns

- Products, variants, prices (NGN + CAD), categories, sales channels.
- Inventory items and stock levels per location (Lagos HQ, Brantford ON).
- The **order record** — created after payment, so admin/reporting/fulfilment
  teams have a single place to work from.

## What Medusa does NOT own

- **Taking payment.** The customer pays Paystack or Stripe directly from the
  storefront. Medusa never opens a payment session and never talks to a payment
  gateway.
- **Quoting or booking delivery.** GIG home delivery is quoted at
  `/api/delivery/quote` and booked in `src/lib/gig.ts`. The fee is written onto
  the order as a **custom line item**, not a Medusa shipping method.
- **Tax calculation for CA.** CA tax is computed by **Stripe Tax** at checkout
  (`taxCalculationId` is recorded on the order). NG VAT (7.5%) is price-inclusive
  and recorded as an embedded portion.

## How an order is recorded (`src/lib/orderFulfillment.ts`)

Both rails (Paystack redirect-verify / webhook, Stripe confirm / webhook) call
`fulfillOrder`, which is idempotent (a Sanity `processedPayment` lock — see
`docs/payment-webhooks-setup.md`). After the external capture succeeds:

1. `POST /admin/draft-orders` — build the order (line items + delivery as a
   custom line + rich `metadata`: payment ref, money breakdown, fulfilment
   method).
2. `POST /admin/draft-orders/{id}/convert-to-order` — promote to a real order.
   **No Medusa shipping method is attached** — this succeeds without any
   shipping option configured.
3. `POST /admin/payment-collections` then `.../mark-as-paid` — record the
   payment as captured using Medusa's built-in **system/manual** provider.

Because step 3 uses the system provider, the **region's `payment_providers`
link is irrelevant to this flow** — which is why NG shows only
`pp_system_default` and CA can show none.

## Why the Medusa-native config looks "half configured"

| Medusa-native concept | State | Why |
|---|---|---|
| Region payment providers | NG: `pp_system_default`; CA: none | Native payment sessions are never used. Recording uses the system provider. |
| Shipping options | none | GIG delivery is a custom line item; NG orders record fine without them. |
| Fulfilment sets | present but unused by checkout | Fulfilment method is tracked in order `metadata` (`pickup` / `shipping`). |
| Tax regions | NG only | CA tax via Stripe Tax at checkout. |

None of the above blocks the storefront. They would only matter if someone used
Medusa's **native** storefront checkout or admin "create order" UI, which this
project does not.

## Recommended config parity (cheap insurance, not required)

- **Attach `pp_system_default` to the Canada region.** Not Stripe-as-a-provider —
  just the system provider, so CA order *recording*, refunds, and manual admin
  edits behave identically to NG. Removes a foot-gun and quiets false alarms.

## Canada go-live checklist (record path)

- [ ] `pp_system_default` attached to the CA region.
- [ ] One real CA order placed in **Stripe test mode**, end to end; confirm it
      lands in Medusa Orders as **Paid** and stock decrements.
- [ ] CA inventory model decided: seed Brantford stock for pickup, or set
      `allow_backorder` for made-to-order. (CA is currently ~0 stock.)
- [ ] `CA.checkoutEnabled` flipped in `src/lib/region.ts` when ready.

## Note on `docs/multi-region-setup.md`

That doc describes installing `@medusajs/payment-stripe` as a Medusa provider.
The as-built flow does **not** use it — Stripe lives in the storefront and
Medusa records the order via `mark-as-paid`. Treat this file as the source of
truth for how checkout actually works.

## For the QA harness

`npm run qa-audit` (`scripts/qa-audit-medusa.ts`) understands this design: it
does not treat missing shipping options or an empty region provider as a
checkout failure, and it can exercise the record-only order path directly with
`--record-order`.
