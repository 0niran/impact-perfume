# Impact Perfumes, Principal Design Review

Date: June 2026
Scope: Homepage and navigation, product discovery (PLP and PDP), cart and checkout, quiz and brand storytelling.
Constraints: Existing colour tokens and typography are preserved. No theme changes. Recommendations target intuitiveness, interaction, and conversion.
Reference: lelabofragrances.ca (interaction patterns only, no copying of brand or visual language).
Verified against: production build at impact-perfume.vercel.app (homepage hero confirmed live, other pages cross-checked against committed source).

---

## How to read this document

Every finding has three parts:

1. **What is happening now**, written from the current code.
2. **Why it hurts the user**, the heuristic or behavioural reason.
3. **The change**, a specific component-level edit. File paths point at the existing component.

Findings are ranked P0 (ship blockers and serious friction), P1 (high impact in current sprint), P2 (next sprint), P3 (refinements).

A short Le Labo reference note appears under findings where their solution is worth borrowing.

---

## Live audit notes

The production homepage at impact-perfume.vercel.app diverges from the committed source in a few places. The findings below were re-grounded against what is actually rendered. The Number Series PLP, the PDP, the cart drawer, the checkout, and the quiz could not be screenshot-verified live because the production app keeps the page in a non-idle network state for longer than the browser tool tolerates. They are reviewed against committed source. This is itself a finding, captured below.

What the live homepage confirms or changes:

- The hero headline on production is two lines: "Crafted in Lagos. Composed for character." The committed `HeroSection.tsx` shows only the second line. Either the production build is from a different branch, or `HeroSlideshow` is injecting the first line. Worth reconciling so reviewers do not chase a phantom edit.
- Primary nav labels on production read "NUMBER COLLECTION, SIGNATURE, OILS" plus right-side "HOME & GIFTS, OUR STORY." The committed source uses "Number Series, Signature Scents, Perfume Oils." Pick one set and standardise. "NUMBER COLLECTION" is the better label for new visitors than "Number Series."
- A floating "THE NUMBER SERIES" tag sits flush-right at the very top of the viewport, outside the centered nav layout, with no container framing. It reads as orphaned. If this is the slide tag for the current hero slide, move it inside the hero content block (above the headline, where "EST. LAGOS · THE NUMBER SERIES" already appears).
- The hero uses real campaign photography (warm-lit still life with a perfume bottle, compass, map, leather strap, velvet drape), not a render. This is excellent and should be the standard for PDP gallery photography when the budget lands.
- The hero is full 100svh and the slide indicator dots are at the very bottom. The second section is not visible above the fold at all on a 784 px viewport. Reduces scroll intent.
- The hero headline sits visually left of the bottle in the image, which works editorially but creates a slight tension where the eye is split between text on the left and product on the right. Acceptable; flag for the photography brief next round.
- The cart icon shows a count of 1 from prior session persistence. Confirms localStorage cart state is restored, which is correct.
- The "CHAT" WhatsApp FAB renders bottom-right as expected.

What I could not verify live (production keeps the page in non-idle state, the browser tool times out at 45 s document idle wait): the PLP grid density, the PDP layout, the cart drawer block stack, the checkout mobile order summary, and the quiz progress UI. All of these were code-reviewed thoroughly. The findings below stand, but they should be re-walked manually on a phone before sprint planning.

---

## Executive summary

The build is well structured. Tokens, components, region support, and commerce wiring are in good shape. The site reads as a coherent luxury house. The remaining gap is not visual polish, it is interaction confidence. Specifically:

1. **First-time visitors land on a hero that asserts brand voice but does not orient them**. They do not see a price, a product, or a discovery path above the fold.
2. **Product discovery is dark-on-dark**. Fifty tiles on `bg-ink` with `border-stone/15` between them flatten visual hierarchy. Browsers cannot scan.
3. **The PDP has only one variant**. No sample, no second size, no review, no gallery. Three of the four highest conversion drivers for fragrance e-commerce are absent.
4. **Mobile checkout pushes the order summary below the form**. The most reassuring element is the hardest to reach.
5. **Supporting blocks crowd the cart drawer**. Save-for-later, recently viewed, and an upsell strip live above the footer. The checkout CTA is pinned, but visual noise increases drop-off.

None of these require a redesign. They require focused, component-level edits described below.

---

## 1. Homepage and navigation

### 1.1 The hero asserts the brand but does not orient the visitor

**Now (verified live)**: The hero renders at `min-h-[100svh]` with the headline "Crafted in Lagos. Composed for character." over a campaign still life. Above the headline sits a small label "EST. LAGOS · THE NUMBER SERIES." Two CTAs: filled gold "SHOP THE COLLECTION" and outlined "FIND YOUR FRAGRANCE." Slide dots at the very bottom. No product price, no format orientation, no scroll cue.

