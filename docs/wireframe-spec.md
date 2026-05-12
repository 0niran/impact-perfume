# Impact Perfumes — Figma-Ready Wireframe Spec

Core 5 pages: Home, Shop/Collection, Product Detail, Cart + Checkout, House Story.

This document is structured to translate directly into Figma frames, auto-layout groups, and component instances. Sketches use ASCII boxes for layout intent; specs below them define exact dimensions, spacing, type, and behavior.

---

## 0. Global conventions

### Frames

| Breakpoint | Frame width | Content max | Margins | Columns | Gutter |
|---|---|---|---|---|---|
| Desktop | 1440 | 1280 | 80 | 12 | 24 |
| Tablet | 768 | 720 | 32 | 8 | 24 |
| Mobile | 390 | 358 | 16 | 4 | 16 |

### Spacing scale (px)

`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 80 · 96 · 128 · 160`

Use scale tokens only. No arbitrary values.

### Type system

Display: **Cormorant Garamond** (free) or Canela (paid).
Body: **Manrope** (free) or Söhne (paid).

| Token | Size / Line | Weight | Tracking | Use |
|---|---|---|---|---|
| Display-XL | 80 / 88 | 400 | -1% | Hero headline |
| Display-L | 56 / 64 | 400 | -1% | Section heading |
| H1 | 40 / 48 | 400 | 0 | Page title |
| H2 | 28 / 36 | 500 | 0 | Sub-section |
| H3 | 22 / 30 | 500 | 0 | Card title |
| Body-L | 18 / 28 | 400 | 0 | Editorial body |
| Body | 16 / 26 | 400 | 0 | Default body |
| Small | 14 / 22 | 400 | 0 | Meta, captions |
| Label | 12 / 16 | 500 | +8% | Uppercase eyebrows |

### Color tokens

| Token | Hex | Use |
|---|---|---|
| Bone | `#F8F5EF` | Primary background |
| Ink | `#1A1612` | Primary text, primary buttons |
| Accent | `#6B4423` | One ownable accent (oud brown) |
| Stone | `#C9C2B5` | Borders, dividers |
| Mist | `#E8E2D6` | Card backgrounds, hover surfaces |
| Slate | `#5A554E` | Secondary text |
| Success | `#2E5D3A` | Stock, success states |
| Error | `#8B2E2E` | Error, low stock |

### Radius and stroke

Border radius 0 globally (max 2 on inputs only). Stroke 1px, color Stone.

### Motion

- Hover lift: `translateY(-2px)` over 200ms ease-out.
- Image crossfade on card hover: 250ms.
- Drawer slide-in: 280ms cubic-bezier(0.2, 0.8, 0.2, 1).
- Page transition fade: 150ms.

### Component instances referenced throughout

`<Header>` `<Footer>` `<Container>` `<Section>` `<Button>` `<ProductCard>` `<NoteBadge>` `<PriceDisplay>` `<NewsletterForm>` etc. — defined in the component checklist.

---

## 1. Home

### Desktop layout sketch (1440)

```
┌──────────────────────────────────────────────────────────────┐
│ [utility bar — 36]                                           │
├──────────────────────────────────────────────────────────────┤
│ [header / nav — 80]                                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│              [HERO — full-bleed image / video]               │
│              720h, headline + subline + CTA                  │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ [house positioning strip — 3 statements, 200h]               │
├──────────────────────────────────────────────────────────────┤
│ [featured fragrances — 3 cards, 720h]                        │
├──────────────────────────────────────────────────────────────┤
│ [editorial break — full-bleed image + overlay copy, 600h]    │
├──────────────────────────────────────────────────────────────┤
│ [discovery block — 2 tiles side by side, 480h]               │
├──────────────────────────────────────────────────────────────┤
│ [journal preview — 3 post cards, 560h]                       │
├──────────────────────────────────────────────────────────────┤
│ [press strip — logos, 120h]                                  │
├──────────────────────────────────────────────────────────────┤
│ [newsletter — 320h]                                          │
├──────────────────────────────────────────────────────────────┤
│ [footer — 480h]                                              │
└──────────────────────────────────────────────────────────────┘
```

### Section specs

#### 1.1 Utility bar

- Height 36px. Background Ink, text Bone, Label type.
- Left: rotating message ("Free shipping on orders over ₦150,000").
- Right: currency switcher · "Find a stockist" link.
- Frame: full-bleed; content padded to Container.

