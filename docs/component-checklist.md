# Impact Perfumes — Next.js Component Checklist

A buildable inventory for the Next.js 14 (App Router) + Sanity + Netlify stack. Every component, hook, schema, and route the storefront needs, grouped so it can be tracked as a sprint backlog.

Conventions:
- React Server Components by default; mark `"use client"` only where state, effects, or browser APIs are needed (noted with **client**).
- TypeScript everywhere. Props typed via interfaces named `ComponentNameProps`.
- Styling via Tailwind + CSS variables for tokens. shadcn/ui as the primitive base where applicable.
- Component names match Figma component names 1:1.

---

## 1. Repository structure

```
src/
├─ app/
│  ├─ (storefront)/
│  │  ├─ layout.tsx
│  │  ├─ page.tsx                       # Home
│  │  ├─ shop/
│  │  │  ├─ page.tsx                    # Shop index
│  │  │  └─ [collection]/page.tsx       # Collection
│  │  ├─ product/[slug]/page.tsx        # PDP
│  │  ├─ journal/
│  │  │  ├─ page.tsx
│  │  │  └─ [slug]/page.tsx
│  │  ├─ house-story/page.tsx
│  │  ├─ fragrance-finder/page.tsx
│  │  ├─ gift-finder/page.tsx
│  │  ├─ discovery-set/page.tsx
│  │  ├─ bespoke/page.tsx
│  │  ├─ scenting-solutions/page.tsx
│  │  ├─ partnerships/page.tsx
│  │  └─ (legal)/{shipping,returns,privacy,terms}/page.tsx
│  ├─ (commerce)/
│  │  ├─ cart/page.tsx
│  │  ├─ checkout/page.tsx
│  │  └─ order/[id]/page.tsx
│  ├─ studio/[[...index]]/page.tsx      # Embedded Sanity Studio
│  └─ api/
│     ├─ checkout/verify-paystack/route.ts
│     ├─ checkout/verify-flutterwave/route.ts
│     ├─ orders/create/route.ts
│     ├─ inquiries/submit/route.ts
│     ├─ newsletter/subscribe/route.ts
│     └─ revalidate/route.ts
├─ components/
│  ├─ primitives/
│  ├─ ui/
│  ├─ commerce/
│  ├─ layout/
│  ├─ sections/
│  └─ forms/
├─ hooks/
├─ lib/
├─ sanity/
│  ├─ schemas/
│  ├─ queries/
│  ├─ client.ts
│  └─ image.ts
├─ store/
├─ styles/
└─ types/
```

---

## 2. Foundations

- [ ] `tailwind.config.ts` — color tokens, type scale, spacing scale, fontFamily map, no default rounding.
- [ ] `app/globals.css` — CSS variables for tokens, base resets, font imports.
- [ ] `lib/cn.ts` — `clsx` + `tailwind-merge` helper.
- [ ] `lib/format.ts` — `formatNaira(n)`, `formatUSD(n)`, `formatDate(d)`, `truncate(s, n)`.
- [ ] `lib/seo.ts` — `buildMetadata({...})` helper for `generateMetadata`.
- [ ] `lib/env.ts` — typed env access via `zod` (Paystack keys, Sanity tokens, etc.).
- [ ] `types/index.ts` — shared types: `Product`, `Variant`, `CartItem`, `Order`, `JournalPost`.

---

## 3. Primitives (atoms) — `/components/primitives`

- [ ] `Typography` (Display, H1, H2, H3, Body, BodyLarge, Small, Label, Eyebrow)
- [ ] `Button` (variant: primary | secondary | tertiary, size: sm | md | lg, loading state)
- [ ] `IconButton`
- [ ] `Link` (wraps `next/link`, applies underline animation)
- [ ] `Input` (with floating label, error state)
- [ ] `Textarea`
- [ ] `Select`
- [ ] `Checkbox`
- [ ] `Radio`
- [ ] `Toggle` **client**
- [ ] `SegmentedControl` **client**
- [ ] `Badge` (variant: default | success | error | limited)
- [ ] `Chip` (closable, used for filter chips)
- [ ] `Tooltip` **client**
- [ ] `Divider`
- [ ] `Spinner`
- [ ] `Skeleton`
- [ ] `Icon` (lucide-react wrapper, fixed sizes)
- [ ] `VisuallyHidden` (a11y)

---

## 4. UI composites (molecules) — `/components/ui`

