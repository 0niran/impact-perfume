# Security Audit — Impact Perfumes Storefront

**Date:** 2026-05-22
**Scope:** Storefront repo at HEAD `8c47856`. Covers API routes, payment
flows, webhooks, auth, secret handling, input validation, headers, and
dependency CVEs. Excludes the Medusa backend repo (separate audit) and
Sanity Studio.

---

## Severity scale

| Tier | Definition | SLA |
|---|---|---|
| **Critical** | Direct path to data exfiltration, unauthorized funds movement, or full account takeover with no preconditions. | Fix before any new feature ships. |
| **High** | Feasible attacks that cost the business money or trust (order fraud, abuse, leaked PII). | Fix within current sprint. |
| **Medium** | Defence-in-depth gaps. Exploit requires chained conditions or an existing breach. | Fix opportunistically; don't ship new code in the area without addressing. |
| **Low** | Hygiene issues, hardening opportunities, minor info leaks. | Track in backlog. |
| **Info** | Documented design tradeoffs that are not bugs. | No action; awareness only. |

---

## Findings summary

| ID | Severity | Title |
|---|---|---|
| H-1 | **High** | Order total + line prices accepted from client without server-side re-pricing |
| H-2 | **High** | Fail-open auth pattern leaves cron / revalidate / Medusa-webhook routes wide open if env var is missing |
| H-3 | **High** | No rate limiting on any public POST endpoint (verify-payment, cart/save, stripe/create-intent, newsletter) |
| M-1 | Medium | No HTTP security headers (CSP, HSTS, X-Frame-Options, Referrer-Policy) |
| M-2 | Medium | Stripe webhook deduplicates on payment reference, not Stripe `event.id` |
| M-3 | Medium | Stripe `create-intent` returns raw Stripe error messages to the client |
| M-4 | Medium | `Math.random()` used to generate payment references |
| M-5 | Medium | Medusa admin credentials in env vars are full-access — single key compromise = full backend takeover |
| L-1 | Low | `next.config.mjs` image `remotePatterns` allows wildcard `**.railway.app` |
| L-2 | Low | `/api/cart/save` saves email + PII without consent flag |
| L-3 | Low | `/api/newsletter` collects emails to nowhere (TODO comment) |
| L-4 | Low | `/api/search` has no rate limit; enables enumeration |
| L-5 | Low | `processedPayment` lock fails-open on Sanity errors (intentional but document) |
| I-1 | Info | Sanity write token is broad (Editor scope) — granular per-doctype roles would tighten blast radius |
| I-2 | **Critical (dep)** | `npm audit` flagged 46 issues; 19 cleared by removing unused `@medusajs/medusa-js`. **Next.js still needs a critical patch upgrade (14.2.18 → 14.2.35).** |

---

## H-1 · Order total + line prices accepted from client without server-side re-pricing

**Severity:** High
**Files:**
- `src/app/api/verify-payment/route.ts:31` — destructures `amountKobo`, `lines` from client body
- `src/app/api/verify-payment/route.ts:65` — verifies `tx.amount === amountKobo` (client-controlled comparison target)
- `src/app/api/verify-payment/route.ts:73-85` — passes client `lines` to `fulfillOrder` as-is
- `src/app/api/stripe/create-intent/route.ts:54-69` — `total` calculated from client `lines[].unitPriceKobo`, used as the PaymentIntent amount
- `src/app/api/stripe/confirm/route.ts:46-55` — pulls `lines` from PaymentIntent metadata (server-set, but originally from client at create-intent time)

**Impact:** An attacker can place orders for arbitrarily low amounts. The
storefront never re-derives prices from Medusa during checkout — it
trusts the client-sent `unitPriceKobo` values to drive both the
Paystack/Stripe charge AND the Medusa line items.

**Attack scenario:**
1. Open the Stripe create-intent endpoint with a forged body:
   ```json
   { "lines": [{ "variantId": "v_no5", "unitPriceKobo": 1, "qty": 1, ... }], ... }
   ```
2. Stripe creates a PaymentIntent for $0.01. Customer pays.
3. `/api/stripe/confirm` reads the metadata (which still has the attacker's
   $0.01 line) and creates a Medusa order with `unit_price: 0.01`.
4. Real product ships.

The Paystack flow has the same shape — the attacker controls both the
Paystack init amount AND the verify-payment body, and the equality
check passes.

**Recommendation:** On both API entry points (`stripe/create-intent` and
`verify-payment`), re-fetch each variant from Medusa using the storefront
key, recompute the price for the active region using the same logic as
`lib/medusa.ts getPrice()`, and compare to the client-claimed
`unitPriceKobo`. Reject the request if they differ. Then build the
Stripe PaymentIntent amount and the Medusa `unit_price` from the
server-derived values, never the client's.