**Why it hurts**: A new visitor cannot tell whether this house sells one product or a hundred, what the entry price is, or what the formats are. The 100svh height means the second section is fully below the fold on a typical 800 px viewport, hiding the editorial proof. The slide dots at the absolute bottom of the viewport are easy to miss.

**Change**:
- Reduce hero height to `min-h-[88svh]` so the next section peeks above the fold and invites scroll.
- Add a single orientation line beneath the headline:
  > "Eau de Parfum, Perfume Oils, and Home Scents."
- Tighten the secondary button copy from "FIND YOUR FRAGRANCE" to "TAKE THE SCENT QUIZ" so it matches the homepage strip and the mega menu, and so the action is unambiguous.
- The secondary button on the live build is outlined `text-bone/80` over warm-toned campaign imagery. On the current slide the bottom-left of the image is busy (leather strap and warm wood), and the button border drops below readable. Bump to `text-bone` and `border-bone/50`. Hover already lifts to full opacity.
- Move the slide indicators up by 24 to 32 px so they sit clear of the viewport bottom edge.

File: `src/components/home/HeroSection.tsx`, `src/components/home/HeroSlideshow.tsx`.

Le Labo reference: their homepage opens with editorial tiles (single scent, single line, single price entry point) rather than a brand assertion. Impact does not need to mimic that fully, but it should give first-time visitors one tangible thing to hold onto in the first viewport.

---

### 1.1a The orphaned "THE NUMBER SERIES" tag at the top right (live observation)

**Now**: A small label reading "THE NUMBER SERIES" sits flush against the right edge of the viewport at the very top of the page, on the same horizontal line as the centered logo. It has no container framing and is visually disconnected from the nav.

**Why it hurts**: It reads as an unfinished element. Visitors cannot tell whether it is a link, a slide tag, or a misaligned breadcrumb. On a luxury house site, stray orphan elements undermine the considered feel.

**Change**: Identify the source (likely a slide category tag from `HeroSlideshow`). Move it inside the hero content column, above the existing "EST. LAGOS · THE NUMBER SERIES" label. Remove the duplicate. If the intent is a per-slide category indicator, render it in the hero copy block only, not in the header chrome.

File: `src/components/home/HeroSlideshow.tsx`.

---

### 1.1b Nav labels differ between source and production (live observation)

**Now**: Production reads "NUMBER COLLECTION, SIGNATURE, OILS." Committed source reads "Number Series, Signature Scents, Perfume Oils." Either the live build is on a different branch, or a recent edit was made directly in deploy.

**Why it hurts**: Two truths, one of which is wrong. Whoever opens the codebase to ship a change will hit confusion within minutes. Also, "NUMBER COLLECTION" is shorter and more inviting to first-time visitors than "Number Series," so the wrong label is in source.

**Change**:
- Reconcile to one set of labels. Recommend the live set: "NUMBER COLLECTION, SIGNATURE, OILS, HOME & GIFTS, OUR STORY."
- Update `SiteHeader.tsx` to match. Update all internal references (`/no-series` route name stays, only the human label changes).
- Add a quick CI check or design-token contract that prevents text drift between source and production.

File: `src/components/layout/SiteHeader.tsx`.

---

### 1.2 The header utility bar disappears on scroll, taking the free-shipping line with it

**Now**: In `SiteHeader.tsx`, the top utility bar is hidden when `scrolled || isHomepage` is true. The free-shipping threshold message lives inside that bar.

**Why it hurts**: The free-shipping threshold is one of the top three abandonment-reducing signals in fragrance e-commerce (Baymard reports unexpected shipping cost as the single largest reason). It should not vanish the moment the user starts browsing.

**Change**:
- Keep the utility bar hidden on scroll, but move the free-shipping line into a permanent thin strip above or below the main header row, height 24 to 28 px, `text-label`, `text-stone` on `bg-ink`, that persists on scroll. Tuck the region switcher inside the cart drawer or a small footer surface instead so the strip stays single-purpose.
- On homepage, do not suppress this strip with `isHomepage`. The hero is dark enough to support a thin strip without visual conflict.

File: `src/components/layout/SiteHeader.tsx`.

---

### 1.3 Active state inconsistency on primary nav

**Now**: `NavItem` renders an underline only for items with `hasMenu`. "Signature Scents" and "Perfume Oils" (the two direct links in the left nav) have no active or hover underline.

**Why it hurts**: Three items in the same row behave in two different ways. Hover and active feedback should be uniform across primary nav.

**Change**: Add the same `<span>` underline element to all three left-nav items, controlled by route match for direct links and by `activeMenu` for menu items. The simplest fix is to wrap "Signature Scents" and "Perfume Oils" in a `NavItem` with `hasMenu={false}` and have `NavItem` derive `isActive` from the current path when there is no menu.

File: `src/components/layout/SiteHeader.tsx`.

---

### 1.4 Mega menus are too sparse for a full-width surface

