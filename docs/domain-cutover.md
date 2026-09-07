# Domain cutover: impact-perfume.vercel.app → impactperfumes.com

The storefront is built and deployed at `impact-perfume.vercel.app`.
`impactperfumes.com` still points at the legacy WordPress host (cPanel /
LiteSpeed, `185.61.152.15`) whose TLS certificate expired on 18 Jun 2026. That
is expected until launch: nothing is being advertised on the old domain.

This is the checklist for making the switch.

## What is already automatic

The app reads its origin from a single variable, `NEXT_PUBLIC_SITE_URL`
(`SITE_CONFIG.url` in `src/lib/config.ts`). Changing that one value updates:

- `metadataBase`, canonical URLs and Open Graph tags
- `sitemap.xml` (every absolute URL)
- `robots.txt`
- JSON-LD product/page URLs
- Transactional email links

**Search visibility is derived from it too.** `IS_CANONICAL_DOMAIN` compares the
configured host against `impactperfumes.com`; anything else — vercel.app,
preview builds, localhost — serves `Disallow: /` plus a `noindex, nofollow`
meta. This is deliberately *not* a separate "is live" flag, so it cannot be
forgotten: it flips as a consequence of the cutover itself. See
`src/lib/__tests__/siteDomain.test.ts`.

> Why it matters: if `impact-perfume.vercel.app` gets indexed before launch, it
> competes with the real domain as duplicate content, and Google can take weeks
> to drop it.

## What is NOT automatic

These live in other systems and each will silently break if missed.

### 1. Vercel
- Add `impactperfumes.com` (and `www`) to the project's Domains.
- Decide the canonical: apex or `www`. Vercel will redirect the other.
- Update DNS to Vercel's records. **Lower the TTL a day beforehand** so the
  switch propagates quickly and can be reverted quickly.
- Vercel provisions the TLS certificate automatically once DNS resolves — this
  also retires the expired legacy certificate.

### 2. Environment variable (do this in the same deploy as DNS)
```
NEXT_PUBLIC_SITE_URL = https://impactperfumes.com
```
Then **redeploy** — it is a `NEXT_PUBLIC_*` value, baked in at build time, so a
variable change alone does nothing until the next build.

### 3. Payment providers
- **Stripe** → Developers → Webhooks: add/replace the endpoint with
  `https://impactperfumes.com/api/webhooks/stripe`. Signing secret changes if
  you create a new endpoint — update `STRIPE_WEBHOOK_SECRET`.
- **Paystack** → Settings → API Keys & Webhooks: set the webhook URL to
  `https://impactperfumes.com/api/webhooks/paystack`.

Keep the old endpoints active briefly so in-flight events aren't lost.

### 4. Medusa (Railway)
- `STORE_CORS` must include `https://impactperfumes.com` or storefront requests
  fail CORS.
- `STOREFRONT_URL` must be updated, or Medusa's revalidation webhook keeps
  poking the vercel.app deployment and stock/price edits stop refreshing on the
  live site.

### 5. Sanity
Add `https://impactperfumes.com` to the project's CORS origins, otherwise the
embedded Studio at `/studio` cannot reach the API from the new domain.

### 6. Google Maps / Places API key
If the key is restricted by HTTP referrer, add the new domain. Address
autocomplete at checkout is proxied server-side, so this only bites if referrer
restrictions are in play — check before launch rather than after.

### 7. Cloudflare R2
Product images currently serve from the `pub-….r2.dev` development URL, which
Cloudflare rate-limits and does not recommend for production. Map a custom
domain (e.g. `files.impactperfumes.com`) and set
`NEXT_PUBLIC_MEDUSA_IMAGE_HOST` to the **bare hostname**. Convenient to do in
the same DNS session. See `docs/medusa-r2-storage-setup.md`.

## Legacy WordPress URLs

`next.config.mjs` already redirects the known old paths (`/our-brand`,
`/our-team`, `/product/:slug`, `/shop`). Before cutover, crawl the old site (or
pull its sitemap) and confirm nothing else with inbound links 404s.

## Verify after the switch

1. `curl https://impactperfumes.com/robots.txt` → `Allow: /` and the sitemap
   line points at `impactperfumes.com`.
2. View source on any page → the `noindex` meta is **gone**.
3. `curl -I https://impactperfumes.com` → valid certificate, `x-vercel-id`
   present (i.e. Vercel is serving, not cPanel).
4. Place one real low-value order end to end; confirm the webhook is received
   and the order is recorded in Medusa.
5. Edit stock in Medusa admin; confirm it refreshes on the live site
   (proves `STOREFRONT_URL`).
6. Open `/studio` and confirm the CMS loads (proves Sanity CORS).
7. Submit the domain to Google Search Console and request indexing.
