/**
 * Guided product creation.
 *
 *   npm run new-product
 *
 * Exists because the Medusa admin makes two things easy to get wrong, and both
 * have bitten this store:
 *
 *  1. PRICING. The admin shows a field per store currency AND per region. With
 *     two regions mapping 1:1 to two currencies you get four boxes for a
 *     two-price decision, and a region price silently overrides its currency
 *     price. This script writes currency-level prices only (NGN, CAD), which is
 *     what this catalogue actually wants.
 *
 *  2. PUBLISHING. A new product defaults to published, so it goes live before it
 *     has stock, a price or an image — customers see it, out of stock. Here the
 *     product is created as a DRAFT, stocked and priced, verified through the
 *     public store API, and only then offered for publishing.
 *
 *  3. THE PRODUCT PAGE. Everything the PDP shows beyond title and price — the
 *     descriptor under the name, the notes pyramid, the signature colour behind
 *     the bottle, the strength bars — is Medusa product metadata under specific
 *     keys. Typing those keys by hand in the admin is easy to get wrong and easy
 *     to forget, which is why products have gone live reading "undefined" or
 *     with no notes at all. This script asks for them in plain language and
 *     writes the keys itself.
 *
 * Everything is written through the same admin endpoints the seed scripts use.
 */
import * as dotenv from 'dotenv'
import path from 'path'
import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { adminAuthHeader, MEDUSA_BACKEND_URL } from './lib/medusaAdmin'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const DRY = process.argv.includes('--dry-run')

/**
 * Every prompt can also be supplied as --flag=value, so the script works
 * unattended (and can be exercised without a TTY — readline/promises rejects
 * once a piped stdin reaches EOF, so prompting is interactive-only).
 *
 *   npm run new-product -- --title="Oud Reed" --category=home-diffusers \
 *     --ngn=25000 --cad=30 --ng-qty=5 --ca-qty=5 --yes
 *
 * Fragrance details have flags too, so a whole product can be created in one
 * line:
 *
 *   ... --descriptor=Citrus --scent-family=Citrus \
 *       --top-notes="Bergamot, Grapefruit" --heart-notes=Sandalwood \
 *       --base-notes="Musk, Cedar" --color=#E4B250 --color-name=Amber \
 *       --longevity=4 --sillage=3
 *
 * Pass --no-fragrance to skip that section outright (scenting machines and
 * other hardware have no notes).
 */
function flag(name: string): string | undefined {
  const prefix = `--${name}=`
  const hit = process.argv.find((a) => a.startsWith(prefix))
  return hit?.slice(prefix.length)
}
const ASSUME_YES = process.argv.includes('--yes')
const PUBLISH_FLAG = process.argv.includes('--publish')

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Create a product, end to end.

  npm run new-product              answer the questions as they come
  npm run new-product -- --help    this text

It asks for everything a product needs to be complete: name, category, price
in both markets, opening stock, and the product-page details (character word,
fragrance notes, signature colour, strength bars).

Nothing goes live by accident. The product is created as a DRAFT, stocked and
priced, checked, and only published when you say so.

Options, all optional — anything you leave out is asked for:

  --title=            product name
  --handle=           url, eg. oud-manifique (default: from the name)
  --category=         category handle, eg. home-diffusers
  --size=             variant label            (default: 100ml EDP)
  --ngn=  --cad=      price per market, whole units (50000 = N50,000)
  --ng-qty= --ca-qty= opening stock per market
  --description=      product description
  --image=            image url

  Product page:
  --descriptor=       one-word character, eg. Citrus
  --scent-family=     eg. Oriental            (default: same as descriptor)
  --tagline=          one short sentence
  --top-notes=        comma separated, eg. "Bergamot, Grapefruit"
  --heart-notes=      comma separated
  --base-notes=       comma separated
  --color=            hex, eg. #E4B250 (or e4b250, or eb5)
  --color-name=       eg. Amber
  --longevity=        1-5, blank to leave the bar off
  --sillage=          1-5, blank to leave the bar off
  --number=           series number, for numbered products
  --no-fragrance      skip the product-page section entirely

  --dry-run           show what would happen, write nothing
  --yes               do not ask for confirmation
  --publish           publish immediately if every check passes

