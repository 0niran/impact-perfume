#!/usr/bin/env tsx
/**
 * Dump every Medusa product variant's pricing to data/prices.csv so the owner
 * can edit CAD prices and re-import.
 *
 * Columns:
 *   handle, title, variant_id, variant_title, ngn_amount_minor, cad_amount_minor
 *
 * Amounts are in the smallest currency unit (kobo / cents). To get NGN naira
 * divide by 100; same for CAD dollars.
 *
 * Re-running overwrites the CSV — version-control it if you want history.
 */

import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import fs from 'fs'

const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'
const MEDUSA_ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL || ''
const MEDUSA_ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || ''

let _token: string | null = null
async function getToken(): Promise<string> {
  if (_token) return _token
  const res = await fetch(`${MEDUSA_BACKEND_URL}/auth/user/emailpass`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: MEDUSA_ADMIN_EMAIL, password: MEDUSA_ADMIN_PASSWORD }),
  })
  if (!res.ok) throw new Error(`Auth failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  _token = data.token as string
  return _token
}

async function admin(p: string) {
  const token = await getToken()
  const res = await fetch(`${MEDUSA_BACKEND_URL}${p}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await res.json()
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(body)}`)
  return body
}

interface Price { amount: number; currency_code: string }
interface Variant { id: string; title: string; prices?: Price[] }
interface Product { id: string; handle: string; title: string; variants?: Variant[] }

function csvEscape(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

async function main() {
  console.log('Exporting Medusa prices to data/prices.csv …\n')

  const all: Product[] = []
  let offset = 0
  // Paginate through products
  while (true) {
    const data = await admin(`/admin/products?limit=100&offset=${offset}&fields=handle,title,*variants,*variants.prices`)
    const products = (data.products ?? []) as Product[]
    all.push(...products)
    if (products.length < 100) break
    offset += 100
  }

  console.log(`Fetched ${all.length} products`)

  // Sort: number series first by number, then oils by number, then signature, then others
  function sortKey(p: Product): [number, number, string] {
    const m = p.handle.match(/^no-(\d+)$/)
    if (m) return [0, parseInt(m[1], 10), p.handle]
    const o = p.handle.match(/^oil-no-(\d+)$/)
    if (o) return [1, parseInt(o[1], 10), p.handle]
    if (p.handle.startsWith('signature') || p.handle === 'royale') return [2, 0, p.handle]
    return [3, 0, p.handle]
  }
  all.sort((a, b) => {
    const [ag, an, ah] = sortKey(a)
    const [bg, bn, bh] = sortKey(b)
    if (ag !== bg) return ag - bg
    if (an !== bn) return an - bn
    return ah.localeCompare(bh)
  })

  const rows: string[] = [
    'handle,title,variant_id,variant_title,ngn_amount_minor,cad_amount_minor',
  ]
  let total = 0
  for (const p of all) {
    for (const v of p.variants ?? []) {
      const ngn = (v.prices ?? []).find((pr) => pr.currency_code === 'ngn')?.amount ?? ''
      const cad = (v.prices ?? []).find((pr) => pr.currency_code === 'cad')?.amount ?? ''
      rows.push(
        [
          csvEscape(p.handle),
          csvEscape(p.title),
          csvEscape(v.id),
          csvEscape(v.title ?? ''),
          ngn,
          cad,
        ].join(',')
      )
      total++
    }
  }

  const outPath = path.join(process.cwd(), 'data', 'prices.csv')
  fs.writeFileSync(outPath, rows.join('\n') + '\n', 'utf-8')

  console.log(`Wrote ${total} variants to ${outPath}`)
  console.log('\nNext:')
  console.log('  1. Open data/prices.csv in Excel / Numbers / Google Sheets.')
  console.log('  2. Edit the cad_amount_minor column. Values are in CENTS:')
  console.log('     CAD $65 → 6500. CAD $32.50 → 3250.')
  console.log('  3. Save as CSV.')
  console.log('  4. Run: npm run import-cad-prices')
}

main().catch((err) => {
  console.error('Export failed:', err)
  process.exit(1)
})
