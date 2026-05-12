# Impact Perfumes — Build Brief

You are picking up an in-progress build. The scaffold and design tokens are in place. Read this whole document before writing code.

## How to use this file

This is a self-contained handoff brief. You can:

1. Paste it into your first message to Claude Code, or
2. Rename this file to `CLAUDE.md` so Claude Code auto-loads it on every session, or
3. Reference it explicitly in prompts: "Follow `BUILD_BRIEF.md`."

Reference documents live alongside this brief:

- `docs/brand-discovery.md` — **READ FIRST**. Parses the official Number Series PDF catalogue into the brand DNA, the "Find Your Number" UX framework, the signature-color system, and updated PDP / Shop layouts.
- `data/products.seed.json` — all 50 numbered fragrances with notes, descriptors, signature colors, taglines. Source of truth for Task 19 (product seeding).
- `docs/wireframe-spec.md` — Figma-ready specs for the core pages. (NOTE: §2 Shop and §3 PDP are superseded by the layouts in `brand-discovery.md`.)
- `docs/component-checklist.md` — full inventory of components, schemas, and routes.

Always consult `brand-discovery.md` before building any UI — it's the design constitution.

---

## 1. Project context

**Impact Perfumes** is a Lagos-based luxury fragrance house. The business has been running for several years on a WordPress site at `impactperfumes.com`. The owner is migrating to a modern Next.js + headless commerce stack, benchmarked against Jo Malone London, Le Labo, and Chanel.

- Primary market: Nigeria (NGN), with diaspora and international as secondary.
- Catalog: ~8 SKUs at launch (room to grow).
- B2B offering: Bespoke bottles, Scenting Solutions, Partnerships — handled via inquiry forms that feed HubSpot.
- Client manages the site day-to-day in a non-technical way (CMS Studio + dedicated commerce admin).

## 2. Stack (locked)

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui
- **Hosting**: Netlify (deploys from `main` to `staging.impactperfumes.com`)
- **Commerce**: Medusa.js (self-hosted on Railway)
- **CMS**: Sanity (free tier)
- **Payments**: Paystack (NGN) — Flutterwave is OUT of scope
- **Email**: Resend (transactional), MailerLite (marketing)
- **CRM**: HubSpot free (B2B inquiries)
- **Analytics**: Google Analytics 4
- **Search**: client-side over Medusa initially; Algolia later if catalog grows
- **State**: Zustand (cart + UI), React Hook Form + Zod (forms)

## 3. Working rules — read these every time

- **Ask clarifying questions before assuming.** If a task is ambiguous, ask. Do not invent product names, prices, photography, or copy.
- **List the steps you will take before implementing.** Outline first, then code.
- **Keep comments concise.** Comment only what is non-obvious. No restating what the code says. No section dividers in comments. No AI, agent, or model references anywhere in the codebase or comments.
- **Use TypeScript strictly.** No `any` unless justified. Type props with interfaces named `ComponentNameProps`.
- **React Server Components by default.** Mark `"use client"` only when state, effects, or browser APIs are needed.
- **Tailwind classes only.** No inline `style` props except for genuinely dynamic values (e.g. transform with computed coordinate). Use design tokens from `tailwind.config.ts` — never arbitrary hex values.
- **Component names mirror the Figma names** in `impact-perfumes-component-checklist.md`. Same casing.
- **Forms** always use React Hook Form + Zod. Schemas in `src/lib/schemas/`.
- **Accessibility AA minimum.** Visible focus, proper labels, keyboard navigable, alt text.
- **No localStorage for sensitive data.** Cart is fine; auth/payments never.
- **Run `npm run typecheck` and `npm run lint` before committing.** Fix errors before moving on.
- **Commit messages**: short imperative, lowercase ("add product card", "wire paystack inline").
- **Never push directly to `main`.** Always work on a branch and open a PR.

## 4. Design system (already wired)

Tokens live in `tailwind.config.ts`. Use the named utilities:

| Token | Value | Tailwind |
|---|---|---|
| Bone | `#F8F5EF` | `bg-bone`, `text-bone` |
| Ink | `#1A1612` | `bg-ink`, `text-ink` |
| Accent | `#6B4423` | `bg-accent`, `text-accent` |
| Stone | `#C9C2B5` | `border-stone`, `bg-stone` |
| Mist | `#E8E2D6` | `bg-mist` |
| Slate | `#5A554E` | `text-slate` |

| Type token | Tailwind class |
|---|---|
| Display-XL (80/88) | `text-display-xl font-display` |
| Display-L (56/64) | `text-display-l font-display` |
| H1 (40/48) | `text-h1 font-display` |
| H2 (28/36) | `text-h2 font-display` |
| H3 (22/30) | `text-h3 font-display` |
| Body-L (18/28) | `text-body-l` |
| Body (16/26) | `text-body` |
| Small (14/22) | `text-small` |
| Label (12/16, +0.08em) | `text-label uppercase tracking-[0.08em]` |

Display font: **Cormorant Garamond**. Body: **Manrope**. Both loaded via `next/font/google` in `src/app/layout.tsx`.

Spacing: stick to Tailwind defaults; section padding is `py-12 md:py-16 lg:py-24` (or use the `.section-y` class). No border-radius over 2px.

## 5. Folder structure

```
src/
├─ app/                       App Router
│  ├─ (storefront)/           Public marketing routes group
│  ├─ (commerce)/             cart, checkout, order
│  ├─ studio/[[...index]]/    Embedded Sanity Studio
│  └─ api/                    Route handlers
├─ components/
│  ├─ primitives/             Button, Input, Typography
│  ├─ ui/                     Composites — ProductCard, FilterGroup, etc.
│  ├─ commerce/               Cart, Checkout, PDP blocks
│  ├─ layout/                 Header, MegaMenu, Footer, Container
│  └─ sections/               Page-level blocks
├─ hooks/
├─ lib/
│  ├─ cn.ts
│  ├─ format.ts
│  ├─ sanity.ts
│  ├─ medusa.ts
│  └─ schemas/                Zod schemas for forms
├─ sanity/
│  ├─ schemas/
│  └─ queries/
├─ store/
└─ types/
```

Always check this structure before creating files. Do not create new top-level folders without asking.

## 6. Current state — what's already built

- Next.js 14 + TS configured (`tsconfig.json`, `next.config.mjs`)
- Tailwind tokens (`tailwind.config.ts`)
- Fonts wired in `app/layout.tsx`
- Globals + focus ring + animated underline utility (`app/globals.css`)
- Placeholder home page at `/` (delete and replace when building Task 21)
- Sanity client (`lib/sanity.ts`) — needs `NEXT_PUBLIC_SANITY_PROJECT_ID` env
- Medusa client (`lib/medusa.ts`) — needs `NEXT_PUBLIC_MEDUSA_BACKEND_URL` env
- Zustand cart store (`store/cartStore.ts`) with localStorage persist
- Format helpers (`lib/format.ts` — formatNaira, formatUSD, truncate)
- shadcn/ui config (`components.json`) — run `npx shadcn-ui add <component>` to add primitives
- Netlify build config (`netlify.toml`) including security headers
- `.env.example` with every env stubbed

## 7. Build plan — remaining tasks in order

Each task is a self-contained chunk. Complete one before starting the next. After each task, run `npm run typecheck && npm run lint && npm run build` and confirm it passes.

### Task 16 — Stand up Medusa backend