**Now**: `MegaMenu.tsx` has one column for "series" (7 scent families) and one column for "discover" (4 links). The Home & Gifts menu has three columns. The single-column menus look unfinished on a 1280px container.

**Why it hurts**: A full-width mega menu invites richer browsing. Sparse columns waste the surface and undersell the catalogue.

**Change**:
- For "series", add a second column with "Shop by Number" (e.g., No. 1 to 10, 11 to 20, 21 to 30, 31 to 40, 41 to 50) and a third column with one featured product tile (image, name, price, link). Pull the featured product from a CMS pick or default to a high-margin number.
- For "discover", add a column showing the latest journal post (image, title, two-line excerpt, link) and a column with "Visit us" copy when retail locations land. Until then, hold the column for "House Story" full content rather than the link list.

File: `src/components/layout/MegaMenu.tsx`. Featured product can reuse `NumberTile` at a smaller size.

Le Labo reference: every Le Labo mega menu includes a strong visual on the right (campaign image or product). It earns the full-width treatment.

---

### 1.5 The House Positioning strip uses opacity instead of weight for hierarchy

**Now**: `HousePositioningStrip.tsx` sets body text to `text-bone/70`. The third pillar uses a quote, including the line "Even an enemy will appreciate the gift of a good-smelling perfume."

**Why it hurts**: Text at 70 percent opacity on dark backgrounds reads as washed at small sizes. Two of the three pillars are factual brand statements, the third is a quote. The mix is jarring without attribution styling.

**Change**:
- Lift body to `text-bone/90` for readability without breaking the editorial hush. Use weight or size for emphasis, not opacity.
- Style the third pillar quote as a quote. Wrap in `<blockquote>`, render in serif italic at `text-h3`, and add an attribution line beneath in `text-label uppercase text-stone`, for example "From the house manifesto."

File: `src/components/home/HousePositioningStrip.tsx`.

---

### 1.6 Featured Numbers tiles do not show scent family

**Now**: `FeaturedNumbers.tsx` tiles render "No. X", descriptor, tagline, price. No scent family.

**Why it hurts**: Scent family is the primary filter on the shop page and the most useful at-a-glance label for first-time visitors. Surfacing it on the homepage tile shortens the path from "I like woody" to "show me Numbers in Woody."

**Change**: Add a scent family chip above or below the descriptor on each tile. Reuse the existing badge style from `InfoRail.tsx`: `border border-accent/40 px-2 py-0.5 text-label text-accent`. Make it click to `/no-series?family={family}`, stopping propagation from the parent link.

File: `src/components/home/FeaturedNumbers.tsx`.

---

### 1.7 The testimonial strip never lands the visitor on a product

**Now**: `TestimonialStrip.tsx` shows three quotes with initials only.

**Why it hurts**: Each quote names a product ("No. 7", "No. 3") but the product is not linkable. The strip becomes a dead end. Three testimonials are also too few to feel real.

**Change**:
- Extend the testimonial object with `productHandle` and `productNumber`. Render the number as a link to the PDP. Replace "C. Adams" style attribution with "C. Adams, on Impact No. 3".
- Add a star count and an average rating row beneath the strip header: "4.9 out of 5, based on 142 reviews." Pull from the Sanity `review` schema (already exists, per the conversion audit).
- Once the review block lands on the PDP, expand this strip to 6 to 8 testimonials in a carousel that auto-pauses on hover and stops on focus.

File: `src/components/home/TestimonialStrip.tsx`. Reviews source: `src/sanity/schemas/review.ts`.

---

## 2. Product discovery (PLP and PDP)

### 2.1 The shop page reads dark-on-dark, costing scanability

**Now**: `ShopClient`, `NumberWall`, and `NumberTile` all render on `bg-ink`. Tile borders are `border-stone/15`, a near-invisible separator. The only colour cue is the per-tile signature glow at 60 percent opacity.

**Why it hurts**: A user scanning fifty tiles needs visual rhythm. Currently every tile bleeds into its neighbour. The signature colours are present but muted. Eye movement is slow, comparison is hard.

**Change** (no palette changes, structural only):
- Increase tile separation: change `border-stone/15` to `border-stone/30` on `NumberTile`.
- Add a `bg-mist` panel beneath the tile info block to differentiate "card image area" from "card label area" within each tile. The image area stays `bg-ink` with the signature glow. The label area becomes `bg-mist` so the tile feels grounded.
- On the grid container in `NumberWall`, switch from `gap-4` (or whatever the current value) to `gap-x-6 gap-y-8` so tiles breathe. Confirm the grid uses 3 columns on `md` and 4 on `lg`, not 2 and 3.
- Add an opacity bump to the signature glow on the active tile only (focus-within or hover), so the visited tile reads visibly different.

Files: `src/components/shop/NumberTile.tsx`, `src/components/shop/NumberWall.tsx`.