After publishing, the site can take up to 2 minutes to show it.
Run \`npm run refresh-storefront\` to show it straight away.
`)
  process.exit(0)
}

async function api(method: 'GET' | 'POST', p: string, body?: unknown) {
  const res = await fetch(`${MEDUSA_BACKEND_URL}${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: adminAuthHeader() },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${method} ${p} -> ${res.status}: ${text.slice(0, 400)}`)
  return text ? JSON.parse(text) : {}
}
const get = (p: string) => api('GET', p)
const post = (p: string, body: unknown) => api('POST', p, body)

/** Title -> url-safe handle, matching the existing catalogue's style. */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

/**
 * Notes are stored as one comma-separated string per tier, because that is what
 * the storefront's splitNotes() parses. Tidy the separators on the way in so a
 * stray double comma or missing space never reaches a product page.
 *
 *   "Bergamot ,Lemon,, Cedar"  ->  "Bergamot, Lemon, Cedar"
 */
function normaliseNotes(raw: string): string {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .join(', ')
}

/**
 * The signature colour is painted straight into a CSS gradient behind the
 * bottle and into the share card, so a malformed value degrades the page
 * silently rather than erroring. Accepts "E4B250", "#e4b250" and "#eb5".
 */
function normaliseHex(raw: string): string | null {
  const s = raw.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(s)) {
    return `#${s[0]}${s[0]}${s[1]}${s[1]}${s[2]}${s[2]}`.toUpperCase()
  }
  if (/^[0-9a-fA-F]{6}$/.test(s)) return `#${s}`.toUpperCase()
  return null
}

interface Market {
  channelId: string
  locationId: string
  label: string
}

async function resolveMarkets(): Promise<{ ng: Market; ca: Market }> {
  const { sales_channels } = await get('/admin/sales-channels?limit=50&fields=id,name')
  const { stock_locations } = await get('/admin/stock-locations?limit=50&fields=id,name')

  // Resolved by name rather than hardcoded ids so this keeps working if the
  // backend is ever reseeded.
  const chan = (needle: string) =>
    sales_channels.find((c: any) => c.name.toLowerCase().includes(needle))
  const loc = (needle: string) =>
    stock_locations.find((l: any) => l.name.toLowerCase().includes(needle))

  const ngChan = chan('ng')
  const caChan = chan('ca')
  const ngLoc = loc('impact perfume hq') ?? loc('hq') ?? loc('lagos')
  const caLoc = loc('canada')

  const missing: string[] = []
  if (!ngChan) missing.push('sales channel matching "NG"')
  if (!caChan) missing.push('sales channel matching "CA"')
  if (!ngLoc) missing.push('stock location for Nigeria')
  if (!caLoc) missing.push('stock location for Canada')
  if (missing.length) throw new Error(`Could not resolve: ${missing.join(', ')}`)

  return {
    ng: { channelId: ngChan.id, locationId: ngLoc.id, label: `${ngChan.name} / ${ngLoc.name}` },
    ca: { channelId: caChan.id, locationId: caLoc.id, label: `${caChan.name} / ${caLoc.name}` },
  }
}

