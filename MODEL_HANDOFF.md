# Model Handoff — pick up the Impact Perfumes build

This file lets a new model session take over the project cleanly. Read it once at the start of every session.

## What this project is

Impact Perfumes & Oils — a Lagos-based luxury fragrance house (running for several years) is migrating its e-commerce off WordPress to a modern Next.js + headless commerce stack benchmarked against Jo Malone London, Le Labo, and Chanel. The hero collection is a **"Number Series"** of 50 numbered Eau de Parfum signatures. Each fragrance has its own signature color and scent family. The number is the brand's identity hook ("You're a No. 14").

## Where we are right now (as of 2026-05-21)

The site is **live in production** on Vercel at `https://impact-perfume.vercel.app`. All initial build tasks (20–28) shipped. The current focus is reliability hardening + owner-side handoff.

**Live capabilities:**

- Storefront fully built: Home, /no-series (Number Wall, 50 tiles), /oils (50 oil PDPs), /signature (4 + Mystikal), /gifts, /b2b, /bespoke, /quiz, /house-story, /journal, /checkout, /order-confirmed, Sanity Studio at /studio. ~21 pages total.
- Catalogue: 109 variants — 50 Number Series EDPs + 50 Impact Oils + 4 Signature + Mystikal. Two regions: Nigeria (NGN/Paystack) and Canada (CAD/Stripe). Geo middleware auto-detects via Vercel IP; manual region switcher persists choice with `impact_region_manual=1` cookie so a VPN flip doesn't override the user.
- Payments end-to-end: Paystack inline + Stripe Payment Element (with Apple Pay / Google Pay). Both verify server-side and now have signed webhooks (`/api/webhooks/paystack`, `/api/webhooks/stripe`) for browser-died fallback. Fulfilment is idempotent via the `processedPayment` Sanity doc.
- Order pipeline: payment success → Medusa draft-order → convert-to-order → payment_collection → mark-as-paid (orders land in Orders tab with `payment_status=captured`). Resend sends redesigned dark-luxe transactional emails (customer + business) with the Impact logo.
- Cache pipeline: ISR with 60s data revalidation, `/api/revalidate` for on-demand path flushes, Medusa webhook receiver for auto-invalidate when products change (storefront half is wired; Medusa-side subscriber on Railway is still owner-todo).
- Tooling: seed-products, seed-oils, seed-signature, seed-reviews, export-prices, import-cad-prices, migrate-prices-to-major. CSV-based pricing workflow for the owner.
- Sanity: 13 schemas registered (productEnrichment, fragranceNote, perfumer, review, journalPost, author, houseStorySection, page, inquiry, pendingCart, processedPayment, siteSettings, navigation). 10 launch reviews seeded as `status=pending`.

**Owner-side actions still pending (cannot be done by a model):**

| Item | Where |
|---|---|
| Place a real test order to validate the full Paystack/Stripe → Medusa → email chain | Storefront |
| Add Stripe webhook signing secret (`STRIPE_WEBHOOK_SECRET`) on Vercel after creating the endpoint in Stripe dashboard | Vercel + Stripe |
| Register the Paystack webhook URL in Paystack dashboard | Paystack |
| Add Medusa subscriber file + 2 env vars on Railway for auto cache invalidation | Railway + Medusa repo |
| Register Apple Pay merchant domain in Stripe | Stripe dashboard |
| Attach custom domain (`impactperfumes.com`) on Vercel and update `NEXT_PUBLIC_SITE_URL` | Vercel + DNS |
| Approve any seeded reviews in Sanity Studio that match real feedback heard | Sanity Studio |
| Number Series product photography (currently using fallback bottle render) | Owner-supplied |
| 301 redirect map from old WordPress URLs to new routes (Task 27) | Owner-supplied |
| iPhone QA pass on live site | Owner-driven |

**Most recent shipped commits (top of `main`):**