Le Labo reference: their PLP uses light backgrounds. Impact will not flip to light, but card-level surface alternation (image dark, label slightly lighter) achieves the same scanability without breaking the dark identity.

---

### 2.2 Filter rail shows "Coming soon" placeholders

**Now**: `FilterRail.tsx` renders Occasion and Size groups with "Coming soon" italic text.

**Why it hurts**: Placeholder copy in production reads as unfinished. The user expects filtering and is told to wait. Either the filter exists or it does not.

**Change**:
- Remove the "Coming soon" placeholders for now. Add them back only when the data model supports filtering.
- If you want to keep the affordance, replace the placeholder with a real "Concentration" filter (EDP, Oil, Discovery sample) using existing variant metadata. This is one query away and immediately useful.
- Add a "Number range" filter: 1-10, 11-20, 21-30, 31-40, 41-50. Pure client-side filter on the existing tiles. Useful for repeat visitors with a partial memory ("it was somewhere in the thirties").

File: `src/components/shop/FilterRail.tsx` plus matching update in `FilterBottomSheet.tsx`.

---

### 2.3 Quick-add button on tiles is hover-only and invisible on touch

**Now**: `NumberTile.tsx` renders the plus-icon quick-add button with `opacity-0 ... group-hover:opacity-100`. On a touch device with no hover, the user must tap once to focus, then tap again to add.

**Why it hurts**: Touch devices are the majority of traffic (per conversion audit, 70 percent plus). A hover-revealed control on mobile is an invisible control.

**Change**:
- On `lg:` and above, keep the hover-reveal behaviour.
- On `md:` and below, render the button persistently at 90 percent opacity, with `text-bone bg-ink/70` so it sits softly over the bottle glow without dominating.

File: `src/components/shop/NumberTile.tsx`.

Le Labo reference: each PLP tile shows persistent "Add to Cart" and "Notify Me" buttons. Impact does not need both, but the add button should be reachable without hover.

---

### 2.4 PDP variant ladder is missing

**Now**: `InfoRail.tsx` and `AddToCart.tsx` render a single variant: 100ml EDP at one price.

**Why it hurts**: Sample-to-full-size is the most reliable conversion ladder in fragrance. A first-time visitor who is not ready to spend NGN tens of thousands on a 100ml bottle needs a low-commitment entry. The Discovery Sets exist in `/gifts` but are not surfaced from the PDP.

**Change**:
- Introduce a variant selector with three options when data permits: 15ml Discovery, 50ml EDP, 100ml EDP. Use a horizontal pill group above the price, label and price refresh on selection.
- If 50 ml and 15 ml are not stocked as separate Medusa variants yet, surface a "Try a sample first" link beneath the Add to Cart button that routes to the Number Series Discovery Set (`/gifts#discovery-sets`). One line, accent colour, underline on hover.

Files: `src/components/pdp/InfoRail.tsx`, `src/components/pdp/AddToCart.tsx`, Medusa product variant data.

Le Labo reference: every PDP exposes 15ml, 50ml, 100ml, and a Discovery sample. The variant ladder is the spine of their conversion model.

---

### 2.5 PDP gallery is a single image

**Now**: PDP shows one rendered bottle on the `ColorPanel` side. No thumbnails, no lifestyle shot, no zoom.

**Why it hurts**: Per the conversion audit, multi-angle plus zoom PDPs convert 20 to 40 percent better. For fragrance specifically, bottle macro, label detail, and a lifestyle context shot are the minimum credible set.

**Change**:
- Add a `<ProductGallery>` component to replace the static image in `ColorPanel.tsx`. Show a primary image with two to four thumbnails. Click thumbnail to swap primary. On primary, click to open a lightbox with pinch-zoom (mobile) and mouse-zoom on hover (desktop).
- Until real photography is in hand, generate three secondary renders per number: front, three-quarter, label detail. Even renders are better than a single shot.
- Library: use `yet-another-react-lightbox` or build a minimal lightbox with focus trap.

Files: `src/components/pdp/ColorPanel.tsx`, new `src/components/pdp/ProductGallery.tsx`.

---

### 2.6 Reviews block is wired in Sanity but not rendered on PDP

**Now**: `src/components/pdp/ReviewsBlock.tsx` exists. The Sanity `review` schema exists. The block is not visible on the PDP.

**Why it hurts**: This was flagged in the May conversion audit and remains open. Adding reviews is the single highest impact-per-effort change available.

**Change**:
- Render `ReviewsBlock` beneath the InfoRail accordion. Show: average star, count, three most recent reviews, "See all reviews" link.
- Add a star and count summary in the title block of `InfoRail.tsx`, beneath the descriptor label and above the h1. Format: "4.9 out of 5, 27 reviews" with the stars rendered as five small SVGs.
- Seed with 5 to 10 real customer quotes from existing WhatsApp and Instagram messages.

