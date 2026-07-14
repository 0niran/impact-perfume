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

## Add a new product

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

## Update stock for an existing product

- Edit the stock quantity at the location that matches the market:
  **Impact Perfume HQ** (Lagos) for NG, **Canada** for CA.
- The change reflects on the site within about **60 seconds** (the storefront
  refreshes each page on a 60 second cycle). No deploy is needed.

## Verify it went live

1. From the repo, run the catalogue audit against live Medusa:

   ```
   npm run audit:catalogue
   ```

   It compares what is published against what each storefront actually serves and
   flags anything hidden, unpriced, or missing a grid number. `✗` lines are hard
   problems (fix before selling); `!` lines are advisory (out of stock, no image).
   It exits non-zero when there is a hard problem, so it can gate a deploy later.

2. Open the live page and hard-refresh. If it is a grid page, allow up to 60
   seconds for the cache to turn over.

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

## Related

- `scripts/audit-catalogue.ts` — the audit this doc refers to.
- `docs/multi-region-setup.md` — how NG and CA markets are wired.