- [ ] `BreadcrumbTrail`
- [ ] `Pagination` **client**
- [ ] `Tabs` **client**
- [ ] `AccordionItem` / `Accordion` **client**
- [ ] `SortDropdown` **client**
- [ ] `FilterChip`
- [ ] `FilterGroup` (collapsible group with checkboxes)
- [ ] `RangeSlider` **client** (for price filter)
- [ ] `SearchBar` **client** (with debounce + dropdown results)
- [ ] `SearchResultsDropdown`
- [ ] `Drawer` **client** (right-slide for cart, bottom-sheet on mobile)
- [ ] `Modal` **client**
- [ ] `Toast` **client** (via `sonner` or custom)
- [ ] `Lightbox` **client** (image zoom)
- [ ] `Carousel` **client** (embla-carousel-react)
- [ ] `VideoPlayer` (HLS or simple `<video>`, muted loop preset)
- [ ] `ProgressBar` (free-shipping bar)
- [ ] `RatingStars`
- [ ] `RatingDistribution`
- [ ] `NoteBadge` (single note pill)
- [ ] `ImageWithFallback` (wraps `next/image`, Sanity URL builder)

---

## 5. Layout & navigation — `/components/layout`

- [ ] `SiteHeader` (composes UtilityBar, MainNav, IconRow)
- [ ] `UtilityBar`
- [ ] `MainNav` **client** (handles hover state for mega-menu)
- [ ] `MegaMenuPanel`
- [ ] `MobileMenuDrawer` **client**
- [ ] `IconRow` (search, account, cart with count badge)
- [ ] `SiteFooter`
- [ ] `FooterColumn`
- [ ] `Container` (max-width wrapper, responsive padding)
- [ ] `Section` (vertical padding wrapper, optional background)
- [ ] `Grid` (12/8/4 col, generic)
- [ ] `Stack` (vertical auto-layout)
- [ ] `Cluster` (horizontal auto-layout with wrap)
- [ ] `SkipToContent` (a11y first focusable)

---

## 6. Page sections (organisms) — `/components/sections`

### Home
- [ ] `HeroSection`
- [ ] `HousePositioningStrip`
- [ ] `FeaturedShelf` (composes ProductCard ×3)
- [ ] `EditorialBreak`
- [ ] `DiscoveryBlock` (2 tiles)
- [ ] `JournalPreview` (composes JournalCard ×3)
- [ ] `PressStrip`
- [ ] `NewsletterBlock`

### Shop
- [ ] `CollectionHero`
- [ ] `FilterRail` (desktop, sticky)
- [ ] `FilterBottomSheet` **client** (mobile)
- [ ] `ResultsHeader` (count + sort)
- [ ] `ProductGrid`
- [ ] `LoadMoreTrigger` **client**
- [ ] `DiscoveryNudge`

### PDP
- [ ] `ProductGallery` **client** (thumbs + active image + zoom)
- [ ] `ProductInfoRail` (sticky, composes price, variants, CTAs, trust row)
- [ ] `VariantSelector` **client**
- [ ] `AddToBagButton` **client**
- [ ] `NotifyMeButton` **client**
- [ ] `WishlistButton` **client**
- [ ] `StrengthIndicator` (longevity / sillage dots)
- [ ] `OccasionTags`
- [ ] `TrustRow`
- [ ] `ScentNotesBlock` (3 columns: Top / Heart / Base)
- [ ] `NoteColumn`
- [ ] `StoryBlock` (image + editorial text)
- [ ] `CraftAccordion`
- [ ] `HowToWearBlock`
- [ ] `ReviewsBlock` **client**
- [ ] `ReviewCard`
- [ ] `WriteReviewModal` **client**
- [ ] `RelatedProducts`
- [ ] `StickyAddToBag` **client** (mobile only)

### Cart + Checkout
- [ ] `CartDrawer` **client**
- [ ] `CartLineItem` **client**
- [ ] `CartUpsell`
- [ ] `FreeShippingBar`
- [ ] `CheckoutLayout` (minimal header, body, summary)
- [ ] `CheckoutContactSection`
- [ ] `CheckoutShippingSection`
- [ ] `CheckoutPaymentSection` **client**
- [ ] `PaymentTab` (Paystack / Flutterwave selector)
- [ ] `OrderSummary` (sticky)
- [ ] `OrderSummaryAccordion` **client** (mobile)
- [ ] `PromoCodeInput` **client**
- [ ] `PlaceOrderButton` **client**
- [ ] `OrderConfirmationView`