async function main() {
  const rl = readline.createInterface({ input, output })

  // Prompting needs a real terminal: readline/promises rejects every question
  // once a non-TTY stdin reaches EOF. Without one, fall back to the default or
  // name the flag that is missing, rather than dying with "readline was closed".
  const interactive = Boolean(input.isTTY)

  /** Flag value if supplied, otherwise prompt (or fall back when non-interactive). */
  const ask = async (flagName: string, q: string, fallback = '') => {
    const f = flag(flagName)
    if (f !== undefined) return f || fallback
    if (!interactive) return fallback
    const a = (await rl.question(fallback ? `${q} [${fallback}] ` : `${q} `)).trim()
    return a || fallback
  }
  const askNumber = async (flagName: string, q: string): Promise<number> => {
    const f = flag(flagName)
    if (f !== undefined) {
      const n = Number(f.replace(/[, ]/g, ''))
      if (!Number.isFinite(n) || n < 0) throw new Error(`--${flagName} must be a number >= 0`)
      return n
    }
    if (!interactive) {
      throw new Error(`No terminal to prompt on — pass --${flagName}=<number>`)
    }
    for (;;) {
      const raw = (await rl.question(`${q} `)).trim().replace(/[, ]/g, '')
      const n = Number(raw)
      if (Number.isFinite(n) && n >= 0) return n
      console.log('  Enter a number (digits only).')
    }
  }
  /** 1-5 strength rating, blank to leave the bar off the page entirely. */
  const askRating = async (flagName: string, q: string): Promise<number | undefined> => {
    const f = flag(flagName)
    if (f !== undefined) {
      if (!f) return undefined
      const n = Number(f)
      if (!Number.isInteger(n) || n < 1 || n > 5) throw new Error(`--${flagName} must be 1-5`)
      return n
    }
    if (!interactive) return undefined
    for (;;) {
      const raw = (await rl.question(`${q} `)).trim()
      if (!raw) return undefined
      const n = Number(raw)
      if (Number.isInteger(n) && n >= 1 && n <= 5) return n
      console.log('  Enter 1 to 5, or leave blank to skip.')
    }
  }

  /** Hex colour with validation and re-prompt, blank to fall back to the house gold. */
  const askColor = async (flagName: string, q: string): Promise<string | undefined> => {
    const f = flag(flagName)
    if (f !== undefined) {
      if (!f) return undefined
      const hex = normaliseHex(f)
      if (!hex) throw new Error(`--${flagName} must be a hex colour like #E4B250`)
      return hex
    }
    if (!interactive) return undefined
    for (;;) {
      const raw = (await rl.question(`${q} `)).trim()
      if (!raw) return undefined
      const hex = normaliseHex(raw)
      if (hex) return hex
      console.log('  Enter a hex colour, eg. #E4B250 (or blank to skip).')
    }
  }

  const askYesNo = async (q: string, dflt = false): Promise<boolean> => {
    if (ASSUME_YES) return true
    if (!interactive) return dflt
    const a = (await rl.question(`${q} ${dflt ? '[Y/n]' : '[y/N]'} `)).trim().toLowerCase()
    if (!a) return dflt
    return a === 'y' || a === 'yes'
  }

  try {
    console.log(`\nNew product  ·  ${MEDUSA_BACKEND_URL}${DRY ? '  (dry run)' : ''}\n`)

    const markets = await resolveMarkets()
    console.log(`  Nigeria: ${markets.ng.label}`)
    console.log(`  Canada : ${markets.ca.label}\n`)

    // --- Identity -----------------------------------------------------------
    const title = await ask('title', 'Product name:')
    if (!title) throw new Error('A product name is required.')

    let handle = slugify(await ask('handle', 'URL handle:', slugify(title)))
    for (;;) {
      const clash = (await get(`/admin/products?handle=${handle}&limit=1&fields=id,title`)).products?.[0]
      if (!clash) break
      console.log(`  "${handle}" already exists ("${clash.title}"). Pick another.`)
      handle = slugify(await ask('handle-retry', 'URL handle:'))
    }

    // --- Category -----------------------------------------------------------
    const { product_categories } = await get(
      '/admin/product-categories?limit=100&fields=id,name,handle'
    )
    console.log('\nCategories:')
    product_categories.forEach((c: any, i: number) =>
      console.log(`  ${String(i + 1).padStart(2)}. ${c.name}  (${c.handle})`)
    )
    let category: any = null
    const catFlag = flag('category')
    if (catFlag !== undefined) {
      // Flag takes a category HANDLE, which is stable, rather than a menu index.
      category = product_categories.find((c: any) => c.handle === catFlag) ?? null
      if (catFlag && !category) throw new Error(`No category with handle "${catFlag}"`)
    } else {
      for (;;) {
        const pick = await ask('category-pick', '\nCategory number (blank for none):')
        if (!pick) break
        category = product_categories[Number(pick) - 1]
        if (category) break
        console.log('  Not a valid number.')
      }
    }

    // --- Variant, prices, stock --------------------------------------------
    const size = await ask('size', '\nVariant label (eg. 100ml EDP):', '100ml EDP')

    console.log('\nPrices. Enter the amount a customer pays, in whole units:')
    console.log('  (Medusa v2 stores MAJOR units — 50000 means N50,000; 65 means CA$65)')
    const ngn = await askNumber('ngn', '  Nigeria price (NGN):')
    const cad = await askNumber('cad', '  Canada price  (CAD):')

    console.log('\nOpening stock:')
    const ngQty = await askNumber('ng-qty', `  Units at ${markets.ng.label.split(' / ')[1]}:`)
    const caQty = await askNumber('ca-qty', `  Units at ${markets.ca.label.split(' / ')[1]}:`)

    const description = await ask('description', '\nDescription (optional):')
    const thumbnail = await ask('image', 'Image URL (optional, blank to add in admin later):')

    // --- The product page ---------------------------------------------------
    // These become Medusa metadata under the exact keys the storefront reads.
    // Asked in plain language because the person running this should not have
    // to know that "descriptor" is a metadata key or that notes are stored as
    // one comma-separated string per tier.
    const skipFragrance = process.argv.includes('--no-fragrance')
    const metadata: Record<string, string> = {}

    if (!skipFragrance) {
      console.log('\nProduct page details.')
      console.log('  Leave any of these blank to skip it.\n')

      // The descriptor is the line under the product name on the PDP and the
      // subtitle on the share card, so an empty one is the most visible gap of
      // the lot. Worth its own nudge below in the review.
      const descriptor = await ask('descriptor', '  One-word character (eg. Citrus, Woody):')
      const scentFamily = await ask('scent-family', '  Scent family (eg. Citrus, Oriental):', descriptor)
      const tagline = await ask('tagline', '  Tagline (one short sentence):')

      console.log('\n  Fragrance notes. Separate each note with a comma.')
      const topNotes = await ask('top-notes', '    Top notes    (first impression):')
      const heartNotes = await ask('heart-notes', '    Heart notes  (the character):')
      const baseNotes = await ask('base-notes', '    Base notes   (what lingers):')

      console.log('\n  Signature colour, used behind the bottle and on the share card.')
      const color = await askColor('color', '    Hex colour (eg. #E4B250):')
      const colorName = await ask('color-name', '    Colour name (eg. Amber):')

      console.log('\n  Strength bars, 1 to 5. Blank leaves the bar off the page.')
      const longevity = await askRating('longevity', '    Longevity (how long it lasts):')
      const sillage = await askRating('sillage', '    Sillage (how far it carries):')

      // Series number. The Number Series resolves this from a "no-N" handle,
      // but oils use "oil-no-N", which does not match, so those need it set
      // explicitly or the product resolves to no number and is dropped from
      // listings entirely.
      const seriesNumber = await ask('number', '\n  Series number (blank if not a numbered product):')

      const put = (key: string, value: string | number | undefined) => {
        if (value === undefined || value === '') return
        metadata[key] = String(value)
      }
      put('descriptor', descriptor)
      put('scent_family', scentFamily)
      put('tagline', tagline)
      put('top_notes', normaliseNotes(topNotes))
      put('heart_notes', normaliseNotes(heartNotes))
      put('base_notes', normaliseNotes(baseNotes))
      put('signature_color', color)
      put('signature_color_name', colorName)
      put('longevity', longevity)
      put('sillage', sillage)
      put('number', seriesNumber)
    }

    // --- Confirm ------------------------------------------------------------
    console.log('\n────────────────────────────────────────')
    console.log(`  ${title}`)
    console.log(`  handle    ${handle}`)
    console.log(`  category  ${category ? category.name : '(none)'}`)
    console.log(`  variant   ${size}`)
    console.log(`  price     N${ngn.toLocaleString()}  ·  CA$${cad.toLocaleString()}`)
    console.log(`  stock     ${ngQty} Nigeria  ·  ${caQty} Canada`)
    console.log(`  image     ${thumbnail || '(none)'}`)
    console.log(`  status    draft  (published only after you confirm below)`)

    if (Object.keys(metadata).length > 0) {
      console.log('\n  Product page')
      const show = (label: string, value?: string) => {
        if (value) console.log(`  ${label.padEnd(9)} ${value}`)
      }
      show('character', metadata.descriptor)
      show('family', metadata.scent_family)
      show('tagline', metadata.tagline)
      show('top', metadata.top_notes)
      show('heart', metadata.heart_notes)
      show('base', metadata.base_notes)
      show(
        'colour',
        metadata.signature_color &&
          `${metadata.signature_color}${metadata.signature_color_name ? ` (${metadata.signature_color_name})` : ''}`
      )
      show('longevity', metadata.longevity && `${metadata.longevity}/5`)
      show('sillage', metadata.sillage && `${metadata.sillage}/5`)
      show('number', metadata.number)
    }

    // Say plainly what a shopper will not see, while it is still cheap to fix.
    const gaps: string[] = []
    if (!metadata.descriptor) gaps.push('no character word — the line under the product name will be empty')
    if (!metadata.top_notes && !metadata.heart_notes && !metadata.base_notes) {
      gaps.push('no fragrance notes — the notes pyramid will not appear')
    }
    if (!metadata.signature_color) gaps.push('no signature colour — falls back to the house gold')
    if (!thumbnail) gaps.push('no image — the tile and share card will show a placeholder')
    if (gaps.length) {
      console.log('\n  Missing')
      gaps.forEach((g) => console.log(`  · ${g}`))
      console.log('  All of these can be added in the admin later.')
    }
    console.log('────────────────────────────────────────')

    if (!(await askYesNo('\nCreate it?', true))) {
      console.log('Cancelled. Nothing was written.')
      return
    }
    if (DRY) {
      console.log('\nDry run — nothing written.')
      return
    }

    // --- Create -------------------------------------------------------------
    // Draft on purpose: a product is not fit to be seen until it has stock and
    // a price, and publishing is the last step below.
    console.log('\nCreating (draft)…')
    await post('/admin/products', {
      title,
      handle,
      description: description || undefined,
      status: 'draft',
      thumbnail: thumbnail || undefined,
      // Everything the PDP reads beyond title and price. Omitted entirely when
      // empty rather than written as blank strings, so a missing value stays
      // missing instead of rendering as an empty line.
      metadata: Object.keys(metadata).length ? metadata : undefined,
      categories: category ? [{ id: category.id }] : undefined,
      sales_channels: [{ id: markets.ng.channelId }, { id: markets.ca.channelId }],
      options: [{ title: 'Size', values: [size] }],
      variants: [
        {
          title: size,
          manage_inventory: true,
          // Currency-level prices only. A region-scoped price would override
          // these and become a second place to keep in sync.
          prices: [
            { amount: ngn, currency_code: 'ngn' },
            { amount: cad, currency_code: 'cad' },
          ],
          options: { Size: size },
        },
      ],
    })

    // Medusa creates the inventory item alongside the variant; give it a moment.
    let inventoryItemId: string | undefined
    for (let i = 0; i < 8 && !inventoryItemId; i++) {
      const p = (
        await get(`/admin/products?handle=${handle}&limit=1&fields=id,*variants.inventory_items`)
      ).products?.[0]
      inventoryItemId = p?.variants?.[0]?.inventory_items?.[0]?.inventory_item_id
      if (!inventoryItemId) await new Promise((r) => setTimeout(r, 500))
    }
    if (!inventoryItemId) {
      throw new Error(
        'Product created, but no inventory item appeared. Set stock in the admin, then publish.'
      )
    }

    console.log('Stocking…')
    for (const [m, qty] of [
      [markets.ng, ngQty],
      [markets.ca, caQty],
    ] as const) {
      await post(`/admin/inventory-items/${inventoryItemId}/location-levels`, {
        location_id: m.locationId,
        stocked_quantity: qty,
      })
    }

    // --- Verify through the PUBLIC api before publishing --------------------
    // Writing succeeded is not the same as a customer being able to buy it, so
    // check what the storefront will actually see.
    console.log('Verifying what the storefront will see…')
    const created = (await get(`/admin/products?handle=${handle}&limit=1&fields=id`)).products?.[0]
    const checks = await verifyStorefront(handle, metadata)
    for (const c of checks) console.log(`  ${c.ok ? 'ok  ' : 'WARN'} ${c.label}`)

    const allOk = checks.every((c) => c.ok)
    if (!allOk) {
      console.log(
        '\nLeft as a DRAFT because something above is not right.\n' +
          'Fix it in the admin, then publish there.'
      )
      console.log(`\nProduct id: ${created?.id}`)
      return
    }

    // --- Publish ------------------------------------------------------------
    const shouldPublish = PUBLISH_FLAG || (ASSUME_YES ? false : await askYesNo('\nEverything checks out. Publish it now?', true))
    if (shouldPublish) {
      await post(`/admin/products/${created.id}`, { status: 'published' })
      console.log('Published.')
      console.log(
        '\nThe storefront caches the catalogue for up to 2 minutes.\n' +
          'Run `npm run refresh-storefront` to show it immediately.'
      )
    } else {
      console.log('Left as a draft. Publish from the admin when you are ready.')
    }
    console.log(`\nProduct id: ${created.id}`)
  } finally {
    rl.close()
  }
}