- Create a separate `impact-perfumes-medusa` repo (sibling to the storefront).
- Use the official Medusa starter: `npx create-medusa-app@latest`.
- Configure for Nigeria region, NGN currency, shipping zones, basic tax.
- Deploy to Railway: create a project, add a Postgres service, deploy the Medusa repo as a Web service alongside it, set `DATABASE_URL` from the Postgres service, and configure other Medusa env vars (JWT_SECRET, COOKIE_SECRET, STORE_CORS, ADMIN_CORS pointing at the storefront origin).
- **Set a monthly spend cap before deploying.** Railway → Account Settings → Billing → Usage Limits → cap at $20/month.
- Output: deployed Medusa URL, admin login, populate `.env.local` `NEXT_PUBLIC_MEDUSA_BACKEND_URL` and `MEDUSA_ADMIN_API_KEY`.
- **Acceptance**: hit `https://<your-medusa>.up.railway.app/health`; log into the admin panel; `medusa.products.list()` from the storefront returns an empty array without error.

### Task 17 — Sanity project + Studio + schemas

- Create Sanity project at `sanity.io/manage`. Note the project ID and dataset (`production`).
- Embed Studio at `src/app/studio/[[...index]]/page.tsx`.
- Build schemas in `src/sanity/schemas/`:
  - `siteSettings` (singleton)
  - `navigation` (singleton — header columns, footer columns, mega-menu)
  - `houseStorySection` (image, eyebrow, heading, body, alignment)
  - `journalPost` (title, slug, category, hero, body Portable Text, author ref, publishedAt)
  - `author` (name, role, image, bio)
  - `perfumer` (name, bio, image)
  - `fragranceNote` (name, family, description, image)
  - `productEnrichment` (linked to Medusa SKU; story, perfumer ref, top/heart/base note refs, occasion, longevity, sillage)
  - `page` (title, slug, sections)
  - `inquiry` (B2B submissions; type, name, email, company, message, status)
  - `review` (product SKU, rating, title, body, photos, verified, status)
- Build queries in `src/sanity/queries/` as GROQ string constants.
- **Acceptance**: Studio loads at `/studio`; you can create a `journalPost` and read it back via `sanity.fetch(journalPostQuery, {slug})`.

### Task 18 — Paystack on Medusa

- Install `medusa-payment-paystack` (or build a custom provider if community plugin is stale). Flutterwave is NOT in scope.
- Wire test API keys into Medusa env.
- Verify a test order flow in Medusa admin → Paystack test card → confirm webhook fires.
- **Acceptance**: a 1 NGN test charge completes in test mode, a webhook lands at the Medusa endpoint, and an `order` record is created with `payment_status: captured`.

### Task 19 — Seed products from the Number Series catalogue

The source of truth is `data/products.seed.json` — 50 numbered EDPs parsed from the official Impact PDF catalogue. The old WP site is no longer the data source.

- Write a one-off Node script `scripts/seed-products.ts` that:
  1. Reads `data/products.seed.json`.
  2. For each entry, creates a Medusa product via the Admin API with: `handle` (e.g., `no-1`), `title` (e.g., `Impact No. 1`), `subtitle` (descriptor, e.g., `Sweet Oud`), one `productVariant` for the 100ml volume, and a placeholder price (owner will set real prices).
  3. Creates a matching Sanity `productEnrichment` document keyed by `productHandle`, populating: `number`, `descriptor`, `scentFamily`, `signatureColor`, `signatureColorName`, `tagline`, `topNotes`, `heartNotes`, `baseNotes`. Notes are stored as references to `fragranceNote` docs — the script auto-creates any note doc that doesn't yet exist.
- Images: catalogue thumbnails are placeholders only. Real lifestyle/macro photography ships later. PDP renders the bottle on the fragrance's `signatureColor` background until then.
- Stub three additional product categories with empty product lists for the client to populate later: **Impact Oils**, **Car Diffusers**, **Reed Diffusers**.
- **Acceptance**: 50 products visible in Medusa admin; matching enrichment in Sanity Studio; `/no/5` PDP renders with the cobalt background, descriptor, full notes pyramid, and tagline.

### Task 20 — Site shell