### House Story
- [ ] `HouseStoryHero`
- [ ] `EditorialPair` (image + text, alternating)
- [ ] `FullBleedEditorial`
- [ ] `TeamGrid`
- [ ] `TeamCard`
- [ ] `ClosingCTA`

### Journal
- [ ] `JournalCard`
- [ ] `JournalHeroFeatured`
- [ ] `JournalGrid`
- [ ] `JournalPostHeader`
- [ ] `JournalProse` (typographic article styles + rich text serializers)
- [ ] `PullQuote`
- [ ] `JournalRelated`

### B2B
- [ ] `B2BHero`
- [ ] `B2BProcessSteps`
- [ ] `B2BCaseStudyCarousel`
- [ ] `B2BInquiryForm` **client**

### Discovery features
- [ ] `FragranceFinderQuiz` **client**
- [ ] `QuizQuestion` **client**
- [ ] `QuizResults`
- [ ] `GiftFinder` **client**
- [ ] `DiscoverySetCard`

### Commerce-specific cards
- [ ] `ProductCard` (default grid card)
- [ ] `ProductCardCompact` (cross-sell, cart upsell)
- [ ] `PriceDisplay` (handles strike-through, badge)
- [ ] `QuickViewModal` **client**

---

## 7. Forms — `/components/forms`

All forms use **React Hook Form** + **Zod** schemas. Schemas live in `/lib/schemas/`.

- [ ] `NewsletterForm` **client**
- [ ] `ContactForm` **client**
- [ ] `B2BInquiryForm` **client**
- [ ] `NotifyMeForm` **client**
- [ ] `ReviewForm` **client**
- [ ] `CheckoutContactForm` **client**
- [ ] `CheckoutShippingForm` **client**
- [ ] Zod schemas: `newsletterSchema`, `contactSchema`, `inquirySchema`, `notifySchema`, `reviewSchema`, `checkoutSchema`.

---

## 8. State management — `/store`

Zustand stores. All persisted via `persist` middleware where appropriate.

- [ ] `cartStore` (items, add, remove, update qty, clear, totals selector)
- [ ] `uiStore` (cart drawer open, mobile menu open, search open)
- [ ] `recentlyViewedStore`
- [ ] `wishlistStore` (localStorage-backed at first; tie to account later)
- [ ] `quizStore` (Fragrance Finder progress)

---

## 9. Hooks — `/hooks`

- [ ] `useCart` (selectors for cart store)
- [ ] `useCartTotals` (subtotal, shipping, total computation)
- [ ] `useMediaQuery`
- [ ] `useScrollDirection` (header compress on scroll-down)
- [ ] `useLockBodyScroll`
- [ ] `useDebounce`
- [ ] `useLocalStorage`
- [ ] `useEscapeKey` (close drawers/modals)
- [ ] `useFocusTrap` (drawers/modals)
- [ ] `useSanityImage` (URL builder + responsive sizes)
- [ ] `usePaystack` (loads inline script, opens checkout)
- [ ] `useFlutterwave`
- [ ] `useAnalytics` (GA4 event helper)

---

## 10. Sanity layer — `/sanity`

### Schemas — `/sanity/schemas`

- [ ] `siteSettings` — singleton: brand name, logo, default OG image, social links, default SEO.
- [ ] `navigation` — singleton: header columns, mega-menu structure, footer columns.
- [ ] `product` — name, slug, description (rich), story, perfumer (ref), notes (top/heart/base arrays of refs), gender, scentFamily, occasion[], collection (ref), images, defaultVariant.
- [ ] `productVariant` — size (30/50/100), concentration, sku, price, stock (number), barcode, weight.
- [ ] `fragranceNote` — name, description, image.
- [ ] `perfumer` — name, bio, image.
- [ ] `collection` — name, slug, description, heroImage, products[].
- [ ] `journalPost` — title, slug, category, excerpt, hero, body (Portable Text), author (ref), publishedAt.
- [ ] `author` — name, role, image, bio.
- [ ] `page` — title, slug, sections (Portable Text or block array).
- [ ] `order` — orderNumber, customer, items[], totals, paymentRef, status (pending / paid / fulfilled / refunded), fulfillmentTracking.
- [ ] `inquiry` — type (bespoke / scenting / partnerships), name, company, email, message, status.
- [ ] `review` — product (ref), rating, title, body, photos[], verified, status (pending / approved / rejected).
- [ ] `promo` — code, type (percentage / fixed / free-ship), value, validFrom, validTo, minSubtotal.