Files: `src/components/pdp/InfoRail.tsx`, `src/components/pdp/ReviewsBlock.tsx`, `src/sanity/schemas/review.ts`.

---

### 2.7 PDP accordion copy is templated and feels generic

**Now**: `PDPAccordion.tsx` "About this fragrance" renders a templated paragraph: "A {descriptor.toLowerCase()} composition from the Number Series. {tagline}. Each bottle is crafted to the same standard. The same heavy-glass flacon, the same black cap, a different world inside."

**Why it hurts**: Every PDP reads the same. Le Labo's strength is that every fragrance has a story, written for that fragrance. Templated copy signals catalogue rather than house.

**Change**:
- Add a `pdpStory` field to the Medusa product metadata or Sanity schema. Three to five sentences per number, written by hand.
- Replace the templated paragraph with `pdpStory`. Fall back to the template only when `pdpStory` is missing.
- Open "About this fragrance" by default, not collapsed. It is the substance, not the small print.

Files: `src/components/pdp/PDPAccordion.tsx`, product metadata source.

---

### 2.8 The tagline italic uses stone (secondary text colour)

**Now**: `InfoRail.tsx` renders the tagline as `text-h3 italic text-stone`.

**Why it hurts**: The tagline is the most lyrical line on the PDP. Rendering it in the same colour as breadcrumbs and helper text demotes it.

**Change**: Render the tagline in `text-bone` (primary), keep serif italic, keep size. Sit it directly under the h1 with `mt-3`. The fact that it is italic and serif already separates it visually. Colour should reinforce primacy, not secondary status.

File: `src/components/pdp/InfoRail.tsx`.

---

### 2.9 Notes pyramid uses an em dash in its education line

**Now**: The educational helper line reads "How a fragrance unfolds, opening, character, and the lasting dry-down." (per the May review recommendation), and uses an em dash in the existing implementation.

**Why it hurts**: Em dashes scream AI-written copy. The house voice should sound human.

**Change**: Rewrite as two short sentences. For example: "How the fragrance unfolds on skin. From the opening to the heart, to the lasting dry-down."

File: `src/components/pdp/NotesPyramid.tsx`.

---

### 2.10 Sticky mobile add-to-cart bar omits product context

**Now**: `AddToCart.tsx` sticky mobile bar shows product name, price, Add button.

**Why it hurts**: With no thumbnail, the bar feels like a generic checkout footer. On a long PDP where a user has scrolled past the gallery, the visual cue that "you are about to add this specific bottle" is missing.

**Change**: Add a 40 by 40 px thumbnail to the left of the name and price. Use the primary product image at low resolution. The bar already has `bg-ink` and `border-stone/20` framing, the thumbnail fits cleanly.

File: `src/components/pdp/AddToCart.tsx`.

---

## 3. Cart and checkout

### 3.1 The cart drawer carries too many secondary blocks

**Now**: Drawer body sequence is lines, free-shipping progress, recently viewed, complete-the-set upsell, save-for-later form. Footer is pinned.

**Why it hurts**: The save-for-later form with email plus consent checkbox inside the drawer adds form ceremony before checkout. Recently viewed is useful but competes with the cart contents. Three sections of UI separate the line items from any sense of progress.

**Change**:
- Keep: line items, free-shipping progress, footer.
- Move: "Complete the set" upsell into the empty state (when cart has zero items, show the upsell) and below the line items as a single compact row (one product, image plus link, no descriptive paragraph).
- Move: "Recently viewed" out of the drawer entirely. It belongs on the PDP and the empty-cart state, not in the active cart drawer.
- Move: "Save cart, finish later" into a small button next to "Clear cart" labeled "Email me my cart." On click, expand inline to show the email input. Reduces the drawer to its core job.

File: `src/components/cart/CartDrawer.tsx`.

Le Labo reference: their cart drawer is line items, free shipping, totals, checkout. Nothing else. Impact does not need to be that bare, but it should reduce by at least three blocks.

---

### 3.2 "Clear cart" has no confirmation

**Now**: A "Clear cart" text button beneath the checkout CTA. Single click, no confirmation, no undo.

**Why it hurts**: A user can wipe their cart with one accidental click. Especially likely on mobile where the button sits close to the thumb-zone.

**Change**:
- On first click, replace the button label with "Confirm clear" plus a small "Cancel" link. Second click within 4 seconds wipes the cart. Tap anywhere else, cancel.
- Alternatively, move "Clear cart" into a small icon button at the top right of the line items list, paired with a confirmation modal. The text-button-under-CTA pattern is too easy to mis-hit.

File: `src/components/cart/CartDrawer.tsx`.

---

### 3.3 The drawer subtotal is labeled correctly but the checkout total is not

**Now**: Drawer footer says "Subtotal" and "Shipping & taxes calculated at checkout." Good.
On the checkout page (`CheckoutForm.tsx`), the right rail says "Total" and shows the cart subtotal value, with a separate small line "Delivery fee calculated after order."