- `2a2495e` redesign transactional emails in dark-luxe brand language (with logo header)
- `eb9dd3e` payment webhooks for Paystack + Stripe with idempotent fulfilment
- `e4a6dcd` cart thumbnail fallback, oil-aware cross-sell, recently-viewed auto-track
- `f652878` seed-reviews script for draft reviews in Sanity
- `dee234d` align price units with Medusa v2 (major units) + capture payment

## Stack (locked, do not propose alternatives)

- Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui
- Hosting: Netlify (storefront), Railway (Medusa)
- Commerce: Medusa.js v2
- CMS: Sanity (Free tier)
- Hosting: **Vercel** (storefront), **Railway** (Medusa)
- Payments: **Paystack** (NGN, Nigeria region) + **Stripe** (CAD, Canada region) — webhooks live on both, with idempotency. Flutterwave was removed.
- Email: Resend (transactional). MailerLite (newsletter).
- CRM: HubSpot Free (B2B inquiries).
- Analytics: GA4.

## Files to read at the start of every session

In this order:

1. **`CLAUDE.md`** (or `BUILD_BRIEF.md` if not renamed) — project rules, full task list, conventions.
2. **`docs/brand-discovery.md`** — design constitution. The Number Series UX framework, the 17 scent families, the "Find Your Number" quiz logic, the new PDP and Shop layouts. Supersedes `docs/wireframe-spec.md` §2 and §3.
3. **`data/products.seed.json`** — the source of truth for all 50 fragrances. Notes, scent families, signature colors, taglines.
4. **`docs/component-checklist.md`** — full component / schema / route inventory.
5. **`docs/wireframe-spec.md`** — for pages 1, 4, 5 (Home, Cart/Checkout, House Story). Pages 2 (Shop) and 3 (PDP) are SUPERSEDED by `brand-discovery.md`.

## Working rules (the owner's preferences — follow strictly)

- **Ask clarifying questions before assuming.** Especially on: prices, copy, imagery, brand voice. Do not invent.
- **List the steps you'll take before implementing.** Outline → confirm → code.
- **No references to AI, agents, or any model in code or comments.** Anywhere. Including filenames.
- **Concise comments only.** Don't restate what code says.
- **TypeScript strict.** No `any` without justification.
- **React Server Components by default.** `"use client"` only when needed.
- **Tailwind classes only.** Use design tokens (especially the `no-1` … `no-50` palette). Never arbitrary hex.
- **Forms**: React Hook Form + Zod. Schemas in `src/lib/schemas/`.
- **Accessibility AA minimum.** Visible focus, alt text, keyboard nav.
- **Run `npm run typecheck && lint && build`** before committing each task.
- **Commit messages**: short, imperative, lowercase ("add product card", not "Added product card").
- **Branch + PR workflow.** Never push to `main`.

## Known gotchas — flag and fix before they bite

1. **Write token mismatch** for the seed script. The Sanity token saved in env is **Viewer (read-only)**. Seeding writes documents and will fail. The owner needs to generate a second token with **Editor** or **Developer** permission and store it as `SANITY_API_WRITE_TOKEN`. Update `scripts/seed-products.ts` to use that variable. **Do this before running the seed.**
2. **Placeholder pricing.** All 50 SKUs are ₦50,000. Discovery Set is ₦25,000. The owner must provide the real price list before launch.
3. **Catalogue numbering quirk.** The official PDF labels two pages "43" and skips "42." We corrected this in `products.seed.json` — Impact No. 42 is the Rose fragrance (yellow background) that the PDF mislabels as 43. If the owner asks why, this is the explanation.
4. **Redis fake fallback** on Medusa. Production logs show `redisUrl not found. A fake redis instance will be used.` It works for staging but must be fixed before launch by wiring Redis modules properly in `medusa-config.ts` using `process.env.REDIS_URL`.
5. **Render free tier was abandoned** — we're on Railway Hobby. Don't propose Render again.
6. **Domain DNS is currently on Netlify** — staging will live at `staging.impactperfumes.com`. Cutover (Task 14) is last.

## Live credentials and URLs