This is the single most important fix in the audit.

---

## H-2 · Fail-open auth pattern on protected routes

**Severity:** High
**Files:**
- `src/app/api/cron/abandoned-carts/route.ts:31-37` — `if (!secret) return true`
- `src/app/api/revalidate/route.ts:20-26` — `if (secret) {...}` (no else: skipped entirely)
- `src/app/api/webhooks/medusa/route.ts:28-36` — `if (!secret) return true`

**Impact:** Every "protected" route falls back to allowing all requests
when its env var is unset. A simple ops mistake (env deleted, renamed,
typo) silently opens the route to the public internet.

Concretely:
- `/api/cron/abandoned-carts` — can be POSTed by anyone to spam emails to
  all stored pending-cart addresses on Sanity.
- `/api/revalidate` — can be triggered repeatedly to thrash Vercel's
  cache regenerator (cost) or to invalidate paths just-in-time before
  cache-poisoning attacks.
- `/api/webhooks/medusa` — same revalidation thrash.

**Recommendation:** Flip the default from "allow when unset" to "deny when
unset." If a deployment forgets the secret, the route should return 401,
not run wide open. Loud failure > silent exposure.

```ts
// In each route:
if (!secret) {
  return NextResponse.json({ ok: false }, { status: 503 })
}
const auth = req.headers.get('authorization')
if (auth !== `Bearer ${secret}`) {
  return NextResponse.json({ ok: false }, { status: 401 })
}
```

The local-dev convenience that fail-open was meant to preserve can be
recovered with a `NODE_ENV !== 'production'` guard or by always setting
the env var locally.

---

## H-3 · No rate limiting on public POST endpoints

**Severity:** High
**Files:**
- `src/app/api/verify-payment/route.ts:15` — no limiter
- `src/app/api/cart/save/route.ts:39` — no limiter
- `src/app/api/stripe/create-intent/route.ts:11` — no limiter
- `src/app/api/newsletter/route.ts:3` — no limiter
- `src/app/api/search/route.ts:94` — no limiter

**Impact:**
- **Cart-save abuse:** unlimited Sanity document creation. Sanity Growth
  tier has request quotas; exceeding them costs money or breaks the site.
- **Create-intent abuse:** unlimited Stripe PaymentIntents — Stripe
  flags high-create-low-confirm ratios as fraud signal, can lock down
  the account.
- **Verify-payment abuse:** unlimited Paystack API calls per IP. Paystack
  doesn't bill per verify call, but enumeration of valid references is
  cheaper.
- **Newsletter:** no limiter on a stub route that's about to become
  real. Easy email-enumeration / spam vector.

**Recommendation:** Add IP-based rate limiting at the edge using either:
- Vercel Firewall (managed) — `vercel firewall add rate-limit ...` per
  route. No code changes; configured per project.
- Upstash Ratelimit (per-route) — small dependency, ~10 lines per
  route. Backed by Upstash Redis (Vercel Marketplace).

Suggested limits:
| Route | Limit |
|---|---|
| `/api/verify-payment` | 10/min per IP |
| `/api/stripe/create-intent` | 10/min per IP |
| `/api/cart/save` | 5/min per IP |
| `/api/newsletter` | 5/min per IP |
| `/api/search` | 30/min per IP |

---

## M-1 · No HTTP security headers

**Severity:** Medium
**File:** `next.config.mjs` (no `async headers()` block defined)

**Impact:** Missing headers leave the site exposed to clickjacking,
mixed-content downgrade, info leakage via Referer, and reduce XSS
defence-in-depth.

**Recommendation:** Add a `headers()` block:

```js
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      // CSP: start in report-only mode, tighten over weeks
      { key: 'Content-Security-Policy-Report-Only', value: "default-src 'self'; img-src 'self' https: data:; script-src 'self' 'unsafe-inline' https://js.paystack.co https://js.stripe.com; style-src 'self' 'unsafe-inline'; frame-src https://*.paystack.com https://js.stripe.com https://*.stripe.network; connect-src 'self' https://api.paystack.co https://api.stripe.com https://*.up.railway.app https://cdn.sanity.io" },
    ],
  }]
}
```

After 1–2 weeks of Report-Only with no real violations, switch to
`Content-Security-Policy`.

---

## M-2 · Stripe webhook dedupes on payment reference, not event.id

**Severity:** Medium
**File:** `src/app/api/webhooks/stripe/route.ts:66-72`