**Why it hurts**: "Total" implies "this is what you will pay." Showing a subtotal under that label is misleading.

**Change**: Rename "Total" to "Order subtotal" until shipping is calculated. Once shipping is determined (after region or postal-code entry, or by default flat rate by region), render both lines:
- Order subtotal: NGN X
- Delivery: NGN Y (or "Calculated based on address")
- Total: NGN Z

This matches the expectation set by every modern checkout.

File: `src/components/checkout/CheckoutForm.tsx`.

---

### 3.4 Mobile checkout pushes the order summary below the form

**Now**: On mobile, `CheckoutForm.tsx` renders left column (form) then right column (Total card with Pay button), so the order summary sits below the form. Above the form there is no summary affordance.

**Why it hurts**: The user has to scroll past Name, Phone, Email, Street, Apartment, City, State, Country to even see what they are paying for. Anxiety rises, abandonment rises. Industry standard is a sticky or collapsible "Summary (3 items, NGN X)" at the top of the form on mobile.

**Change**:
- On mobile (`lg:` and below), render a sticky top bar above the form: `Summary 3 items, NGN 75,000` with a chevron. Tap to expand into a collapsible panel showing line items.
- Keep the right rail layout on desktop unchanged.
- The Pay button can remain at the bottom of the right rail on desktop, but on mobile it should be reachable without scrolling to the bottom of the page. Pin a "Pay NGN X with Paystack" button to the bottom-of-screen on mobile (above the existing WhatsApp FAB, below `z-40`). Tapping it submits the form, with inline scroll-to-error if validation fails.

File: `src/components/checkout/CheckoutForm.tsx`.

Le Labo reference: their mobile checkout pins the cart summary at the top in a collapsible panel and pins the Pay button at the bottom.

---

### 3.5 Form field order is unusual on mobile

**Now**: Name and Phone in a two-column grid on `sm:`, then Email full-width. Address fields follow.

**Why it hurts**: Email is the most-needed field for order confirmation, receipts, abandonment recovery, and account creation. It deserves position two, not three. Phone is useful but secondary.

**Change**: Reorder to Name (single column on mobile, half on `sm:`), Email (full width), Phone (full width). Then address. The two-column grid for Name plus Phone is a forced layout that breaks reading order. Stack vertically.

File: `src/components/checkout/CheckoutForm.tsx`.

---

### 3.6 No inline validation, errors surface only on submit

**Now**: `handlePay` checks required fields and sets a single error message at the top of the right rail.

**Why it hurts**: The user fills out seven fields, taps Pay, and is told one of them is wrong. They now have to find the offending field.

**Change**:
- Add per-field validation on `blur`. Email format, phone format (basic regex), required fields.
- On submit failure, scroll to the first invalid field and focus it. Render the inline error in red beneath the field, not in the right rail.
- Keep the right-rail error block for non-field errors (payment provider not loaded, network error).

File: `src/components/checkout/CheckoutForm.tsx`.

---

### 3.7 Country field is a static paragraph with no region indicator

**Now**: A `<p>` showing "Nigeria" with no affordance. With multi-region support (NG and CA), this presentation contradicts the architecture.

**Why it hurts**: A CA visitor seeing "Nigeria" in their checkout will assume the site is broken. The region switcher exists but is far from the field.

**Change**:
- Render Country as a labelled, read-only field with the region clearly named ("Nigeria, change region in header") with the words "change region in header" rendered as a small link that opens the region switcher.
- When the user is on the CA region, render the CA form variant. The current component is Paystack-only and Nigeria-only, so confirm the multi-region path routes to `StripeCheckoutPanel.tsx` correctly.

File: `src/components/checkout/CheckoutForm.tsx`, `src/components/layout/RegionSwitcher.tsx`.

---

### 3.8 State selection is a long native dropdown

**Now**: 36 Nigerian states in a `<select>`. Native dropdown.

**Why it hurts**: Long native dropdowns on mobile are slow to scan. Typing the first letter does not always land the right item on iOS.

**Change**: Replace with a combobox: text input with filterable list (downshift-style). Show suggestions on focus, filter as the user types. Keep `<select>` as a no-JS fallback.

File: `src/components/checkout/CheckoutForm.tsx`, possibly a shared `<Combobox>` primitive.

---

### 3.9 No address autocomplete

**Now**: Street address is a plain text input.

**Why it hurts**: Address typing is the slowest part of mobile checkout. Address validation post-purchase is the most common cause of customer-service tickets in NG.

**Change**: Integrate Google Places Autocomplete or a region-aware equivalent (HERE Maps works in NG). Bind to the Street field. On suggestion select, populate Street, City, State automatically.

File: `src/components/checkout/CheckoutForm.tsx`.

---

### 3.10 Trust signals on the checkout page are thin

**Now**: One line: "Secured by Paystack · 256-bit SSL."