#### 1.2 Header

- Height 80px (sticky compresses to 64).
- Layout: 3 columns auto-layout — left nav (Shop, Discover, Journal, Bespoke), centered logo (32–40h), right utilities (Search icon, Account icon, Cart icon w/ count).
- Mega-menu: opens on hover, full-width panel 480h, 4 columns: Shop by Scent Family, Shop by Collection, Discovery, Editorial feature image.
- States: default, hover-link (underline animates from left, 200ms), scrolled (compressed, white-blur background).

#### 1.3 Hero

- Frame: full-bleed 1440 × 720.
- Layers: background image (or 15s muted loop video) → 0–40% Ink gradient overlay bottom-left.
- Content block bottom-left, 80px from edges:
  - Eyebrow Label uppercase ("New Arrival" or campaign label).
  - Headline Display-XL, max 720w, color Bone.
  - Sub-line Body-L Bone @ 80% opacity, max 480w.
  - Primary `<Button>` "Discover the Collection" — 52h, padding 24x.
- Mobile (390): height 640, content padded 16, headline scales to Display-L 56/64.

#### 1.4 House positioning strip

- Container width. Height 200, padding 64 vertical.
- 3 columns equal, 24 gutter. Each column:
  - Eyebrow Label (e.g., "Origin").
  - One sentence statement, H3 22/30, max 280w.
- Divider Stone 1px between columns (vertical, 64h).
- Mobile: stack vertically, 32 gap.

#### 1.5 Featured fragrances

- Container. Vertical padding 96.
- Section header: Eyebrow + Display-L "The Collection" centered, max-width 640. 48 spacing below.
- Grid: 3 columns desktop, 2 tablet, 1 mobile. 24 gutter.
- Each tile = `<ProductCard>` (see PDP section below for card spec).
- Below grid: text link "View all fragrances →", centered, 64 spacing above.

#### 1.6 Editorial break

- Full-bleed. Height 600.
- Background image with 30% Ink overlay bottom-half gradient.
- Content block left-bottom, 96 from edges:
  - Eyebrow Label "Journal".
  - H1 headline white.
  - One-line description.
  - Tertiary text link "Read the story →" with arrow that slides 4px right on hover.

#### 1.7 Discovery block

- Container. Vertical padding 96.
- 2 tiles 50/50, 32 gutter. Each tile: 480h with full-cover image, content overlay bottom-left padded 48.
  - Tile A: "Take the Fragrance Finder" → /finder.
  - Tile B: "Try the Discovery Set" → /discovery-set.
- Each tile: Eyebrow + H2 white + secondary `<Button>` outline-bone.
- Mobile: stack, each 360h.

#### 1.8 Journal preview

- Container. Vertical padding 96.
- Section header: Display-L "From the Journal" left-aligned, "View all →" right-aligned.
- Grid: 3 cards, 24 gutter.
- Each card = `<JournalCard>`: 16:10 image, Eyebrow Label (category) 16 above, H3 title 8 below, Small meta (reading time · date) 16 below.

#### 1.9 Press strip

- Container. Height 120.
- Up to 6 logos, centered, evenly spaced. Logos rendered Stone color (60% opacity), no original brand colors. Hover restores opacity.

#### 1.10 Newsletter

- Container. Padding 96 vertical. Background Mist.
- Centered 640 max content:
  - Eyebrow "Scent Letters".
  - H2 "Notes from the house".
  - Body-L one-line promise.
  - `<NewsletterForm>`: inline email input + `<Button>` "Subscribe", 56 tall row, max 480.
- After submit: form replaces with confirmation copy in Body, 200ms fade.

#### 1.11 Footer

- Background Ink. Padding 96 vertical.
- 4 columns desktop:
  1. Logo + tagline + address.
  2. Shop links.
  3. Help links (Shipping, Returns, Contact, FAQ).
  4. Connect (Instagram, social, language switcher).
- Bottom row: copyright Small, payment logos (Visa/Mastercard/Verve/Paystack/Flutterwave) right-aligned.
- Mobile: accordion column groups.

---

## 2. Shop / Collection

### Desktop layout sketch