/**
 * Read the product back through the STORE api — the same call the storefront
 * makes — so we confirm a customer would see a price and available stock,
 * rather than trusting that the writes returned 200.
 */
async function verifyStorefront(handle: string, expectedMetadata: Record<string, string> = {}) {
  const fields =
    '+metadata,+variants.inventory_quantity,+variants.manage_inventory,+variants.allow_backorder'
  const markets = [
    {
      id: 'Nigeria',
      key: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
      region: process.env.NEXT_PUBLIC_MEDUSA_REGION_ID,
    },
    {
      id: 'Canada',
      key:
        process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY_CA ??
        process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
      region: process.env.NEXT_PUBLIC_MEDUSA_REGION_ID_CA,
    },
  ]

  const out: { ok: boolean; label: string }[] = []
  for (const m of markets) {
    if (!m.key || !m.region) {
      out.push({ ok: false, label: `${m.id}: publishable key or region id missing from .env.local` })
      continue
    }
    // A draft product is not returned by the store API, so ask the admin API for
    // the same numbers the storefront resolves from.
    const p = (
      await get(
        `/admin/products?handle=${handle}&limit=1&region_id=${m.region}&fields=id,*variants.prices,*variants.inventory_items`
      )
    ).products?.[0]
    const v = p?.variants?.[0]
    const currency = m.id === 'Nigeria' ? 'ngn' : 'cad'
    const price = v?.prices?.find((x: any) => x.currency_code === currency)
    out.push({
      ok: Boolean(price && price.amount > 0),
      label: `${m.id}: price ${price ? `${price.amount} ${currency}` : 'MISSING'}`,
    })
  }

  // Stock, straight from the inventory levels.
  const p = (
    await get(`/admin/products?handle=${handle}&limit=1&fields=id,*variants.inventory_items`)
  ).products?.[0]
  const iid = p?.variants?.[0]?.inventory_items?.[0]?.inventory_item_id
  if (iid) {
    const { inventory_levels } = await get(`/admin/inventory-items/${iid}/location-levels`)
    const total = (inventory_levels ?? []).reduce(
      (s: number, l: any) => s + (l.stocked_quantity ?? 0),
      0
    )
    out.push({
      ok: (inventory_levels ?? []).length > 0 && total > 0,
      label: `stock: ${(inventory_levels ?? []).length} location(s), ${total} unit(s) total`,
    })
  } else {
    out.push({ ok: false, label: 'stock: no inventory item' })
  }

  // Read the product page details back. Only the keys that were actually
  // entered are checked: a product with no notes is a choice, but notes that
  // were typed and did not save is a silent data loss the operator would only
  // discover on the live page.
  const expectedKeys = Object.keys(expectedMetadata)
  if (expectedKeys.length) {
    const withMeta = (
      await get(`/admin/products?handle=${handle}&limit=1&fields=id,metadata`)
    ).products?.[0]
    const saved = (withMeta?.metadata ?? {}) as Record<string, unknown>
    const missing = expectedKeys.filter((k) => String(saved[k] ?? '') !== expectedMetadata[k])
    out.push({
      ok: missing.length === 0,
      label:
        missing.length === 0
          ? `page details: ${expectedKeys.length} field(s) saved`
          : `page details: did NOT save ${missing.join(', ')}`,
    })
  }

  return out
}

main().catch((err) => {
  console.error('\nfailed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
