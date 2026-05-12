# Model Handoff — pick up the Impact Perfumes build

This file lets a new model session take over the project cleanly. Read it once at the start of every session.

## What this project is

Impact Perfumes & Oils — a Lagos-based luxury fragrance house (running for several years) is migrating its e-commerce off WordPress to a modern Next.js + headless commerce stack benchmarked against Jo Malone London, Le Labo, and Chanel. The hero collection is a **"Number Series"** of 50 numbered Eau de Parfum signatures. Each fragrance has its own signature color and scent family. The number is the brand's identity hook ("You're a No. 14").

## Where we are right now

**Done (Tasks 15–17, 19, 29):**

- Next.js 14 storefront scaffold deployed (Tailwind + shadcn primitives, design tokens, `next/font` Cormorant + Manrope).
- Medusa.js commerce backend live on Railway (Hobby plan, $20/mo cap). Admin user created. URL: `https://impact-perfumes-medusa-production.up.railway.app/app`.
- Sanity project created (project ID: **`rryknw9w`**, dataset `production`, organization `Niran`). Read token saved (Viewer scope). CORS origins added for `localhost:3000`, `localhost:3333`, `staging.impactperfumes.com`.
- Brand discovery applied: 50-color signature palette in `tailwind.config.ts`, full Sanity schema system, all 11 schemas registered.
- Product seeding script written: `scripts/seed-products.ts`. Reads `data/products.seed.json` (50 fragrances parsed from the official catalogue PDF). ₦50,000 placeholder pricing across the board. Discovery Set product at ₦25,000. Three product-line placeholders for Oils / Car Diffusers / Reed Diffusers.

**Pending (in priority order):**

| # | Task | Notes |
|---|---|---|
| 18 | Configure **Paystack** on Medusa | Flutterwave is OUT. Browser-driven setup likely needed by the human. |
| 20 | Build site shell (Header, mega-menu, Footer, layout) | Local Claude Code work. The mega-menu structure is in `docs/brand-discovery.md` §"Product line architecture". |
| 21 | Build Home page | Hero, House Positioning Strip, Featured Shelf (3 from Medusa), Editorial Break, Discovery Block, Journal Preview, Newsletter. |
| 22 | Build Shop page = **the Number Wall** | 50 colored tiles in a grid, each rendering its medallion. THIS is the brand's signature on-site experience. See `docs/brand-discovery.md`. |
| 23 | Build PDP | New layout: full-bleed signature-color hero (left) + sticky info rail (right). See `docs/brand-discovery.md` §"Updated PDP structure". |
| 24 | Build Cart drawer + Checkout | Paystack Inline JS only. |
| 25 | Build House Story, Journal, B2B pages | Driven from Sanity. |
| 26 | Build Fragrance Finder, Gift Finder, Discovery Set | Quiz logic spelled out in `docs/brand-discovery.md` §"Fragrance Finder — concrete logic". |
| 27 | SEO + 301 redirect map | Owner provides old URL list. |
| 28 | Performance, accessibility, mobile QA pass | Lighthouse ≥ 90 mobile across Performance, A11y, Best Practices, SEO. |
| 14 | DNS cutover | Last step. Lower TTL → switch DNS to Netlify → old WP goes dark. |

## Stack (locked, do not propose alternatives)

- Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui
- Hosting: Netlify (storefront), Railway (Medusa)
- Commerce: Medusa.js v2
- CMS: Sanity (Growth Trial → Free in 30 days)
- Payments: **Paystack only** (NGN). Flutterwave was removed.
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

Run this checklist:

1. Read `CLAUDE.md`, `docs/brand-discovery.md`, `data/products.seed.json`.
2. Confirm the seeding has actually been run (50 products in Medusa admin, 50 enrichment docs in Sanity). If not, fix the write token issue first (gotcha #1) and run it.
3. Ask the owner which task they want next. Recommend Task 20 (site shell + Number Wall) — it produces the most visible progress and unlocks Tasks 21–23.
4. Before writing code for Task 20, list the steps you'll take and ask for confirmation.

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
