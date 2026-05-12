# Brand Discovery — Impact Number Series

What the official catalogue PDF reveals about the brand, and how to translate it into world-class commerce UX.

## The brand DNA

- **Brand name**: Impact Perfumes & Oils
- **Voice**: Confident, almost defiant. "Even an enemy will appreciate the gift of a good smelling perfume." — D.A., CEO. This line is ownable, quotable, and should sit at the heart of the House Story page.
- **Wordmark**: A flowing italic script "Impact" — distinctive, must be preserved as the primary logotype.
- **Sub-mark**: "No. Series" — italic script, used as a sub-line under the wordmark on every catalogue page.
- **Iconic label**: A black square label with the white "Impact / Perfumes & Oils" wordmark, beneath which sits a circular numbered medallion. The medallion carries a hand-drawn perfume-bottle silhouette filled with a paisley pattern of botanical icons (drops, petals, vials). This is the brand's strongest visual asset. It must appear:
  - On every PDP near the price
  - On every product card (small)
  - As favicon and Apple touch icon
  - On packaging, gift-wrap, and email
- **Bottle architecture**: All 50 are the same square heavy-glass flacon with a black cap and silver neck-ring. The differentiator is the **liquid color** — a clear glass filled with a tinted juice that defines each fragrance's identity.

## The "Number Series" is the hero — and the UX framework

The catalogue shows a deliberate, gallery-like collection: 50 numbered EDPs, each in its own signature color. This is structurally identical to how the great houses build cult: Chanel No. 5, Le Labo Santal 33, Maison Margiela's REPLICA codex.

We design **around the number**, not around the name.

**Implications, in order of impact:**

1. **Naming convention**: Public-facing names are *Impact No. 1*, *Impact No. 2* … *Impact No. 50*. The descriptor (Fruity, Woody, Oud) is metadata, not the primary name. URLs: `/no/1`, `/no/2` (also accessible via `/product/no-1`).
2. **Colour-as-identity**: Every fragrance has a signature color (parsed into `products.seed.json`). The PDP background, the card hover state, the cart line item, the order confirmation accent, the email banner — all render in that fragrance's color. This turns commerce into a tactile, chromatic experience.
3. **The "Find Your Number" promise**: The Fragrance Finder quiz output isn't "we recommend Royale Silver" — it's "**You're a No. 14**." Shareable, memorable, ownable.
4. **The Number Wall**: The shop landing is a full-bleed grid of 50 colored tiles, each with the numbered medallion centered. Like an art-gallery wall of paint chips. Hovering pulls the tile forward, reveals the descriptor and notes pyramid in miniature. This becomes the brand's signature on-site experience and the most screenshot-able moment for Instagram.
5. **The "No. X" badge** on every card — top-left, in serif, large. Small "—" before the descriptor: e.g., "No. 5 — Sweet Oud."
6. **Wallet-side, customer-side**: Order confirmations, returning-customer welcomes, etc. lead with "Welcome back, No. 14 lover." It's a soft loyalty hook.

## Product line architecture (NEW — restructures the navigation)

The catalogue reveals four distinct product lines, not just one. The site's primary nav must reflect this:

```
THE NUMBER SERIES   ·   OILS   ·   DIFFUSERS   ·   BESPOKE
```

| Line | What it is | Catalogue says |
|---|---|---|
| **The Number Series** | 50 numbered EDPs, 100ml, alcohol-based, the flagship | "50 unique fragrances. Though the bottles may look the same, each one promises a unique scent adventure." |
| **Impact Oils** | Alcohol-free perfume oils, intensely concentrated | "A few drops last up to 48 hours. Perfect for dry skin." |
| **Car Diffusers** | Essential-oil blend for vehicles | "Crafted with a unique blend of essential oils to keep your vehicle fresh and odor-free." |
| **Reed Diffusers** | Home fragrance | "Gently and evenly spread delightful fragrances that enhance, not overpower, your living space." |

DIFFUSERS becomes a single nav item that resolves to a sub-landing with Car and Reed.

The mega-menu under THE NUMBER SERIES gets new shape:

