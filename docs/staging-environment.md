# Staging environment

## Why this exists

Everything currently points at production. `NEXT_PUBLIC_MEDUSA_BACKEND_URL` holds
one value shared across Vercel's Production, Preview **and** Development scopes,
and so do `MEDUSA_ADMIN_API_KEY`, `REDIS_URL`, `CRON_SECRET`, `STRIPE_SECRET_KEY`
and `PAYSTACK_SECRET_KEY`.

The consequences are concrete, not theoretical:

- A pull request's preview deployment has **admin write access to the live
  catalogue**.
- Preview and production **share the cart and rate-limit store**, so a load test
  on a branch throttles real customers.
- A preview can trigger **production cache revalidation**.
- `npm run dev` on a laptop reads and writes the shop customers are buying from.

Staging separates these. Production keeps its own database, keys and money;
everything else gets a copy it is safe to be wrong in.

## Shape

One Railway *environment* duplicated from production, and every Vercel Preview
deployment pointed at it. There is deliberately **no `staging` branch**: a branch
would need keeping in sync with `main` and would still leave ordinary pull
request previews aimed at production. Pointing all previews at staging covers
every branch automatically.

```
feature branch -> PR -> Vercel preview  ->  Railway STAGING  (test here)
merge to main  ->      Vercel production ->  Railway PRODUCTION
```

## Provisioning (Railway dashboard)

1. Open the `impact-perfumes-medusa` project, environment dropdown, **New
   Environment -> Duplicate from production**. Name it `staging`. This copies the
   service definitions and variables, not the data.
2. In the new environment, confirm it provisioned **its own Postgres**. If it
   reused production's, delete the reference and add a fresh Postgres, then set
   `DATABASE_URL` to the new one. Getting this wrong is the only step that can
   damage production.
3. Add a Redis for staging, or point `REDIS_URL` at a second Upstash database
   (the free tier is enough).
4. Set the staging service to deploy from `master` too, or leave it manual.
5. Set these to staging-specific values:

   | Variable | Staging value |
   |---|---|
   | `DATABASE_URL` | the new staging Postgres |
   | `REDIS_URL` | the new staging Redis |
   | `JWT_SECRET`, `COOKIE_SECRET` | fresh values, **not** production's |
   | `STOREFRONT_URL` | the Vercel preview or staging domain |
   | `STOREFRONT_REVALIDATE_TOKEN` | matches staging `CRON_SECRET` below |
   | `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS` | include the staging storefront origin |

   `medusa-config.ts` now refuses to start in production without `JWT_SECRET` and
   `COOKIE_SECRET`, so a missing one fails loudly rather than falling back to a
   shared default.

6. Note the staging service's public URL. It will look like
   `impact-perfumes-medusa-staging.up.railway.app`.

## Vercel

Scope each of these to **Preview only**, leaving the Production value alone:

| Variable | Staging value |
|---|---|
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | the staging Railway URL |
| `MEDUSA_ADMIN_API_KEY` | a secret key created in the **staging** admin |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | staging publishable key (NG channel) |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY_CA` | staging publishable key (CA channel) |
| `NEXT_PUBLIC_MEDUSA_REGION_ID`, `..._CA` | region ids from the staging database |
| `NEXT_PUBLIC_MEDUSA_SALES_CHANNEL_ID_CA` | staging CA channel id |
| `REDIS_URL` / `KV_REST_API_*` | the staging Redis |
| `CRON_SECRET` | a fresh value, matching staging `STOREFRONT_REVALIDATE_TOKEN` |
| `MEDUSA_WEBHOOK_SECRET` | fresh value |
| `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe **test** keys |
| `PAYSTACK_SECRET_KEY`, `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Paystack **test** keys |
| `NEXT_PUBLIC_SITE_URL` | the staging URL |

`NEXT_PUBLIC_SITE_URL` matters beyond display: `IS_CANONICAL_DOMAIN` in
`src/lib/config.ts` derives search visibility from it, so a staging value makes
staging non-indexable without a second switch.

Ids differ between databases. Region and sales-channel ids from production will
silently produce "price on request" against staging, because a price query with
an unrecognised region returns nothing. Read them from the staging admin.

### The production Paystack key

Production currently runs a Paystack **test** key. Once staging holds the test
keys, production has no excuse to and should be switched to live. Until then no
real Nigerian payment can be taken.

## Seeding staging

The maintenance scripts read their target from the environment, so staging is
populated with the same commands used for production:

```sh
export NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://impact-perfumes-medusa-staging.up.railway.app
export MEDUSA_ADMIN_API_KEY=<staging secret key>

npm run sync-inventory          # dry run against staging
npm run sync-inventory -- --apply
npx tsx scripts/backfill-product-images.ts          # dry run
APPLY=1 npx tsx scripts/backfill-product-images.ts
```

`docs/Impact Perfume Inventory.csv` is the seed. Regions, currencies, stock
locations and sales channels are **not** created by these scripts and have to
exist in staging first — create them in the staging admin, or the sync aborts
when it cannot resolve a stock location.

Do not restore a production database dump into staging. It carries real customer
names, addresses and order history into an environment with weaker access
control and test payment keys.

## The production write guard

`assertWriteAllowed()` in `scripts/lib/medusaAdmin.ts` refuses any non-GET
request to the production host unless `--prod` is passed:

```
failed: Refusing to write to PRODUCTION (https://impact-perfumes-medusa-production.up.railway.app).
  Re-run with --prod if that is genuinely the target.
```

`--apply` says you mean to write. `--prod` says you mean to write *here*. Dry
runs are unaffected, and any host that is not production needs neither flag, so
working against staging costs nothing.

`adminFetch` enforces it as a backstop, so a new script cannot forget it. A
script calling `fetch` directly must call `assertWriteAllowed()` itself —
`backfill-product-images.ts` is the existing example.

## Verifying staging is real

Check each of these after provisioning, because each has failed silently before:

- [ ] Staging `/health` returns 200.
- [ ] Staging admin loads and a secret API key can be created.
- [ ] `psql`-free check: staging product count differs from production's after a
      sync, proving separate databases.
- [ ] A preview deployment's network tab shows requests to the **staging** host.
- [ ] Placing a staging order does **not** appear in the production admin.
- [ ] `npm run sync-inventory -- --apply` against staging needs no `--prod`.
- [ ] Prices render as figures, not "price on request" — that symptom means the
      region id is wrong for this database.
