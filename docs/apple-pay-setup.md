# Apple Pay (and Google Pay) on Stripe checkout

Both wallets render automatically inside the Stripe Payment Element on
qualifying browsers — there is no extra code change to make. The only thing
that has to happen is **domain registration in Stripe for Apple Pay**.
Google Pay needs no extra setup.

## Why it matters

Apple Pay on iPhone Safari lifts mobile checkout completion by 30–50%
versus typing a card. For a fragrance store with mostly mobile traffic, this
is the single biggest checkout win available right now.

## What's already in place

- `automatic_payment_methods.enabled: true` is set when we create the
  PaymentIntent (`src/app/api/stripe/create-intent/route.ts`). This is what
  tells Stripe to surface every method the customer's browser supports.
- The `PaymentElement` is themed dark to match the rest of the checkout.
  Apple Pay and Google Pay buttons render at the top of the element
  automatically when available.

## What the owner needs to do (one-time, per domain)

1. **Stripe Dashboard** → **Settings** → **Payments** → **Apple Pay**.
2. Click **Add a new domain**.
3. Enter the storefront's domain. For each environment you want Apple Pay on,
   register the matching domain:
   - `impact-perfume.vercel.app` (current production URL)
   - `impactperfumes.com` (once DNS is cut over)
   - Any preview / staging domain you actively test on
4. Stripe handles the domain verification automatically when the storefront
   is reachable via HTTPS (which Vercel guarantees).

That's it for Apple Pay. **Google Pay needs no setup** — Stripe shows it
to Chrome users whose Google account has a card on file.

## How to test

1. iPhone with Safari, Apple Pay set up in Wallet.
2. Hit the Canadian checkout (`impact_region=CA` cookie or visit from a
   non-NG IP).
3. Add a product, proceed to checkout, continue to payment.
4. The **Apple Pay button should appear at the top of the Payment Element**.
   Tapping it opens the native Apple Pay sheet.

If the button doesn't appear:
- Domain isn't registered in Stripe yet.
- You're in test mode but the Stripe account hasn't registered any test
  domains for Apple Pay (do the same step in test mode too).
- Safari → Settings → Apple Pay & Wallet — confirm a card is set up.
- You're on a non-Apple device.

## Currency support

Apple Pay supports CAD out of the box. No extra configuration.