```
By Family               By Mood             Discovery
─────────               ─────────           ─────────
Fruity                  Daytime             Find Your Number (quiz)
Woody                   Evening             Discovery Set (5 × 5ml)
Oud                     Date Night          Gift Finder
Floral                  Office              View All 50
Citrus                  Travel
Vanilla
Amber
... (17 families)
```

## The 17 scent families (parsed from the catalogue)

These are not invented — they appear directly on the bottle imagery as the descriptor below "Description:". They become the canonical filter taxonomy.

- Fruity (9 fragrances)
- Woody (10)
- Vanilla (4)
- Amber (5)
- Sweet (4)
- Citrus (3)
- Aromatic (2)
- Warm Spicy (2)
- Floral (2)
- Rose (2)
- Sweet Oud (1)
- Fresh Spicy (1)
- Oud (1)
- Leather (1)
- Coconut (1)
- Tropical (1)
- Powdery (1)

The distribution itself is editorial fodder — Woody and Fruity are the house's strengths.

## Fragrance Finder — concrete logic (replaces the generic placeholder in the brief)

Five questions. Each maps to features in the seeded data so the recommendation is real, not vibes.

1. **What's the moment?** (Day · Evening · Office · Date · Celebration · Travel) → maps to a curated set per occasion.
2. **What pulls you in first?** (Citrus & Air · Fruit · Florals · Spice · Wood & Smoke · Sweet & Gourmand) → narrows scent family.
3. **How loud is your signature?** (A whisper · Just-noticed · A presence · A statement) → maps to a longevity/sillage tier we'll add to enrichment data.
4. **Pick a feeling.** (Calm · Magnetic · Joyful · Mysterious · Polished · Free) → maps to a hand-curated mood tag per fragrance.
5. **Sweet, or savoury at heart?** (Sweet · Balanced · Savoury) → final filter.

Output: "**You're a No. 14.**" with the bottle in its signature color, the notes pyramid, the descriptor, and three "If this is you, also try…" cards.

## Three signature on-site moments to commit to

1. **The Number Wall** (`/shop` landing) — 50 colored tiles, each rendering its medallion. Lighthouse-friendly because it's mostly CSS gradients + a single SVG medallion.
2. **The Fragrance Finder result page** — full-bleed, signature color background, white serif "You're a No. X", notes pyramid revealed with stagger animation.
3. **The PDP** — split layout: left half is a ~80vh full-bleed signature color block with the bottle photo centered (mimicking the catalogue page). Right half is the editorial info rail. This is the brand's catalogue, online.

## Updated design tokens

Add to `tailwind.config.ts`:

```ts
colors: {
  // ... existing brand tokens (bone, ink, stone, mist, slate, accent)
  no: {
    1: "#1FA84F",   2: "#A8137C",   3: "#C18A1F",   4: "#C9281D",
    5: "#1E64A4",   6: "#A8B125",   7: "#C81273",   8: "#0E5F58",
    9: "#1240A6",  10: "#C71285",  11: "#1D2B9C",  12: "#A0157E",
   13: "#A98917",  14: "#1E78B8",  15: "#A1147F",  16: "#0E78B8",
   17: "#85801C",  18: "#5C29A0",  19: "#1A4DC4",  20: "#A11AB1",
   21: "#B41349",  22: "#0E3DA8",  23: "#7414B0",  24: "#9C9412",
   25: "#0F7E7E",  26: "#B91268",  27: "#C25719",  28: "#0F8F3E",
   29: "#7E2EB4",  30: "#19A0BE",  31: "#1928B8",  32: "#B414A8",
   33: "#669C13",  34: "#B41454",  35: "#C0671A",  36: "#5022C4",
   37: "#0DA227",  38: "#C72020",  39: "#B91261",  40: "#2123A8",
   41: "#A91239",  42: "#B58818",  43: "#1F9F7F",  44: "#B6178D",
   45: "#C72124",  46: "#19BB22",  47: "#B919AE",  48: "#1F2BA8",
   49: "#C8541E",  50: "#1A87C6",
},
```