### Queries — `/sanity/queries`

GROQ string constants. One per query.

- [ ] `siteSettingsQuery`
- [ ] `navigationQuery`
- [ ] `homePageQuery` (featured products + recent journal)
- [ ] `productListQuery(filters)`
- [ ] `productBySlugQuery(slug)`
- [ ] `relatedProductsQuery(productId, scentFamily)`
- [ ] `journalListQuery(limit, offset)`
- [ ] `journalPostQuery(slug)`
- [ ] `pageBySlugQuery(slug)`
- [ ] `searchQuery(term)`
- [ ] `quizMatchQuery(answers)`

### Studio configuration

- [ ] `sanity.config.ts` — workspace name, dataset, schema imports.
- [ ] Custom desk structure: top-level groups for **Shop** (Products, Variants, Collections, Notes, Perfumers), **Content** (Journal, Authors, Pages), **Operations** (Orders, Inquiries, Reviews, Promos), **Settings** (Site, Navigation).
- [ ] Live Preview pane on Product and JournalPost docs.
- [ ] `defaultDocumentNode` to expose preview iframe.
- [ ] Webhooks: on `order.create` → email confirmation; on `product.update` → revalidate Next.js path.

---

## 11. API routes (Netlify Functions) — `/app/api`

- [ ] `POST /api/checkout/verify-paystack` — verify reference with Paystack secret key, write order to Sanity, decrement stock, send email.
- [ ] `POST /api/checkout/verify-flutterwave` — same flow for Flutterwave.
- [ ] `POST /api/orders/create` — internal helper called by verify routes.
- [ ] `POST /api/inquiries/submit` — write to Sanity + POST to HubSpot.
- [ ] `POST /api/newsletter/subscribe` — POST to MailerLite.
- [ ] `POST /api/revalidate` — Sanity webhook receiver, calls `revalidatePath`/`revalidateTag`.
- [ ] `POST /api/reviews/submit` — moderation queue (status: pending).
- [ ] `GET  /api/sitemap` — generates `/sitemap.xml` from Sanity content.
- [ ] `POST /api/og` (optional) — dynamic OG image generation.

All routes:
- Validate input with Zod.
- Return typed JSON.
- Use rate limiting via Upstash or simple IP throttle.
- Log to a single observability target (Sentry or LogSnag free tier).

---

## 12. Payments

- [ ] Paystack Inline JS loaded lazily on checkout route only.
- [ ] Paystack public key in env (`NEXT_PUBLIC_PAYSTACK_KEY`).
- [ ] Paystack secret key server-only (`PAYSTACK_SECRET_KEY`).
- [ ] Equivalent for Flutterwave.
- [ ] Webhook endpoints registered in Paystack/Flutterwave dashboards pointing to verify routes.
- [ ] Idempotency: orders keyed on payment reference; double-write guard in API route.

---

## 13. Performance

- [ ] All pages use Server Components for data fetching with Sanity CDN + `revalidate` (ISR).
- [ ] Images via `next/image` + Sanity URL builder; sizes attribute per breakpoint.
- [ ] Fonts via `next/font` (self-hosted); `font-display: swap`.
- [ ] Critical CSS inlined by Next.js automatically.
- [ ] Defer/lazy-load: ReviewsBlock, ProductGallery zoom, Lightbox, FragranceFinderQuiz.
- [ ] No client-side data fetching for above-the-fold product data.
- [ ] Lighthouse target: Performance ≥ 90, Accessibility ≥ 95, SEO ≥ 95, Best Practices ≥ 95.
- [ ] Bundle budget: < 180KB gzipped JS on home and PDP.

---

## 14. SEO & metadata

- [ ] `generateMetadata` exported from every route.
- [ ] JSON-LD components: `<ProductLD>`, `<ReviewLD>`, `<BreadcrumbLD>`, `<OrganizationLD>`, `<ArticleLD>`.
- [ ] OG images per page (Sanity field or `/api/og` route).
- [ ] `sitemap.xml` and `robots.txt` generated.
- [ ] Canonical URLs on every page.
- [ ] 301 redirects map (in `next.config.js`) for any legacy URLs.

---

## 15. Accessibility