```
┌──────────────────────────────────────────────────────────────┐
│ [header]                                                     │
├──────────────────────────────────────────────────────────────┤
│ [breadcrumb · 16 padding]                                    │
├──────────────────────────────────────────────────────────────┤
│ [collection hero — Display-L title, 1-line description, 240h]│
├──────────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌─────────────────────────────────────────────┐ │
│ │ filter   │ │ result count + sort dropdown                │ │
│ │ rail     │ ├─────────────────────────────────────────────┤ │
│ │          │ │ ┌───┐ ┌───┐ ┌───┐                           │ │
│ │ scent    │ │ │ p │ │ p │ │ p │  ← product grid, 3-col   │ │
│ │ family   │ │ └───┘ └───┘ └───┘                           │ │
│ │          │ │ ┌───┐ ┌───┐ ┌───┐                           │ │
│ │ gender   │ │ │ p │ │ p │ │ p │                           │ │
│ │          │ │ └───┘ └───┘ └───┘                           │ │
│ │ size     │ │                                              │ │
│ │ price    │ │ [pagination · load more]                    │ │
│ │ occasion │ │                                              │ │
│ └──────────┘ └─────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│ [discovery nudge — fragrance finder banner]                  │
├──────────────────────────────────────────────────────────────┤
│ [footer]                                                     │
└──────────────────────────────────────────────────────────────┘
```

### Specs

#### 2.1 Collection hero

- Container. Height 240. Padding 64 vertical, 0 horizontal.
- Eyebrow Label "Collection". Display-L title. Body-L 1–2 sentence description, max 720w, Slate.

#### 2.2 Filter rail (desktop)

- Sticky. Width 240. Padding-right 32.
- Stack of `<FilterGroup>` components, each: H3 label + collapse chevron + checkbox list.
- Filter facets: Scent Family, Gender, Concentration, Size, Price (range slider), Occasion, Availability.
- Top: "Clear all" tertiary link when ≥1 filter active.

#### 2.3 Filter bottom sheet (mobile)

- Sticky bottom-bar: "Filters (3)" + "Sort" buttons, 56 tall, full-width.
- Tap "Filters" → sheet slides up 90vh, header "Filters" + close, body groups, sticky footer "Apply (12 results)".

#### 2.4 Sort + count row

- Row above grid. 64 height. Result count Small left, `<SortDropdown>` right.
- Sort options: Featured · Newest · Price (low–high) · Price (high–low) · Top rated.

#### 2.5 Product grid

- 3 columns desktop, 2 tablet, 2 mobile. 24 gutter desktop / 16 mobile.
- Card: see `<ProductCard>` spec below.

#### 2.6 ProductCard spec

```
┌─────────────────┐
│                 │
│   [image 4:5]   │   default: bottle on bone
│                 │   hover: crossfade to second image
│                 │
├─────────────────┤
│ [name H3]       │   24/32 spacing top
│ [notes Small]   │   8 spacing
│ [price Body]    │   16 spacing
│ [stars (opt.)]  │
└─────────────────┘
```

- Card background Bone. Padding 0 top (image flush) + 24 around text block.
- Image aspect 4:5, object-fit cover.
- Hover: card lifts 2px, image crossfades, hidden "Quick view" pill fades in over image bottom-right.
- On out-of-stock: "Notify me" badge top-left over image.
- On limited: small Label "Limited" top-right.

#### 2.7 Pagination

- "Load more" centered button below grid, secondary style.
- Numbered pagination optional below — for SEO.

#### 2.8 Discovery nudge (bottom of grid)

- Container. Padding 96 vertical. Background Mist.
- 2-column 50/50: image left, content right.
- Right: Eyebrow "Not sure where to start?" + H2 "Take the Fragrance Finder" + Body + primary `<Button>`.

---

## 3. Product Detail

### Desktop layout sketch

