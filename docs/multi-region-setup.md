# Multi-region setup: Canada (CAD) + Stripe

The storefront ships with a region switcher (NG / CA) and a checkout gate that
shows "launching soon" for any region where `checkoutEnabled = false`. To turn
Canada on, the following backend work needs to happen on the Medusa side.
None of it is destructive to the existing Nigeria store.

The flag to flip once everything below is done lives in
`src/lib/region.ts` — set `CA.checkoutEnabled = true`.

---

## 1. Install the Stripe payment provider in Medusa

In your Medusa repo on Railway:

```bash
yarn add @medusajs/payment-stripe
```

Then add it to `medusa-config.ts` under `modules`:

```ts
{
  resolve: '@medusajs/medusa/payment',
  options: {
    providers: [
      {
        resolve: '@medusajs/medusa/payment-stripe',
        id: 'stripe',
        options: {
          apiKey: process.env.STRIPE_API_KEY,
          webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        },
      },
      // Keep the existing Paystack provider entry here too
    ],
  },
}
```

Set on Railway → Variables:

- `STRIPE_API_KEY` — your `sk_test_...` (or `sk_live_...`) secret key
- `STRIPE_WEBHOOK_SECRET` — `whsec_...` from Stripe Dashboard → Developers → Webhooks
  (point the webhook at `https://impact-perfumes-medusa-production.up.railway.app/hooks/payment/stripe`)

Redeploy Medusa. Verify by logging into Medusa admin → Settings → Regions →
adding/editing any region — Stripe should appear as a selectable provider.

## 2. Create the Canada region

In Medusa admin → Settings → Regions → Create Region:

| Field | Value |
|---|---|
| Name | `Canada` |
| Currency | `CAD` |
| Countries | `Canada` |
| Payment providers | `Stripe` (only — not Paystack) |
| Automatic taxes | Yes |

Copy the new region's ID (e.g. `reg_01ABC...`) and add it to the storefront env:

```
NEXT_PUBLIC_MEDUSA_REGION_ID_CA=reg_01ABC...
```

Both `.env.local` and the Vercel project's environment variables.

## 3. Add CAD prices to products

Medusa products store prices per region. By default the 50 Numbers and 50 Oils
only have NGN prices. To enable Canadian purchase, each variant needs a CAD
price.

You can do this:

- **Manually in Medusa admin**: open each product → Variants → add a price in CAD.
  Tedious for 100+ products.

- **Bulk script** (recommended): there's an existing pattern at
  `scripts/seed-products.ts`. A small adaptation `scripts/seed-cad-prices.ts`
  can iterate every Number / Oil and patch its first variant's prices array to
  include a CAD amount. Ask the storefront team to write this when you have
  the conversion rate. As a placeholder you can use roughly NGN × 0.0011 (i.e.
  ₦50,000 → ~CAD $55, ₦25,000 → ~CAD $28).

## 4. Flip the storefront flag

Edit `src/lib/region.ts`:

```ts
CA: {
  ...
  checkoutEnabled: true,   // was false
}
```

Commit. Redeploy. The CA option in the header switcher will now route through
to a real checkout instead of the "launching soon" page.

## 5. Stripe checkout UI in the storefront

This step is **not yet implemented**. Once 1–4 are done, the storefront needs
a Stripe Payment Element added to `src/components/checkout/CheckoutForm.tsx`
that fires when `region.paymentProvider === 'stripe'`. The existing Paystack
inline path stays for NGN.

Sketch:

- Install `@stripe/stripe-js` and `@stripe/react-stripe-js`
- On checkout mount with CAD region: create a Medusa cart with the CA region
  ID, call `cart.initiatePaymentSession({ provider_id: 'stripe' })` to get a
  `client_secret`, render `<Elements stripe={stripePromise}>` and a
  `<PaymentElement />`
- On submit: confirm the payment with the client_secret, then call
  `/api/verify-payment` (branched to handle Stripe references)

Estimate: ~half a day once 1–4 are complete and tested.

---

## What lives where today

| Concern | File |
|---|---|
| Region + currency model | `src/lib/region.ts` |
| Client context + cookie persistence | `src/lib/regionContext.tsx` |
| Header switcher UI | `src/components/layout/RegionSwitcher.tsx` |
| Checkout gate ("launching soon") | `src/app/checkout/page.tsx` |
| RegionProvider mount + SSR cookie read | `src/app/layout.tsx` |

## Remaining frontend refactors (after backend is ready)

- Replace `formatNaira` everywhere with `formatPrice(amount, region)` (~20 call sites)
- Add `currency` to `CartLine` and reject mixing currencies when adding items
- Server pages: read the region cookie via `cookies()` and pass `region_id` to
  `getMedusaProduct`, `getProductsByCategory`, etc.
- Add a "Free delivery on orders over $X" line that pulls from the active
  region's `freeDeliveryThresholdMinor`
- Cart drawer subtotal uses `formatPrice(subtotal, region)`