- [ ] Skip-to-content link.
- [ ] All images alt text (Sanity required field).
- [ ] All form fields labeled, errors `aria-describedby`.
- [ ] Focus trap inside Drawer / Modal; focus restoration on close.
- [ ] Visible focus ring on every focusable.
- [ ] Color contrast verified at AA minimum.
- [ ] Keyboard nav: full mega-menu, filter sheet, gallery, quiz.
- [ ] Reduced-motion media query disables non-essential animations.

---

## 16. Analytics & tracking

- [ ] GA4 via `@next/third-parties`.
- [ ] Google Search Console verified.
- [ ] Events: `view_item`, `add_to_cart`, `begin_checkout`, `purchase`, `newsletter_signup`, `inquiry_submit`, `quiz_complete`.
- [ ] Meta Pixel optional.
- [ ] Plausible or Umami optional self-host on Netlify.

---

## 17. Error & empty states

- [ ] Global `error.tsx` and `not-found.tsx` with on-brand 404 + 500 designs.
- [ ] Empty cart view inside `CartDrawer`.
- [ ] Empty search results view.
- [ ] No-reviews-yet → hide block until reviews exist (do not show empty state).
- [ ] Out-of-stock → swap CTA to `NotifyMeButton`.

---

## 18. Testing

- [ ] **Playwright** end-to-end:
  - Browse home → Shop → PDP.
  - Add to cart → cart drawer → checkout → confirmation (Paystack test mode).
  - Submit B2B inquiry.
  - Subscribe to newsletter.
- [ ] **Vitest** unit tests:
  - `formatNaira`, cart store reducers, total calculations, schema validators.
- [ ] **Lighthouse CI** in Netlify build pipeline.
- [ ] Visual regression (Percy/Chromatic) — defer until post-launch.

---

## 19. Environment variables

```
NEXT_PUBLIC_SANITY_PROJECT_ID=
NEXT_PUBLIC_SANITY_DATASET=
SANITY_API_TOKEN=
SANITY_WEBHOOK_SECRET=

NEXT_PUBLIC_PAYSTACK_KEY=
PAYSTACK_SECRET_KEY=

NEXT_PUBLIC_FLUTTERWAVE_KEY=
FLUTTERWAVE_SECRET_KEY=

RESEND_API_KEY=
MAILERLITE_API_KEY=
HUBSPOT_PRIVATE_APP_TOKEN=

NEXT_PUBLIC_GA_ID=
NEXT_PUBLIC_SITE_URL=https://impactperfumes.com
```

---

## 20. Build & launch checklist

### Pre-launch
- [ ] All schemas seeded with at least the 8 current products (enriched).
- [ ] House Story content written and approved.
- [ ] Journal seeded with 4–6 launch articles.
- [ ] Photography assets uploaded with proper alt text.
- [ ] Paystack/Flutterwave merchant accounts in live mode.
- [ ] Shipping zones and rates configured (Lagos, Nigeria, international).
- [ ] Returns and shipping pages drafted.
- [ ] Email templates designed (order confirm, shipping notice, inquiry auto-reply).
- [ ] Test orders placed end-to-end in production (small amount, refunded).
- [ ] DNS pointed to Netlify, SSL verified.
- [ ] Sitemap submitted to Google Search Console.

### Day 1
- [ ] Launch announcement email and social post.
- [ ] Monitoring open: Netlify analytics, Sentry, Sanity webhook logs.
- [ ] Customer support inbox staffed.

### Week 1
- [ ] Lighthouse audit on production.
- [ ] Review every form submission for noise/spam.
- [ ] Watch Core Web Vitals in Search Console.
- [ ] Capture first reviews via post-purchase email.

---

## 21. Phase scope (which components per phase)

**Phase 1 (Setup)**: Foundations · Container, Section, Grid · Typography · Button · Input.

**Phase 2 (Schemas + content)**: All Sanity schemas · queries · Studio structure · seed data.

**Phase 3 (Storefront)**: Layout · Home · Shop · PDP · Journal · House Story · Legal pages.

**Phase 4 (Cart + checkout)**: cartStore · CartDrawer · Checkout flow · API verify routes · Paystack + Flutterwave.

**Phase 5 (Discovery + B2B)**: FragranceFinderQuiz · GiftFinder · DiscoverySetCard · B2B pages + InquiryForm.

**Phase 6 (Polish + launch)**: Reviews · WishlistButton · NotifyMeButton · Analytics · Lighthouse pass · Accessibility audit · Domain cutover.
