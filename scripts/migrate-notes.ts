#!/usr/bin/env tsx
/**
 * Pushes fragrance notes (top, heart, base) + all enrichment metadata
 * from data/products.seed.json into Medusa product metadata.
 * Safe to re-run — merges into existing metadata without overwriting other fields.
 */

import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import fs from 'fs'

const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'
const MEDUSA_ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL || ''
const MEDUSA_ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || ''

interface SeedProduct {
  number: number
  handle: string
  title: string
  descriptor: string
  scentFamily: string
  signatureColor: string
  signatureColorName: string
  tagline: string
  topNotes: string[]
  heartNotes: string[]
  baseNotes: string[]
  volume: string
  concentration: string
}

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
  _token = data.token
  return _token as string
}

async function adminRequest(path: string, options: RequestInit = {}) {
  const token = await getToken()
  const res = await fetch(`${MEDUSA_BACKEND_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  })
  const body = await res.json()
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(body)}`)
  return body
}

async function findProductByHandle(handle: string): Promise<{ id: string; metadata: Record<string, unknown> } | null> {
  try {
    const data = await adminRequest(`/admin/products?handle=${handle}&limit=1`)
    if (!data.products?.length) return null
    return { id: data.products[0].id, metadata: data.products[0].metadata ?? {} }
  } catch {
    return null
  }
}

async function updateProductMetadata(productId: string, metadata: Record<string, string>) {
  await adminRequest(`/admin/products/${productId}`, {
    method: 'POST',
    body: JSON.stringify({ metadata }),
  })
}

async function main() {
  console.log('Impact Perfumes — Notes Migration')
  console.log('===================================\n')
  console.log(`Backend: ${MEDUSA_BACKEND_URL}\n`)

  const dataPath = path.join(process.cwd(), 'data', 'products.seed.json')
  const raw = fs.readFileSync(dataPath, 'utf-8')
  const { products }: { products: SeedProduct[] } = JSON.parse(raw)

  console.log(`Found ${products.length} products in seed file.\n`)

  let updated = 0
  let notFound = 0
  let failed = 0

  for (const p of products) {
    process.stdout.write(`  No. ${String(p.number).padStart(2, '0')} ${p.handle.padEnd(12)} — `)

    const existing = await findProductByHandle(p.handle)
    if (!existing) {
      console.log('NOT FOUND in Medusa — skipping')
      notFound++
      continue
    }

    const metadata: Record<string, string> = {
      // Merge enrichment fields — won't overwrite fields not listed here
      descriptor: p.descriptor,
      tagline: p.tagline,
      scent_family: p.scentFamily,
      signature_color: p.signatureColor,
      signature_color_name: p.signatureColorName,
      number: String(p.number),
      // Notes — the key fields
      top_notes: p.topNotes.join(', '),
      heart_notes: p.heartNotes.join(', '),
      base_notes: p.baseNotes.join(', '),
    }

    // Remove empty note fields rather than pushing empty strings
    if (!p.topNotes.length) delete metadata.top_notes
    if (!p.heartNotes.length) delete metadata.heart_notes
    if (!p.baseNotes.length) delete metadata.base_notes

    try {
      await updateProductMetadata(existing.id, metadata)
      console.log(`✓ updated (top: ${p.topNotes.length}, heart: ${p.heartNotes.length}, base: ${p.baseNotes.length} notes)`)
      updated++
    } catch (err) {
      console.log(`✗ FAILED — ${err}`)
      failed++
    }

    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 150))
  }

  console.log(`\n${'─'.repeat(40)}`)
  console.log(`  Updated:   ${updated}`)
  console.log(`  Not found: ${notFound}`)
  console.log(`  Failed:    ${failed}`)
  console.log(`${'─'.repeat(40)}`)

  if (notFound > 0) {
    console.log(`\n  ${notFound} product(s) not found in Medusa.`)
    console.log('  Run the main seed script first to create them.')
  }

  console.log('\nDone. Fragrance notes are now live in Medusa.')
}

main().catch((err) => {
  console.error('\nMigration failed:', err.message)
  process.exit(1)
})