**Why it hurts**: A first-time NG buyer needs more reassurance to enter a card. Visible payment-method icons, a clear "We will email a receipt" promise, and a contact route reduce hesitation.

**Change**: Beneath the Pay button, add a small icon row of accepted methods (Visa, Mastercard, Verve, Bank Transfer, USSD for NG; Visa, Mastercard, Amex, Apple Pay, Google Pay for CA). Add one line: "Questions? WhatsApp us on {number}." Link to the WhatsApp deep link.

File: `src/components/checkout/CheckoutForm.tsx`.

---

## 4. Quiz and brand storytelling

### 4.1 Quiz progress is invisible until the user has started

**Now**: `QuizClient.tsx` passes `stepIndex` and `totalSteps` into `QuizQuestion`. Progress visualisation lives inside the question component.

**Why it hurts**: Before starting, the user does not know how long the quiz is. The homepage strip promises "ninety seconds, five questions." Once inside the quiz, that promise should be visible at every step.

**Change**:
- At the top of every question, render a thin progress bar (3 to 4 px height) and a label: "Question 2 of 5, about thirty seconds left." Use existing `bg-stone/20` and `bg-accent` colours.
- Persist a small "Save and continue later" link beneath the bar that stashes answers in localStorage. Users who abandon a quiz return reliably if they see their progress was saved.

Files: `src/components/quiz/QuizClient.tsx`, `src/components/quiz/QuizQuestion.tsx`.

---

### 4.2 Quiz result needs to feel like a recommendation, not a search result

**Now**: I have not read `QuizResult.tsx` line by line, but it returns a primary result plus `alsoTry` alternatives.

**Why it hurts**: A "result" with a single product plus a list of alternatives can feel like a search engine result, not a recommendation from a house. The brand voice should land here.

**Change** (apply once verified against the current implementation):
- Lead with a single, hand-written sentence keyed off the chosen archetype, for example "You move warm and unhurried. Impact No. 7 was composed for you."
- Then the product card, full-bleed, with primary image, descriptor, price, Add to Cart.
- Below, a divided block: "If you want to test before committing, try the Discovery Set." Link to discovery.
- Then the "Also worth trying" rail with two alternative numbers.
- A "Retake the quiz" link sits beneath the rail, not next to the primary product. Keep the primary action uncluttered.

File: `src/components/quiz/QuizResult.tsx`.

---

### 4.3 The House Story and Journal entries are not surfaced on the homepage

**Now**: Homepage sections are Hero, House Positioning, Featured Numbers, Quiz, Testimonials. No journal preview. No link to the House Story.

**Why it hurts**: Editorial pages exist (`/house-story`, `/journal`) but they require the user to know to look for them. Le Labo's homepage rotates editorial cards as primary content, which is part of why their site reads as a brand rather than a store.

**Change**: Add a Journal Preview block between the Quiz and Testimonials. Three cards: image, title, two-line excerpt, "Read" link. Use the existing `JournalCard.tsx` and `JournalPreview.tsx` components.

File: `src/app/page.tsx`. Components already exist.

---

### 4.4 Newsletter capture is homepage-only

**Now**: `NewsletterBlock.tsx` is referenced in the home components folder.

**Why it hurts**: Newsletter capture should appear in at least three places: homepage, footer, and a one-time exit-intent popup with a discovery set offer. Capturing email is the start of every abandonment recovery sequence.

**Change**:
- Confirm `SiteFooter.tsx` includes a newsletter input. If not, add one.
- Add a single-fire exit-intent overlay (cookie set on dismiss, expires after 30 days). Offer 10 percent off a discovery set in exchange for email. Use the existing `NewsletterBlock` styling.

Files: `src/components/layout/SiteFooter.tsx`, `src/components/home/NewsletterBlock.tsx`, new `src/components/layout/ExitIntent.tsx`.

---

## 5. Cross-cutting interaction patterns

### 5.1 Focus visibility