```
┌──────────────────────────────────────────────────────────────┐
│ [header]                                                     │
├──────────────────────────────────────────────────────────────┤
│ [breadcrumb]                                                 │
├──────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────┐ ┌───────────────────────────┐ │
│ │                            │ │ collection label          │ │
│ │ ┌─┐                        │ │ NAME (Display-L)          │ │
│ │ │t│                        │ │ italic descriptor         │ │
│ │ │h│   [PRIMARY IMAGE]      │ │                           │ │
│ │ │u│   1:1 or 4:5           │ │ price                     │ │
│ │ │m│   Image #1 active      │ │                           │ │
│ │ │b│                        │ │ size variants segmented   │ │
│ │ │s│                        │ │                           │ │
│ │ └─┘                        │ │ [ADD TO BAG]              │ │
│ │                            │ │ [♡ wishlist] notify-me    │ │
│ │                            │ │                           │ │
│ │                            │ │ longevity ●●●○○           │ │
│ │                            │ │ sillage   ●●○○○           │ │
│ │                            │ │ occasion: evening · woody │ │
│ │                            │ │                           │ │
│ │                            │ │ ─────                     │ │
│ │                            │ │ ships 1–2d · free ₦150k+  │ │
│ │                            │ │ 14-day returns            │ │
│ └────────────────────────────┘ └───────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│ [the scent — 3 cols: top, heart, base notes]                 │
├──────────────────────────────────────────────────────────────┤
│ [the story — image + editorial copy]                         │
├──────────────────────────────────────────────────────────────┤
│ [the craft — accordion: ingredients, perfumer, bottle]       │
├──────────────────────────────────────────────────────────────┤
│ [how to wear — occasion, layering, pairings]                 │
├──────────────────────────────────────────────────────────────┤
│ [reviews — gated until content exists]                       │
├──────────────────────────────────────────────────────────────┤
│ [you may also love — 4-card row]                             │
├──────────────────────────────────────────────────────────────┤
│ [discovery nudge]                                            │
├──────────────────────────────────────────────────────────────┤
│ [footer]                                                     │
└──────────────────────────────────────────────────────────────┘
```

### Specs

#### 3.1 Gallery (left, 60% width)

- Container split 60/40. Left column 720w on 1280 content.
- Vertical thumbnail strip 72w on far-left of column, 8 gap. 4–6 thumbs.
- Active image 640w × 800h, 4:5. Click → opens lightbox with zoom.
- Hover image: subtle 1.02 zoom over 400ms.
- Mobile: horizontal swipe carousel, dots indicator, 1:1 aspect, full bleed.

#### 3.2 Info rail (right, 40% width)

- Sticky on scroll until reviews section. Top offset 96 from sticky header.
- Stack auto-layout, 24 gap between groups, 16 within.

| Element | Type | Notes |
|---|---|---|
| Collection label | Label | "Unlimited Collection" |
| Product name | Display-L | 56–64px |
| Descriptor | Body-L italic | "A warm whisper of saffron and oud." |
| Price | H2 | Bold, Ink |
| Volume variants | SegmentedControl | 30ml / 50ml / 100ml |
| Add to Bag | Primary `<Button>` | Full-width, 56h |
| Secondary row | flex | `<IconButton>` heart + tertiary "Notify me when back" if OOS |
| Strength row | flex | "Longevity" Label + 5 dots + "Sillage" Label + 5 dots |
| Occasion tags | Chips | Up to 4 |
| Divider | Stone 1px | |
| Trust row | Small | 3 lines: ships time · free over · returns |

#### 3.3 The Scent

- Container. Padding 96 vertical. Background Bone.
- Section header: Eyebrow "The Scent" + Display-L "Notes" centered.
- 3-column grid, 32 gutter.
- Each column = `<NoteColumn>`: Label "Top / Heart / Base", H3 list of notes (one per line), Small description (50w).
- Mobile: horizontal scroll, 3 cards 80% viewport width each.

#### 3.4 The Story

- Container. Padding 96 vertical.
- 2-column 50/50, 64 gutter, content vertically centered.
- Left: image (5:6 portrait) of perfumer, ingredient, or bottle close-up.
- Right: Eyebrow + H1 + Body-L editorial paragraph 100–150w + small attribution ("Composed by [perfumer]").
- Alternate: image right on next instance for visual rhythm.

#### 3.5 The Craft

- Container, content max 720 centered.
- Eyebrow + H2 "The Craft" centered, 32 spacing below.
- `<Accordion>` 4 items:
  - Ingredients
  - Concentration & Performance
  - Bottle & Packaging
  - Care & Storage
- Each item: header 64h, chevron right, body Body 16/26 with 24 padding when expanded.

#### 3.6 How to Wear

- Container. Padding 96 vertical. Background Mist.
- 3-column tile row: Occasion / Layering / Pairs With.
- Each tile: small icon (line), H3 title, Body 60w, optional link.

#### 3.7 Reviews block

- Hidden until reviews exist.
- When live: container, padding 96 vertical.
- Top row: large average ★ rating (Display-L), count, distribution bars (5/4/3/2/1), sort dropdown, "Write a review" `<Button>` outline.
- Filter chips: All · Photos · Verified · 5 stars.
- List: each review card = avatar/name, date, ★, photos, body, helpful-count.
- Pagination: load 10 more.