- `Container` (max-w-container, container-px)
- `Section` (vertical padding wrapper, optional bg)
- `SiteHeader`: utility bar (announcement + currency) + main row (left nav, centered logo, right icons: Search · Account · Cart)
- `MegaMenu` under SHOP and DISCOVER (see wireframe spec §1)
- `MobileMenuDrawer` (full-screen, accordion sections)
- `SiteFooter`: 4-column desktop, accordion mobile (see wireframe spec §1.11)
- Sticky main row on scroll (compress to 64h)
- **Acceptance**: navigating any route shows the correct shell; mobile drawer opens with body scroll locked; mega-menu opens on hover and is keyboard accessible.

### Task 21 — Home page

Build per wireframe spec §1. Sections in order:

- HeroSection (image or 15s loop, single headline, primary CTA)
- HousePositioningStrip (3 columns, 1 sentence each)
- FeaturedShelf (3 ProductCards from Medusa)
- EditorialBreak (full-bleed Sanity-driven post link)
- DiscoveryBlock (2 tiles: Fragrance Finder + Discovery Set)
- JournalPreview (3 latest posts from Sanity)
- NewsletterBlock
- (PressStrip — leave commented out until press logos exist)

**Acceptance**: home renders with correct rhythm at 390 / 768 / 1440; Lighthouse mobile Performance ≥ 90; no client JS for above-the-fold sections; OG card present.

### Task 22 — Shop / Collection page

Build per wireframe spec §2.

- CollectionHero
- FilterRail (desktop sticky) — Scent Family, Gender, Concentration, Size, Price, Occasion. Facet values come from product attributes synced from Medusa.
- FilterBottomSheet (mobile)
- ResultsHeader (count + sort dropdown)
- ProductGrid → ProductCard with hover crossfade to second image
- DiscoveryNudge

**Acceptance**: filters update the URL query string; back/forward buttons restore state; mobile sheet has Apply button; no layout shift on filter apply.

### Task 23 — Product Detail Page

Build per wireframe spec §3. The most important screen.

- ProductGallery (thumbs + active image, lightbox zoom)
- ProductInfoRail (sticky on desktop): collection label · name · descriptor · price · variant selector · Add to Bag · Notify me · longevity/sillage · occasion chips · trust row
- ScentNotesBlock (3 columns)
- StoryBlock (image + editorial)
- CraftAccordion
- HowToWearBlock
- ReviewsBlock (gated — only shows when at least 1 approved review exists)
- RelatedProducts (4 cards)
- DiscoveryNudge
- StickyAddToBag (mobile only, fixed bottom)

**Acceptance**: variant selection updates price and SKU without remount; Add to Bag opens cart drawer with the line item; lightbox closes on Escape; sticky add-to-bag never overlaps the footer.

### Task 24 — Cart drawer + Checkout

- `CartDrawer` (slide from right, focus trapped, body-scroll locked)
- FreeShippingBar (progress toward free-shipping threshold, configurable in Sanity siteSettings)
- CartLineItem (qty stepper, remove)
- CartUpsell (cross-sell strip)
- Single-page sectioned `Checkout` (Contact, Shipping, Payment) with sticky `OrderSummary` on desktop, accordion on mobile
- Paystack Inline JS, loaded lazily on the checkout route only
- API route handlers under `app/api/checkout/`:
  - `POST /api/checkout/verify-paystack` — verify reference server-side, mark Medusa order paid, decrement stock, send confirmation via Resend
- `OrderConfirmationView` at `/order/[id]`

**Acceptance**: end-to-end test in Paystack test mode places an order, decrements stock in Medusa, fires confirmation email (Resend test domain OK), and shows the confirmation page with order number.

### Task 25 — House Story + Journal + B2B

- `/house-story` driven by Sanity `houseStorySection` array (cinematic hero + alternating image-text + team grid + closing CTA)
- `/journal` index + `/journal/[slug]` post
- `/bespoke`, `/scenting-solutions`, `/partnerships` — same template, content from Sanity
- `B2BInquiryForm` posts to `/api/inquiries/submit` which writes to Sanity `inquiry` and POSTs to HubSpot via the Private App token