**Impact:** Stripe explicitly recommends deduplicating on
`event.id`, not on payload contents. If Stripe replays the same event
twice with subtly different metadata (e.g., a partial refund event for
the same charge), the second event could slip through.

For our current code, idempotency keys on the `reference` from
PaymentIntent metadata, which is consistent across replays of the same
intent — so this is a defence-in-depth issue, not an active bug.

**Recommendation:** Add an `event.id`-keyed early-return at the top of the
handler:

```ts
const eventLock = await claimPayment(`stripe-event-${event.id}`, 'stripe', 'webhook')
if (!eventLock) return NextResponse.json({ ok: true, dedup: true })
```

Same change for the Paystack webhook (Paystack also sends a unique
event id in the payload).

---

## M-3 · Stripe `create-intent` leaks raw error messages to client

**Severity:** Medium
**File:** `src/app/api/stripe/create-intent/route.ts:86-92`

```ts
message: err instanceof Error ? err.message : 'Could not initialise payment.',
```

**Impact:** Stripe errors can contain internal info ("your account
disabled for X reason", "merchant configuration error: ..."). Surfacing
these verbatim to the browser leaks state about your Stripe account.

**Recommendation:** Log the full error server-side (already done at
line 85), but return a generic message to the client:

```ts
console.error('[stripe.create-intent] failed:', err)
return NextResponse.json(
  { ok: false, message: 'Could not initialise payment. Please try again.' },
  { status: 500 }
)
```

---

## M-4 · `Math.random()` used for payment references

**Severity:** Medium
**Files:**
- `src/components/checkout/CheckoutForm.tsx:31` — `generateRef()` uses `Math.random()`
- `src/app/api/stripe/create-intent/route.ts:52` — server-side ref uses `Math.random()`

**Impact:** Not a direct vuln (refs aren't secrets), but predictable refs
let an attacker pre-compute likely refs and probe payment provider APIs
or attempt to hijack /order-confirmed pages.

**Recommendation:** Use `crypto.randomUUID()` (server) or `crypto.getRandomValues`
(browser-safe alternative). Length-12 hex with timestamp prefix is fine
for human-readable refs.

---

## M-5 · Medusa admin credentials in env vars

**Severity:** Medium (design tradeoff, but worth tightening when Medusa supports it)
**Files:**
- `src/lib/orderFulfillment.ts:55-83` — uses `MEDUSA_ADMIN_EMAIL` / `MEDUSA_ADMIN_PASSWORD` for admin token
- Same pattern in all `scripts/*.ts`

**Impact:** Storefront RCE → admin credentials in `process.env` →
attacker has full Medusa admin (price changes, refund issuance, order
cancellation, customer data extraction).

**Recommendation:** Once Medusa v2 supports scoped API keys with
fine-grained permissions, switch from email/password to a key that only
has order-create + payment-collection scopes. Until then, document the
threat in onboarding and rotate the password every 90 days.

---

## L-1 · `remotePatterns` allows broad wildcard

**Severity:** Low
**File:** `next.config.mjs:7-11`

```js
{ protocol: "https", hostname: "**.railway.app" },
{ protocol: "https", hostname: "**.up.railway.app" },
```

**Impact:** Any attacker who registers a subdomain on `*.railway.app`
can serve content through your `next/image` optimizer (bandwidth abuse,
indirectly attribute your domain to malicious images).

**Recommendation:** Replace with the exact Medusa hostname:
```js
{ protocol: "https", hostname: "impact-perfumes-medusa-production.up.railway.app" },
```

---

## L-2 · `/api/cart/save` saves PII without consent flag

**Severity:** Low (becomes Medium under GDPR / Canadian PIPEDA scrutiny)
**File:** `src/app/api/cart/save/route.ts:78-90`

**Impact:** Storing the customer's email + cart contents in Sanity without
an explicit consent checkbox is grey-area under GDPR/PIPEDA, especially
since this drives email outreach (the cron route).

**Recommendation:** Add a "I'd like reminders about my cart" opt-in next
to the email input on the cart drawer save form. Store the boolean on
the `pendingCart` doc. Skip cart in the cron query when the flag is false.

---

## L-3 · Newsletter route is a no-op TODO

**Severity:** Low
**File:** `src/app/api/newsletter/route.ts:18-27`

The route returns `ok: true` without actually saving the email. Not a
vuln but currently users get the impression they've subscribed when
they haven't. Wire up Mailchimp / Brevo / Klaviyo or remove the form
until it's real.

---

## L-4 · Search has no rate limit; enables enumeration

**Severity:** Low
**File:** `src/app/api/search/route.ts:94`

**Impact:** Endpoint can be abused to enumerate the full product catalog
(rate-bounded by Medusa, but still scrapeable). Not a true vuln since
the catalog is public, but worth bounding.

**Recommendation:** Same rate limit as suggested in H-3.

---

## L-5 · `processedPayment` lock fails open

**Severity:** Low (documented design tradeoff)
**File:** `src/lib/processedPayment.ts:69-73`

If Sanity is unreachable, the lock helper returns `true` so payments
don't get lost. The code comment acknowledges this. Worth a runbook
entry: if Sanity has an outage, expect duplicate Medusa orders during
the window and plan to reconcile.

---

## I-1 · Sanity write token is broad

**Severity:** Info
**Files:** `.env.local` / Vercel env — `SANITY_API_WRITE_TOKEN`

The single write token can create/modify/delete any document type. If
the token leaks, an attacker can delete journal posts, modify product
enrichment, etc. Sanity has more granular role tokens — worth scoping a
production-only token to just `pendingCart`, `processedPayment`, and
`review` writes (the only document types the storefront server actually
creates).

---

## I-2 · Dependency CVE check

`npm audit --omit=dev` initially flagged **46 vulnerabilities (2
critical, 21 high, 23 moderate)**.

**Already remediated during this audit:**
- Removed `@medusajs/medusa-js` (unused — never imported by storefront
  code; was pulling in the entire `@medusajs/medusa` backend tree as a
  transitive dep). Dropping it cleared 19 of the findings, including
  the most concerning Medusa/axios/uuid chains.

**Remaining (27 vulnerabilities — 1 critical, 7 high, 19 moderate):**

| Package | Severity | Issue | Fix |
|---|---|---|---|
| `next` | **Critical** | GHSA-9g9p-9gw9-jx7f (image-optimizer DoS), GHSA-vfv6-92ff-j949 (cache-poisoning) | Upgrade `next` from `14.2.18` → `14.2.35` (latest 14.x patch). Within-major, safe. |
| `glob` (transitive via `next-sanity` → `@architect/*`) | High | GHSA-5j98-mcp5-4vw2 (CLI command injection — only exploitable via `glob` binary, not the import) | Risk is low because we don't run `glob` as a CLI. Upgrading `next-sanity` to v9.5.6 fixes it (semver-major; verify Sanity integration after). |
| `brace-expansion` (transitive via `@oclif/core`, Sanity exporters) | Moderate | GHSA-jxxr-4gwj-5jf2 (DoS via numeric range) | `npm audit fix` (non-breaking). |
| `postcss` (transitive via `next`) | Moderate | XSS via unescaped `</style>` in stringify | Auto-fixed once `next` is upgraded. |
| `prismjs` (transitive via `next-sanity`) | Moderate | Multiple low-impact issues | Auto-fixed once `next-sanity` is upgraded. |
| `uuid` (transitive via `@sanity/uuid`) | Moderate | GHSA-w5hq-g745-h8pq (buffer bounds in v3/v5/v6) | Storefront doesn't call uuid v3/v5/v6 buffer overload. Lower priority. |
| `ws` (transitive via Sanity stack) | Moderate | GHSA-58qx-3vcg-4xpx (uninitialized memory disclosure) | `npm audit fix` (non-breaking). |

**Recommendation:**
1. Run `npm audit fix` first — picks up `ws`, `brace-expansion`, and
   any other patch-version-only fixes without breaking anything.
2. Manually bump `next` to `14.2.35` (within-major, no API breaks
   expected).
3. Defer `next-sanity` major upgrade until Sanity integration has time
   to be re-tested.
4. Re-run `npm audit --omit=dev`; the remaining few should all be
   moderate-only and acceptable to ship with.

---

## Recommended remediation order

1. **H-1** — server-side re-price the cart at checkout (prevents direct fraud)
2. **H-2** — flip fail-open auth to fail-closed
3. **H-3** — rate limiting (use Vercel Firewall managed rules to skip code change)
4. **M-1** — add HTTP security headers
5. **M-3** — sanitize Stripe error messages
6. **M-2** — dedupe by event.id on both webhooks
7. **M-4** — switch to `crypto.randomUUID()` for refs
8. **L-1 through L-5** — opportunistic cleanup
9. **M-5 / I-1** — track for when Medusa / Sanity expose tighter scopes

---

## What this audit did NOT cover

- Medusa backend (separate repo, separate audit)
- Sanity Studio configuration (RBAC, CORS)
- DNS / TLS configuration of the eventual custom domain
- Mobile app (none exists)
- Physical / operational security
- Customer device security