Active values from earlier sessions (replace as needed in env):

| Var | Value |
|---|---|
| Medusa backend URL | `https://impact-perfumes-medusa-production.up.railway.app` |
| Medusa admin URL | `https://impact-perfumes-medusa-production.up.railway.app/app` |
| Sanity project ID | `rryknw9w` |
| Sanity dataset | `production` |
| Sanity organization ID | `oJMxGfFXK` |
| GitHub repos | Storefront: `0niran/impact-perfume`. Medusa: `0niran/impact-perfumes-medusa`. |

The owner holds: Paystack API keys, Sanity tokens, Medusa admin credentials, HubSpot keys, Resend keys. Never ask the human to paste secrets in chat.

## Things only the human (owner) can provide

If you need any of these and they're missing, **stop and ask** — do not invent:

- **Prices** for any product.
- **Real photography** — campaign, lifestyle, ingredient macro. Catalogue thumbnails are placeholder only.
- **Discovery Set composition** — which 5 of the 50 are in it.
- **The catalogue lists for Oils, Car Diffusers, Reed Diffusers** — not in the PDF.
- **Press logos, retailer/stockist list.**
- **B2B copy** (Bespoke, Scenting Solutions, Partnerships).
- **Brand photography rights, fonts (if non-Google), and any custom imagery.**
- **Old WordPress URL list** for the 301 redirect map (Task 27).

## How the owner communicates

- Direct, no fluff. Concise > thorough.
- Hates emojis in code/comments. Won't use them in chat much either.
- Wants to see the plan before execution. "Always list steps and processes before going ahead to implement."
- Allergic to AI-talk. Don't reference Claude, Claude Code, models, or AI in any code, file, or product copy.
- Doesn't always know the answer to technical questions but is decisive once given options. Give them 2–4 options with a recommendation.

## Recommended first action for the new session

The site is live; build-out is done. Pick up by:

1. Read this file + `docs/payment-webhooks-setup.md` + `docs/medusa-webhook-setup.md` + `docs/brand-discovery.md` (for any design questions).
2. Run `git log --oneline -20` to see the most recent shipped work.
3. Ask the owner which open thread they want to advance — most are now owner-side actions (see "Owner-side actions still pending" above). On the storefront side, common next-up work: real Number Series photography integration, custom domain attach, iPhone QA pass.
4. When the owner has completed the dashboard configurations (Stripe webhook secret, Paystack webhook URL, Medusa subscriber), help them run a real test order and verify the full chain (Paystack/Stripe → Medusa Orders → Resend email → Sanity processedPayment lock).

## File map (where things live in the repo)

```
impact-perfume/
├─ CLAUDE.md (or BUILD_BRIEF.md)    Project constitution
├─ MODEL_HANDOFF.md                 This file
├─ KICKOFF_PROMPT.md                Initial kickoff prompt
├─ SANITY_HANDOFF.md                Original Sanity setup notes
├─ data/
│  └─ products.seed.json            50 fragrances — source of truth
├─ docs/
│  ├─ brand-discovery.md            Design constitution (READ FIRST)
│  ├─ wireframe-spec.md             Pages 1, 4, 5
│  └─ component-checklist.md        Full component inventory
├─ scripts/
│  └─ seed-products.ts              Run with: npm run seed-products
├─ sanity.config.ts
├─ src/
│  ├─ app/
│  │  ├─ studio/[[...tool]]/page.tsx
│  │  ├─ layout.tsx
│  │  └─ page.tsx (placeholder home)
│  ├─ sanity/
│  │  ├─ schemas/                   11 schemas registered
│  │  └─ queries/
│  ├─ lib/                          cn, format, sanity, medusa
│  └─ store/cartStore.ts
└─ tailwind.config.ts                Includes the `no-1` … `no-50` palette
```

## Closing note

This is a multi-week build for a real business with several years of operation. Quality > speed. When in doubt, ask the owner. The brand discovery doc is the single most important reference — every UI decision should reinforce the Number Series identity.