The Tailwind config uses `accent` (#E4B250) on `bg-ink` which passes AAA. Make sure every interactive element has `focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2`. Apply globally in `globals.css` rather than per-component to avoid drift.

### 5.2 Motion respect

`HeroSlideshow.tsx` auto-advances. Add a `prefers-reduced-motion: reduce` guard to pause auto-advance. Already flagged in May, re-check during this pass.

### 5.3 Loading states

When transitioning between routes, `RouteProgressBar.tsx` exists. Verify it renders on every navigation. Long PDP fetches without a route-level progress bar feel like a stuck click.

### 5.4 Performance: the production app never reaches network idle (live observation)

**Now**: The homepage and the no-series PLP on impact-perfume.vercel.app keep the browser in a non-idle state for over 45 seconds after navigation. This was hit repeatedly during the live audit. Long-running fetches, polling, or unresolved promises are the typical causes.

**Why it hurts**: Beyond impeding tooling, this delays "interaction ready" signals for assistive tech, prevents browser-level idle optimisations, and degrades Core Web Vitals (specifically INP and TTI). It also drains battery on mobile.

**Change**:
- Run a network panel session on the homepage in Chrome DevTools. Identify which requests are still pending after 10 seconds. Likely culprits: a Medusa region-or-cart poll, an analytics beacon, a websocket without a clean close, or a third-party script.
- For polling, switch to event-driven updates or a longer interval (every 30 to 60 s) and use `requestIdleCallback` to schedule.
- For fonts or third-party scripts, mark as `defer` or `async` and lazy-load below the fold.
- Run Lighthouse mobile against the homepage and the no-series PLP. Target LCP under 2.5 s, CLS under 0.1, INP under 200 ms.

Files: investigate `src/lib/regionContext.tsx`, `src/store/cartStore.ts`, `src/components/home/HeroSlideshow.tsx`, any analytics provider.

---

### 5.5 Empty states

The empty-cart state in `CartDrawer.tsx` shows an icon, a line, and a CTA. Good. Extend the same pattern to:
- Empty filter results on shop ("No fragrances match these filters, try clearing one filter").
- Empty quiz history (if the quiz adds a "your past results" view).

### 5.6 Voice and copy hygiene

A quick rule for the house voice: short sentences, plain words, no em dashes, no exclamation marks outside campaign copy, no "discover" or "unleash" verbs. Every line should sound like a person who knows the house wrote it.

A pass through the codebase for em dashes, double-hyphens used as em dashes, and over-formal phrasing would take an afternoon and tighten the entire site.

---

## 6. Prioritised rollout

**Sprint 1, this week (P0 plus P1, low effort, high impact)**

1. Remove orphaned "THE NUMBER SERIES" tag at top right (1.1a)
2. Reconcile nav labels between source and production (1.1b)
3. Header utility bar persistence (1.2)
4. Active-state consistency on nav (1.3)
5. Featured Numbers scent family chip (1.6)
6. Cart drawer simplification (3.1)
7. Clear cart confirmation (3.2)
8. Checkout: rename Total to Subtotal (3.3)
9. Mobile checkout sticky summary plus bottom Pay button (3.4)
10. Form field reorder (3.5)
11. Inline validation (3.6)
12. Quiz progress bar (4.1)
13. Em dash sweep (5.6)
14. Investigate non-idle network state on production (5.4)

**Sprint 2 (high impact, medium effort)**

1. Hero orientation line plus height adjustment (1.1)
2. Shop scanability changes (2.1)
3. Filter rail clean-up (2.2)
4. PLP tile add-button on touch (2.3)
5. Reviews block on PDP (2.6)
6. PDP story field plus rewritten copy (2.7)
7. Tagline colour (2.8)
8. PDP notes copy fix (2.9)
9. Sticky mobile bar thumbnail (2.10)
10. Trust signals on checkout (3.10)
11. Journal preview on homepage (4.3)

**Sprint 3 (structural)**

1. Mega menu enrichment (1.4)
2. PDP variant ladder, 15 ml, 50 ml, sample link (2.4)
3. PDP gallery component (2.5)
4. Combobox for state (3.8)
5. Address autocomplete (3.9)
6. Quiz result rewrite (4.2)
7. Newsletter capture in footer plus exit-intent (4.4)

**Sprint 4 (refinement)**

1. House positioning weight and styling (1.5)
2. Testimonials linking to products (1.7)
3. Country field labelling (3.7)
4. Reduced motion guard (5.2)
5. Empty-state coverage (5.4)

---

## 7. What not to change

Stating these explicitly so they do not get bundled into the sprint by accident:

- The palette. Bone, ink, accent, stone, mist, the per-number signature colours. All stay.
- Typography. Display, brand script, serif Cormorant for editorial, Manrope for body. All stay.
- The number-based product naming. Numbers are the asset.
- The dark identity. The site is dark and should stay dark. The recommendations preserve that.
- The free-delivery progress bar in the cart, the WhatsApp FAB, the breadcrumb pattern, the section dividers. All good as built.

---

## 8. Open questions for the team

1. What is the photography roadmap? PDP gallery, alternate angles, and lifestyle shots will land in the same sprint as the gallery component. Without real photos, the component will display three identical renders. Confirm timeline.
2. Are sample sizes (15 ml) and 50 ml variants in roadmap? The variant ladder change depends on this.
3. Should the Discovery Set page be reframed as a Sampler Programme with its own landing page, in the spirit of Le Labo's Discovery Program? Higher conversion than gift-set framing for first-time visitors.
4. Are there written stories for each number? If not, a copywriting commission for fifty short pieces (three to five sentences each) is the highest-leverage editorial spend on the table.
5. Reviews: are we using Sanity-owned reviews, or do we want to move to a managed provider (Stamped, Okendo, Junip) with photo support and verified-buyer badges? Sanity is fine for launch, managed is better for scale.
