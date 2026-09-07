# Medusa QA Audit Report

Run: 2026-09-02T19:13:37.143Z
Backend: https://impact-perfumes-medusa-production.up.railway.app

**29 passed · 0 failed · 6 warnings**

## Warnings (review)

- [A] region "Canada" has no payment provider — fine for the record-only flow, but attach pp_system_default for admin/refund parity
- [A] no CA tax region in Medusa — confirm CA tax is handled by Stripe Tax at checkout
- [B] NG: 100 visible product(s) with no image
- [B] NG: 59 visible product(s) OUT OF STOCK at this market's location (not sellable)
- [B] CA: 100 visible product(s) with no image
- [B] CA: 118 visible product(s) OUT OF STOCK at this market's location (not sellable)

## Full log

### Suite A

- ✓ admin API key authenticates
- · store "Impact Perfume" currencies: cad, ngn (default ngn)
- ✓ NGN is a supported store currency
- ✓ CAD is a supported store currency — admin CAD price field is available
- · region "Impact Perfume HQ" — ngn · countries ng · payment pp_system_default · auto-tax true
- ✓ region "Impact Perfume HQ" has a payment provider (pp_system_default)
- · region "Canada" — cad · countries ca · payment none · auto-tax true
- ! region "Canada" has no payment provider — fine for the record-only flow, but attach pp_system_default for admin/refund parity
- ✓ system/manual payment provider is installed — order recording (mark-as-paid) works
- ✓ NG: sales channel "Impact NG" → publishable key present
- ✓ CA: sales channel "Impact CA" → publishable key present
- · stock location "Impact Perfume HQ" (Lagos, ng) → channels Impact NG
- · stock location "Canada" (Brantford, ca) → channels Impact CA
- ✓ NG: fulfilled from a stock location
- ✓ CA: fulfilled from a stock location
- · tax region ng: VAT 7.5%
- ✓ NG tax region configured (VAT)
- ! no CA tax region in Medusa — confirm CA tax is handled by Stripe Tax at checkout
- · no Medusa shipping options — expected here: delivery is priced storefront-side (GIG) and recorded as a custom line item

### Suite B

- · 129 published products in Medusa
- ✓ NG: 129/129 published products visible to this storefront
- ✓ NG: 129 priced, 0 with NO NGN price (would show "price on request")
- ! NG: 100 visible product(s) with no image
- ! NG: 59 visible product(s) OUT OF STOCK at this market's location (not sellable)
- ✓ CA: 129/129 published products visible to this storefront
- ✓ CA: 129 priced, 0 with NO CAD price (would show "price on request")
- ! CA: 100 visible product(s) with no image
- ! CA: 118 visible product(s) OUT OF STOCK at this market's location (not sellable)

### Suite C

- ✓ created product qa-test-1788376410292 (prod_01M1HRMT83QX5KQBPWAQC80SQK) with variant variant_01M1HRMT92Z6WSDRRHKEBDR1V5
- ✓ update product fields (subtitle, metadata) persisted
- ✓ NGN price set (₦100)
- ✓ CAD price set (CA$5)
- ✓ published product is visible via NG store API
- ✓ set inventory level to 7
- ✓ adjusted inventory level to 12
- ✓ store API reflects inventory_quantity=12
- ✓ deleted inventory level (after zeroing stock)

### Suite D

- ✓ created draft order order_01M1HRMZFZEJY25XBZJSXTHM2X
- · draft order status=draft email=qa-test@impactperfume.invalid items=1 total=100
- ✓ draft order readable with line item
- · order recording (convert-to-order → mark-as-paid) not exercised — pass --record-order to run it for real

### Suite E

- · spot-check target: no-1
- ✓ inventory write observed on real product (20 → 23)
- ✓ inventory restored to original (20)

### Suite F

- ✓ cleaned up: delete draft order order_01M1HRMZFZEJY25XBZJSXTHM2X
- ✓ cleaned up: delete product QA-TEST-1788376410292

## Manual checklist (not machine-verifiable here)

- **Inventory freshness on the storefront (issue #1):** the Railway subscriber `storefront-revalidate.ts` must call the storefront `/api/revalidate`. Verify `STOREFRONT_URL` and `STOREFRONT_REVALIDATE_TOKEN` (= Vercel `CRON_SECRET`) are set on Railway; after a stock edit, check Railway logs for `[storefront-revalidate]`.
- **Payments:** confirm each live region has a working payment provider before taking real orders.
