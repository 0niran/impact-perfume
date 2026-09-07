# Editing bespoke prices in the Medusa admin

Nothing about bespoke pricing is hardcoded in the storefront. Every price and
rate is read from **four draft products** in Medusa, so the whole `/bespoke`
estimate is editable in the admin.

They are drafts on purpose: they are price-carrying config records, not things
anyone can buy. A draft never appears in the store API, so customers cannot see
or order them.

## Where the numbers live

| Product (handle) | Holds | Edited as |
|---|---|---|
| `bespoke-base` | Base price per volume (50 / 100 / 200ml) | Variant prices |
| `bespoke-bottle` | Bottle-finish surcharge (Gloss / Matted) | Variant prices |
| `bespoke-inscription` | Inscription surcharge (Gold / Silver / Sticker) | Variant prices |
| `bespoke-config` | Business rates (deposit %, discount tiers, quote threshold) | Product **metadata** |

Find them in **Products**. They are drafts, so clear any "Published" filter, or
search for `bespoke`.

## Editing a price

Open the product → the variant → **Prices**.

Fill the **currency** fields only:

```
NGN   80000        <- fill this
CAD   110          <- and this

Impact Perfume HQ  <- leave blank
Canada             <- leave blank
```

Two things that bite people here:

- **Amounts are in MAJOR units.** `80000` means ₦80,000, and `110` means
  CA$110. Not kobo, not cents. The storefront converts on read.
- **Region fields override currency fields silently.** Filling both is a second
  place to forget to update. You only need a region price if two regions ever
  share one currency — see `docs/…` on pricing, or just leave them empty.

Both currencies are already populated today:

| SKU | NGN | CAD |
|---|---|---|
| `BSPOKE-BASE-50` | 48,000 | 65 |
| `BSPOKE-BASE-100` | 80,000 | 110 |
| `BSPOKE-BASE-200` | 144,000 | 195 |
| `BSPOKE-BOTTLE-GLOSS` | 0 | 0 |
| `BSPOKE-BOTTLE-MATTED` | 10,000 | 15 |
| `BSPOKE-INSCR-GOLD` | 20,000 | 28 |
| `BSPOKE-INSCR-SILVER` | 18,000 | 25 |
| `BSPOKE-INSCR-STICKER` | 8,000 | 12 |

## Do not change the SKUs

The storefront matches variants **by SKU**, not by position or title:

```
BSPOKE-BASE-50 / -100 / -200
BSPOKE-BOTTLE-GLOSS / -MATTED
BSPOKE-INSCR-GOLD / -SILVER / -STICKER
```

Rename the variant **title** freely — that is what customers see, and it is read
from the title. But change a SKU and that option silently disappears from the
configurator.

## Editing the rates

Rates are **metadata on `bespoke-config`**, one scalar key each so every value is
a simple number:

| Key | Meaning | Current |
|---|---|---|
| `deposit_pct` | Deposit taken up front, % of total | 50 |
| `quote_min_qty` | Quantity at or above which we quote instead of pricing | 50 |
| `discount_tier1_min` / `discount_tier1_pct` | First bulk tier: min qty, % off | 5 / 5 |
| `discount_tier2_min` / `discount_tier2_pct` | Second tier | 12 / 10 |
| `discount_tier3_min` / `discount_tier3_pct` | Optional third tier | not set |

A tier only applies when **both** its keys are present and above zero, so a
half-filled tier is ignored rather than applied wrongly.

## When changes appear

The config is cached for **2 minutes**. To see an edit immediately:

```bash
npm run refresh-storefront
```

That flushes both the catalogue and the bespoke config. Once Medusa's webhook is
configured (`STOREFRONT_URL` + `STOREFRONT_REVALIDATE_TOKEN` on Railway), edits
invalidate automatically and this is unnecessary.

## The safety net

If a currency has **no base prices**, or the config products cannot be read, the
configurator does **not** show a zero price. It degrades to the "we will confirm
your price" quote path. So a half-finished edit costs you a quote request, never
a customer being charged the wrong amount.

Prices are per currency, so Nigeria and Canada are independent: setting one does
not affect the other.