#### 3.8 You May Also Love

- Container. Padding 96 vertical.
- Section header: Display-L "You may also love" left, "View all →" right.
- 4-card row, ProductCard component.

#### 3.9 Sticky add-to-bag (mobile only)

- Bottom sheet: 72h, fixed, blurred Bone background.
- Layout: thumbnail (40px) + name (truncated) + price → primary `<Button>` "Add to Bag".

---

## 4. Cart drawer + Checkout

### 4.1 Cart drawer (slides from right)

```
┌──────────────────────────┐
│ Your Bag           ✕     │   header 64h, Ink ink
├──────────────────────────┤
│ ─── Free shipping ───    │
│ ▓▓▓▓▓▓░░░░░░░ ₦40k away  │   progress bar
├──────────────────────────┤
│ ┌──┐ Royale (50ml)       │   line item, 96h
│ │im│ Eau de Parfum        │
│ └──┘ ₦60,000   [- 1 +] ✕ │
├──────────────────────────┤
│ ┌──┐ Solid Oud (30ml)    │
│ │im│  ₦100,000  [- 1 +] ✕ │
├──────────────────────────┤
│ Add a note: [____]       │
│ Gift wrap toggle ⚪       │
├──────────────────────────┤
│ ─── Complete the look ──│
│ [card] [card] [card]     │   horizontal scroll, mini cards
├──────────────────────────┤
│ Subtotal       ₦160,000  │
│ Shipping        calc'd   │
│                          │
│ [   CHECKOUT   ]         │   primary, full-width, 56h
│ secure · paystack/flw    │   trust microcopy
└──────────────────────────┘
```

- Drawer width: 480 desktop, 100% mobile. Background Bone.
- Slide-in 280ms cubic-bezier(0.2, 0.8, 0.2, 1). Backdrop Ink @ 40%.
- Lock body scroll while open.

### 4.2 Checkout — single-page, sectioned