**Acceptance**: each B2B submission appears in HubSpot under "B2B Inquiries" pipeline as a new contact + deal; auto-response email lands.

### Task 26 — Discovery features

- `/fragrance-finder` — multi-step quiz (5–7 questions). State in URL query params for shareable results. Maps to GROQ query against `productEnrichment` to recommend top 3 SKUs.
- `/gift-finder` — filter form (recipient, occasion, budget) → results grid.
- `/discovery-set` — dedicated PDP for the sample set SKU.

**Acceptance**: completing the quiz returns 3 products with reasons; back button preserves quiz progress; URL is shareable.

### Task 27 — SEO + redirect map

- Build the full 301 redirect table from old WP URLs to new equivalents in `next.config.js`. Owner provides the URL list (or scrape `sitemap.xml` from the live WP site). Include `/our-brand`, `/our-team`, `/shop`, every `/product/<slug>`, `/contact`, etc.
- `next-sitemap` config; output `sitemap.xml` and `robots.txt` at build.
- Per-route `generateMetadata` with title template, description, canonical, OG image.
- JSON-LD components in `components/seo/`: `ProductLD`, `ArticleLD`, `BreadcrumbLD`, `OrganizationLD`. Inject on relevant pages.

**Acceptance**: every old URL 301s to a real new URL (no chains, no 404s); Search Console-style structured-data test passes for Product and Article; sitemap returns 200 and lists every route.

### Task 28 — Performance + accessibility + mobile QA

- Lighthouse on home, shop, PDP, checkout. Mobile target ≥ 90 on all four categories.
- Bundle budget: < 180 KB gzipped JS on home and PDP.
- Image audit — every `next/image` has `sizes`; no layout shift.
- a11y: skip-to-content, focus rings everywhere, alt text mandatory in Sanity image schema, keyboard test mega-menu / drawer / quiz / filters.
- Reduced-motion media query disables non-essential animations.
- Mobile device test on iOS Safari and Android Chrome.

**Acceptance**: Lighthouse report attached to the QA PR; axe-core scan returns 0 critical issues.

### Task 14 — DNS cutover

Owner-led task. You produce a runbook:

- 24 hours before: lower TTL on existing DNS records to 300s
- Cutover window: update A/CNAME records to point `impactperfumes.com` → Netlify
- Verify SSL provisions; verify redirects from old URLs work
- Monitor for 24 hours
- Old WP host can be decommissioned 7 days after success

## 8. Things to ask the owner before assuming

- Product enrichment copy (notes, stories, perfumer attribution per SKU). Do not invent.
- Brand photography — do not generate or use placeholder stock long-term. If unavailable, use clearly labeled placeholders and surface the gap to the owner.
- WC REST API credentials for product migration.
- Paystack merchant API keys (test first, then live).
- Sanity project ID (after they create the project).
- Railway project URL for Medusa.
- The full list of old WP URLs to redirect (or permission to crawl the live sitemap).
- Press logos, social handles, stockist list — content for the home page strip and footer.
- Bespoke/B2B copy and case studies.

## 9. Definition of done (for the whole project)

- All 14 remaining tasks completed and passing acceptance criteria.
- All routes render at 390 / 768 / 1440 without horizontal scroll.
- Lighthouse mobile ≥ 90 across the 4 categories on home, shop, PDP, checkout.
- End-to-end test order succeeds in Paystack live mode (small real charge, refunded).
- Owner has logged into Sanity Studio, Medusa Admin, and HubSpot once and can perform the basic operations: add a product, edit House Story, publish a journal post, fulfill an order, view an inquiry.
- DNS cutover plan written and rehearsed on staging.
- Final QA PR includes Lighthouse report, axe-core scan, screenshots of each page on mobile + desktop.

## 10. Quick reference — the first command after cloning

```bash
npm install
cp .env.example .env.local
# fill in Sanity, Medusa, Paystack, Resend, HubSpot keys
npm run dev
```

Then open `http://localhost:3000`. Begin with Task 16.
