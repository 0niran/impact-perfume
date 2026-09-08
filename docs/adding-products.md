# Adding and updating products in Medusa

A practical checklist for anyone managing the catalogue from Medusa Admin. It
exists because a product can be fully created and priced yet still be invisible
to customers if one setting is missed. Follow the checklist and run the audit,
and nothing goes live half-configured.

## The two things people miss

1. **Sales channel.** The storefront only shows products in its own sales
   channel. NG site reads **Impact NG**; Canada site reads **Impact CA**. A
   product not in the channel is invisible, with no error anywhere. This is what
   took the Oils page down.
2. **The tile number.** The Number Series and Oils grids only show a product
   whose number resolves, from either `metadata.number` (for example `12`) or a
   handle like `no-12` / `oil-no-12`. Without it the product is dropped from the
   grid silently. It still works on a direct link, but never appears in the grid.

## The easy way: the guided script

```
npm run new-product
```

It asks for everything in plain language, one question at a time, and handles
the parts that are easy to get wrong: it writes currency-level prices only (the
admin shows four boxes for a two-price decision), creates the product as a
**draft**, stocks it, checks that both markets can actually see a price and
stock, and only then offers to publish.

It also asks for the product-page details — character word, fragrance notes,
signature colour, strength bars — and writes them to the right metadata keys, so
you never have to type a key name. Anything you leave blank is simply left off
the page, and the summary before it writes tells you what a shopper will not
see.

`npm run new-product -- --help` lists every question, and every question can be
answered up front as a flag if you would rather do it in one line.

Use Medusa Admin directly when you are editing an existing product, or when you
need something the script does not cover (multiple variants, for instance). The
checklist below is the manual equivalent.

## Add a new product by hand

In Medusa Admin, create the product, then confirm every box below before you
tell anyone it is live:

- [ ] **Status = Published.** Drafts never show on the site.
- [ ] **Sales channels.** Tick **Impact NG** to sell in Nigeria, **Impact CA**
      to sell in Canada, or both. New products default to Impact NG, so do not
      untick it unless the product is Canada-only.
- [ ] **Price.** Add an **NGN** price for NG and a **CAD** price for CA. A market
      with no price shows "price on request".
- [ ] **Category.** Assign the right category (Oils, Signature, and so on) or the
      product will not appear on that category page, only via a direct link.
- [ ] **Tile number** (Number Series and Oils only). Set `metadata.number`, or
      use a `no-<n>` / `oil-no-<n>` handle. Skip this for one-off products that
      do not belong on a number grid.
- [ ] **Inventory.** Add a stock level at **Impact Perfume HQ** (Lagos) for NG
      and/or **Canada** for CA, with a quantity above zero. Zero stock shows the
      product as out of stock and blocks checkout.
- [ ] **Image.** Upload a product image or thumbnail. Without one the storefront
      falls back to a generic placeholder.
- [ ] **Product page details.** Everything the page shows beyond title and price
      lives in **Metadata**, under the exact keys in the table below.

### Product page metadata (fragrance notes and the rest)

Add these in the product's **Metadata** panel. Every one is optional; leave a key
out and that part of the page is simply not rendered.

| Key | What it is | Example |
| --- | --- | --- |
| `descriptor` | The character word under the product name. The most visible one. | `Citrus` |
| `scent_family` | Grouping shown on the page | `Citrus` |
| `tagline` | One short sentence | `Sicilian sunlight on cool wood.` |
| `top_notes` | First impression | `Bergamot, Grapefruit, Sicilian Lemon` |
| `heart_notes` | The character | `Sandalwood` |
| `base_notes` | What lingers | `Musk, Ambergris, Cedar` |
| `signature_color` | Hex, painted behind the bottle and on the share card | `#E4B250` |
| `signature_color_name` | Name for that colour | `Amber` |
| `longevity` | Strength bar, `1`-`5` | `4` |
| `sillage` | Strength bar, `1`-`5` | `3` |
| `number` | Grid placement, see above | `11` |

**Notes are one comma-separated line per tier**, not a list — the storefront
splits on the comma. Spacing does not matter.

If all three note fields are empty the notes pyramid is hidden rather than
rendered blank, so a product without notes still looks finished.

## Update stock for an existing product

- Edit the stock quantity at the location that matches the market:
  **Impact Perfume HQ** (Lagos) for NG, **Canada** for CA.
- The change reflects on the site within about **2 minutes** (the storefront
  caches the catalogue for 120 seconds). No deploy is needed. To see it at once,
  run `npm run refresh-storefront`.

## Verify it went live

1. From the repo, run the catalogue audit against live Medusa:

   ```
   npm run audit:catalogue
   ```

   It compares what is published against what each storefront actually serves and
   flags anything hidden, unpriced, or missing a grid number. `✗` lines are hard
   problems (fix before selling); `!` lines are advisory (out of stock, no image).
   It exits non-zero when there is a hard problem, so it can gate a deploy later.

2. Open the live page and hard-refresh. Allow up to 2 minutes for the cache to
   turn over, or run `npm run refresh-storefront` to flush it immediately.

## What each field controls (reference)

| Field | Controls | If missing |
| --- | --- | --- |
| Status | Whether it shows at all | Draft is invisible |
| Sales channel | Which market storefront sees it | Invisible on that market |
| NGN / CAD price | Price shown per market | "Price on request" |
| Category | Which category page lists it | Only reachable by direct link |
| `metadata.number` | Placement on Number / Oils grids | Dropped from the grid |
| Stock level (per location) | Sellability per market | Out of stock, checkout blocked |
| Image | Product photo | Generic placeholder |
| `descriptor` | Character word under the name | Line is blank |
| `top_notes` / `heart_notes` / `base_notes` | The notes pyramid | Pyramid is hidden |
| `signature_color` | Colour behind the bottle, and the share card | Falls back to house gold |
| `longevity` / `sillage` | Strength bars | Bar is hidden |

## Related

- `scripts/new-product.ts` — the guided creation script (`npm run new-product`).
- `scripts/audit-catalogue.ts` — the audit this doc refers to.
- `docs/multi-region-setup.md` — how NG and CA markets are wired.