```
┌──────────────────────────────────────────────────────────────┐
│ [minimal header — logo only, secure padlock right]           │
├──────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────┐ ┌─────────────────────┐ │
│ │ 1. Contact                       │ │ Order Summary       │ │
│ │ ▢ email                          │ │ 2 items             │ │
│ │ ▢ phone                          │ │                     │ │
│ │ □ keep me updated                │ │ ┌─┐ Royale 50ml     │ │
│ │                                  │ │ └─┘ × 1   ₦60,000   │ │
│ │ 2. Shipping                      │ │                     │ │
│ │ ▢ name                           │ │ ┌─┐ Solid Oud 30ml  │ │
│ │ ▢ address                        │ │ └─┘ × 1   ₦100,000  │ │
│ │ ▢ city · state · postal          │ │                     │ │
│ │ ○ standard ○ express             │ │ ─────────────       │ │
│ │                                  │ │ Subtotal  ₦160,000  │ │
│ │ 3. Payment                       │ │ Shipping  ₦5,000    │ │
│ │ [ Paystack ] [ Flutterwave ]     │ │ Total     ₦165,000  │ │
│ │ [ pay button ]                   │ │                     │ │
│ │                                  │ │ promo code [____]   │ │
│ │ 🔒 secure · 14d returns          │ │                     │ │
│ └──────────────────────────────────┘ └─────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

- Layout: 2 columns desktop, form 60% / summary 40%, summary sticky. Single column mobile, summary collapses to top accordion ("View order summary ▾").
- Form sections numbered, each with H2, 48 spacing between.
- Field stacks: 56h inputs, label floats above, error state Error red 1px stroke + Small message below.
- Payment row: Tabs `<PaymentTab>` for Paystack and Flutterwave, each with logo + name. Selected tab triggers respective Inline JS modal on "Place Order".
- "Place Order" primary `<Button>`, full-width, 64h, label dynamic ("Pay ₦165,000").
- Trust microcopy below button: 🔒 SSL · 14-day returns · contact support.

### 4.3 Order confirmation

- Centered narrow column, 640 max.
- Display-L "Thank you, [Name]" with first-name personalization.
- Body-L confirmation message + estimated delivery.
- Order number (Small Label).
- 2 secondary CTAs side by side: "Track your order" outline + "Read the Journal" tertiary.
- Below: cross-sell row "While you wait, discover…" with 3 ProductCards.

---

## 5. House Story

### Layout sketch

```
┌──────────────────────────────────────────────────────────────┐
│ [header]                                                     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│           [CINEMATIC HERO IMAGE — full bleed, 80vh]          │
│           overlay statement Display-XL bottom-left            │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ [origin — image left | text right]                           │
├──────────────────────────────────────────────────────────────┤
│ [philosophy — text left | image right]                       │
├──────────────────────────────────────────────────────────────┤
│ [craft process — full-bleed image with overlay copy]         │
├──────────────────────────────────────────────────────────────┤
│ [the team — 4-card grid]                                     │
├──────────────────────────────────────────────────────────────┤
│ [closing CTA — discover collection / book bespoke]           │
├──────────────────────────────────────────────────────────────┤
│ [footer]                                                     │
└──────────────────────────────────────────────────────────────┘
```

### Specs

#### 5.1 Cinematic hero

- Full-bleed. 80vh (min 720h, max 900h).
- Background image (or 20s muted loop) with 30% Ink gradient bottom 60%.
- Overlay copy bottom-left, 96 from edges:
  - Eyebrow Label "Our House".
  - Display-XL one-sentence statement, max 880w, color Bone.
- Mobile: Display-L headline, padded 16.

#### 5.2 Editorial sections (image-text alternating)

- Container. Padding 128 vertical between sections.
- 2-column grid 50/50, 64 gutter, vertically centered.
- Image: aspect 4:5, full column width.
- Text column:
  - Eyebrow Label.
  - H1 section title.
  - Body-L paragraph(s), max 480w, 24 paragraph gap.
  - Optional pull-quote in Display-L italic.
- Alternate image left/right per section.

#### 5.3 Full-bleed editorial break

- Use once, between Origin/Philosophy and Craft/Team.
- Full-bleed image 720h with overlay text block bottom-right (mirror of hero), Display-L white statement.

#### 5.4 The Team

- Container. Padding 128 vertical.
- Section header: Display-L "The Hands Behind the House" centered, 64 below.
- 4-card grid, 24 gutter (2 columns mobile).
- Each card: square portrait image, H3 name, Label role, optional Body 40w bio.

#### 5.5 Closing CTA

- Container. Padding 128 vertical. Background Ink, color Bone.
- Centered 640 max.
- Eyebrow + Display-L "Make your impact" + Body-L 1-line + 2 buttons in row: primary "Shop the Collection" + secondary outline "Book a Bespoke Consultation".

---

## 6. Component states checklist (for every interactive)

- Default
- Hover (desktop only)
- Focus (visible 2px Ink ring, 2px offset, on every focusable)
- Active / pressed
- Disabled (40% opacity, no events)
- Loading (skeleton or spinner, depending on context)
- Error (Error stroke + message)
- Empty (PDP reviews, search no-results, cart empty)

## 7. Accessibility annotations

- Color contrast Ink-on-Bone ratio 12:1 (AAA). Slate-on-Bone 7:1 (AAA). Verify any accent overlays meet 4.5:1.
- All images require alt text (Sanity schema enforced).
- Keyboard navigation: tab order top→bottom, mega-menu fully keyboard-operable, focus trap inside drawers.
- Skip-to-content link as first focusable element.
- Forms: labels associated, errors aria-described, inline.

## 8. Figma file structure (suggested)

```
01-Foundations
   - Color tokens
   - Type tokens
   - Spacing
   - Grid
   - Iconography

02-Components
   - Atoms (Button, Input, Badge, ...)
   - Molecules (ProductCard, FilterGroup, ...)
   - Organisms (Header, Footer, PDPInfoRail, ...)

03-Pages — Desktop
   - 01 Home
   - 02 Shop
   - 03 PDP
   - 04 Cart + Checkout
   - 05 House Story

04-Pages — Mobile
   - (same five)

05-Flows
   - Browse → PDP → Cart → Checkout → Confirmation
   - Fragrance Finder
   - Sign-in (later phase)

06-Handoff
   - Annotated specs
   - Asset exports
```

## 9. Hand-off notes

- All numeric values above are tokens, not magic numbers. Mirror them in `tailwind.config.ts`.
- Components in Figma should be built with Auto Layout and named to match the React component names exactly (Button, ProductCard, NoteColumn) so dev and design reference the same vocabulary.
- Use Variants for state (default/hover/focus/disabled), not separate components.
- All copy in mocks should be real (or close to it). No "Lorem ipsum" past discovery.