Then anywhere we render a fragrance in its signature color we use `bg-no-${number}` or fetch `signatureColor` from the seeded enrichment data and apply via inline style. The hard-coded Tailwind palette is for static class generation; runtime use prefers the data field.

## Updated Sanity productEnrichment schema (additions)

Beyond the schema in the original SANITY_HANDOFF, add these fields per fragrance:

- `number` (integer, required, unique) — 1 to 50
- `descriptor` (string, required) — e.g., "Fruity", "Sweet Oud" — matches the catalogue
- `signatureColor` (string hex, required) — e.g., `#1E64A4`
- `signatureColorName` (string) — e.g., "Cobalt"
- `tagline` (string, max 80 chars) — the italic descriptor under the name
- `mood` (array of strings, options: Calm, Magnetic, Joyful, Mysterious, Polished, Free) — for the quiz
- `occasion` (array of strings, options: Day, Evening, Office, Date, Celebration, Travel)
- `longevity` (number 1–5) — for the strength indicator
- `sillage` (number 1–5)
- `category` (string, options: number-series, oil, car-diffuser, reed-diffuser) — for filtering across product lines

## Updated PDP structure (replaces §3 of the wireframe spec)

The PDP becomes a love letter to the catalogue page itself.

```
┌──────────────────────────────────────────────────────────────┐
│ [header — sticky, transparent over hero]                     │
├──────────────────────┬───────────────────────────────────────┤
│                      │ ┌─────────────────────────────────┐   │
│                      │ │ [serif] No. 5                   │   │
│   [bottle photo,     │ │ ─ Sweet Oud                     │   │
│    centered, on      │ │                                 │   │
│    full-bleed        │ │ [italic] An infinite garden     │   │
│    signatureColor    │ │           after dusk.           │   │
│    background,       │ │                                 │   │
│    ~80vh tall]       │ │ ₦XX,XXX                         │   │
│                      │ │                                 │   │
│                      │ │ [Add to Bag — full-width]       │   │
│                      │ │                                 │   │
│                      │ │ Longevity ●●●●○                 │   │
│                      │ │ Sillage   ●●●○○                 │   │
│                      │ │                                 │   │
│                      │ │ [tags: Evening · Date · Travel] │   │
│                      │ │                                 │   │
│                      │ │ Ships in 1–2 days · Free over...│   │
│                      │ └─────────────────────────────────┘   │
├──────────────────────┴───────────────────────────────────────┤
│ [Notes — three columns: Top · Heart · Base]                  │
├──────────────────────────────────────────────────────────────┤
│ [Story — image + editorial paragraph]                        │
├──────────────────────────────────────────────────────────────┤
│ [If you love No. 5, also explore — 4 sibling cards]          │
├──────────────────────────────────────────────────────────────┤
│ [The Number Wall — peek of all 50]                           │
├──────────────────────────────────────────────────────────────┤
│ [Reviews]    [Discovery nudge]    [Footer]                   │
└──────────────────────────────────────────────────────────────┘
```

## What the client must still provide

The catalogue gives us everything except:

- **Pricing** per fragrance (NGN). Whether tiered or flat.
- **Stock** per SKU.
- **Product imagery** — the catalogue images are the catalogue images. For a luxury site we want at least one campaign or lifestyle shot per fragrance, plus a packaging close-up. (We can launch with the catalogue shots as the bottle hero on signatureColor backgrounds, then upgrade.)
- **Discovery Set** — does it exist as a product? If yes, what's in it.
- **The Oils, Car Diffuser, Reed Diffuser** SKU lists. These weren't in the PDF.
- **Press, retailers, stockists** — for the home and footer.
- **B2B copy** for Bespoke / Scenting Solutions / Partnerships.

## What changes elsewhere

- Task 18 → **Paystack only**. Flutterwave is OUT.
- Task 19 → seed Medusa from `data/products.seed.json` (this file). Old WP migration is no longer the source.
- Task 22 (Shop / Collection) → becomes the Number Wall.
- Task 23 (PDP) → updated layout per above.
- Task 26 (Discovery features) → Fragrance Finder logic is now real, not placeholder.
- Wireframe spec → §2 (Shop) and §3 (PDP) get rewritten against this doc.
