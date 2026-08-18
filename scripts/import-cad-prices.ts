#!/usr/bin/env tsx
/**
 * Read data/prices.csv and push the cad_amount_minor column to Medusa.
 *
 * Only the CAD price is updated. NGN prices are preserved as-is. Empty
 * cad_amount_minor cells are skipped (no change to that variant).
 *
 * Re-runnable. Will overwrite the existing CAD price on each variant with
 * the value in the CSV.
 *
 * Run after editing the CSV produced by `npm run export-prices`.
 */

import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
import { adminAuthHeader } from './lib/medusaAdmin'

import fs from 'fs'

const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'
const MEDUSA_ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL || ''
const MEDUSA_ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || ''

let _token: string | null = null
async function getToken(): Promise<string> {
  return adminAuthHeader()
}

async function admin(p: string, options: RequestInit = {}) {
  const token = await getToken()
  const res = await fetch(`${MEDUSA_BACKEND_URL}${p}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: adminAuthHeader(),
      ...(options.headers ?? {}),
    },
  })
  const body = await res.json()
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(body)}`)
  return body
}

interface VariantPayload { variantId: string; productId: string; ngn: number; cad: number; handle: string }

// Naive CSV parser tolerant of quoted fields with embedded commas.
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++ } else { inQuotes = false }
      } else {
        cell += ch
      }
    } else {
      if (ch === '"') { inQuotes = true }
      else if (ch === ',') { row.push(cell); cell = '' }
      else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = '' }
      else if (ch === '\r') { /* ignore */ }
      else { cell += ch }
    }
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row) }
  return rows.filter((r) => r.some((c) => c.length > 0))
}

async function findVariantsForProduct(productId: string) {
  const data = await admin(`/admin/products/${productId}?fields=*variants,*variants.prices`)
  return data.product?.variants ?? []
}

async function setCadPrice(productId: string, variantId: string, cadAmount: number) {
  const variants = await findVariantsForProduct(productId)
  const v = variants.find((x: { id: string }) => x.id === variantId)
  if (!v) throw new Error(`variant ${variantId} not on product ${productId}`)
  const otherPrices = (v.prices ?? [])
    .filter((p: { currency_code: string }) => p.currency_code !== 'cad')
    .map((p: { amount: number; currency_code: string }) => ({ amount: p.amount, currency_code: p.currency_code }))
  const newPrices = [...otherPrices, { amount: cadAmount, currency_code: 'cad' }]
  await admin(`/admin/products/${productId}/variants/${variantId}`, {
    method: 'POST',
    body: JSON.stringify({ prices: newPrices }),
  })
}

async function main() {
  const csvPath = path.join(process.cwd(), 'data', 'prices.csv')
  if (!fs.existsSync(csvPath)) {
    console.error(`File not found: ${csvPath}`)
    console.error('Run `npm run export-prices` first.')
    process.exit(1)
  }

  const raw = fs.readFileSync(csvPath, 'utf-8')
  const rows = parseCsv(raw)
  if (rows.length < 2) {
    console.error('CSV has no data rows.')
    process.exit(1)
  }

  const header = rows[0].map((h) => h.trim())
  const ix = {
    handle: header.indexOf('handle'),
    variantId: header.indexOf('variant_id'),
    productId: -1, // discovered per row via admin if needed
    ngn: header.indexOf('ngn_amount_minor'),
    cad: header.indexOf('cad_amount_minor'),
  }
  if (ix.handle < 0 || ix.variantId < 0 || ix.cad < 0) {
    console.error('CSV missing required columns: handle, variant_id, cad_amount_minor')
    process.exit(1)
  }

  // Need product_id to call the variant endpoint — fetch products to build the map
  console.log('Loading product → variant map…')
  const map = new Map<string, string>() // variantId -> productId
  let offset = 0
  while (true) {
    const data = await admin(`/admin/products?limit=100&offset=${offset}&fields=*variants`)
    const products = data.products ?? []
    for (const p of products) {
      for (const v of (p.variants ?? [])) {
        map.set(v.id, p.id)
      }
    }
    if (products.length < 100) break
    offset += 100
  }
  console.log(`  ${map.size} variants known\n`)

  const targets: VariantPayload[] = []
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    const cad = (row[ix.cad] ?? '').trim()
    if (!cad) continue
    const cadAmount = parseInt(cad, 10)
    if (isNaN(cadAmount) || cadAmount < 0) {
      console.warn(`  Row ${r + 1}: invalid CAD value "${cad}", skipping`)
      continue
    }
    const variantId = row[ix.variantId].trim()
    const productId = map.get(variantId)
    if (!productId) {
      console.warn(`  Row ${r + 1}: unknown variant ${variantId}, skipping`)
      continue
    }
    targets.push({
      productId,
      variantId,
      handle: row[ix.handle].trim(),
      ngn: parseInt(row[ix.ngn] || '0', 10),
      cad: cadAmount,
    })
  }

  console.log(`Updating ${targets.length} CAD prices…`)
  let updated = 0
  let failed = 0
  for (const t of targets) {
    try {
      // CSV is MINOR units (cents); Medusa v2 expects MAJOR units (dollars).
      const cadMajor = Math.round(t.cad / 100)
      await setCadPrice(t.productId, t.variantId, cadMajor)
      process.stdout.write('.')
      updated++
    } catch (err) {
      process.stdout.write('x')
      console.error(`\n  ${t.handle} (${t.variantId}) failed: ${err instanceof Error ? err.message : err}`)
      failed++
    }
  }
  console.log(`\n\nDone. Updated ${updated}, failed ${failed}.`)
}

main().catch((err) => {
  console.error('\nImport failed:', err)
  process.exit(1)
})
