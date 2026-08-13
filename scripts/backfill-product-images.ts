/**
 * Backfill product images onto Cloudflare R2.
 *
 * For every product that has a source image file bundled in the storefront's
 * public/images, this uploads that file to Medusa (which now stores to R2) and
 * points the product's thumbnail + images at the durable R2 URL. It updates
 * products in place, so prices, variants, inventory, and every other field are
 * left untouched.
 *
 * Products with no source image (the numbered no-X / oil-no-X lines) are skipped
 * and reported, since a script cannot invent photography for them.
 *
 * Dry run by default. Set APPLY=1 to write.
 *   npx tsx scripts/backfill-product-images.ts          # preview
 *   APPLY=1 npx tsx scripts/backfill-product-images.ts  # apply
 */
import { config as loadEnv } from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'

loadEnv({ path: '.env.local' })
loadEnv() // fall back to .env for anything not in .env.local

const BASE =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  'https://impact-perfumes-medusa-production.up.railway.app'
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD
const APPLY = process.env.APPLY === '1'
const IMAGES_DIR = path.join(process.cwd(), 'public', 'images')

// Signature line: these live in getProductImage's LOCAL_PRODUCT_IMAGES map and
// currently carry broken localhost/static thumbnails.
const SIGNATURE: Record<string, string> = {
  enigma: 'Enigma.png',
  'oud-osmosis-unlimited': 'OUD Osmosis Unlimited.png',
  'royale-silver': 'Royale_Product.png',
  'solid-oud': 'Solid Oud.png',
  mystikal: 'Mystikal.jpg',
  prestige: 'prestige.png',
}

// Discovery sets. Signature set is a confident match; the two "no series" sets
// are a best guess against fields that are currently empty, flagged in output.
const DISCOVERY: Record<string, { file: string; guessed: boolean }> = {
  'signature-discovery-set': { file: 'Signature Discovery Set 2.png', guessed: false },
  'number-discovery-set': { file: 'No Series Discovery Set.jpeg', guessed: true },
  'discovery-set': { file: 'No Series Discovery Set.jpeg', guessed: true },
}

function mimeFor(file: string): string {
  const ext = path.extname(file).toLowerCase()
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.webp') return 'image/webp'
  return 'image/png'
}

async function getToken(): Promise<string> {
  if (!EMAIL || !PASSWORD) {
    throw new Error('MEDUSA_ADMIN_EMAIL / MEDUSA_ADMIN_PASSWORD missing from .env.local')
  }
  const res = await fetch(`${BASE}/auth/user/emailpass`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  const data: any = await res.json()
  if (!data.token) throw new Error(`Auth failed: ${JSON.stringify(data)}`)
  return data.token
}

async function fetchProducts(token: string): Promise<any[]> {
  const res = await fetch(
    `${BASE}/admin/products?limit=500&fields=id,handle,title,status,thumbnail`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const data: any = await res.json()
  return data.products || []
}

const uploadCache = new Map<string, string>()

async function uploadFile(token: string, file: string): Promise<string> {
  if (uploadCache.has(file)) return uploadCache.get(file)!
  const abs = path.join(IMAGES_DIR, file)
  const buf = fs.readFileSync(abs)
  const form = new FormData()
  form.append('files', new Blob([buf], { type: mimeFor(file) }), file)
  const res = await fetch(`${BASE}/admin/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  if (!res.ok) throw new Error(`upload ${file} failed: HTTP ${res.status} ${await res.text()}`)
  const data: any = await res.json()
  const url = data.files?.[0]?.url
  if (!url) throw new Error(`upload ${file} returned no url: ${JSON.stringify(data)}`)
  uploadCache.set(file, url)
  return url
}

async function setImage(token: string, id: string, url: string): Promise<void> {
  const res = await fetch(`${BASE}/admin/products/${id}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ thumbnail: url, images: [{ url }] }),
  })
  if (!res.ok) throw new Error(`update ${id} failed: HTTP ${res.status} ${await res.text()}`)
}

type Task = { handle: string; id: string; file: string; guessed: boolean; current: string | null }

function resolveFile(p: any): { file: string; guessed: boolean } | null {
  const handle: string = p.handle || ''
  if (SIGNATURE[handle]) return { file: SIGNATURE[handle], guessed: false }
  if (DISCOVERY[handle]) return DISCOVERY[handle]
  const thumb: string = p.thumbnail || ''
  if (thumb.startsWith('/images/')) {
    return { file: decodeURIComponent(thumb.slice('/images/'.length)), guessed: false }
  }
  return null
}

async function main() {
  console.log(`Backend: ${BASE}`)
  console.log(`Mode:    ${APPLY ? 'APPLY (writing)' : 'DRY RUN (no writes)'}\n`)
  const token = await getToken()
  const products = await fetchProducts(token)
  console.log(`Fetched ${products.length} products\n`)

  const tasks: Task[] = []
  const alreadyR2: string[] = []
  const noImage: string[] = []
  const missingFile: string[] = []

  for (const p of products) {
    const handle: string = p.handle || '(no handle)'
    const thumb: string = p.thumbnail || ''
    if (thumb.includes('r2.dev') || thumb.includes('r2.cloudflarestorage')) {
      alreadyR2.push(handle)
      continue
    }
    const resolved = resolveFile(p)
    if (!resolved) {
      noImage.push(handle)
      continue
    }
    if (!fs.existsSync(path.join(IMAGES_DIR, resolved.file))) {
      missingFile.push(`${handle} -> ${resolved.file}`)
      continue
    }
    tasks.push({ handle, id: p.id, file: resolved.file, guessed: resolved.guessed, current: p.thumbnail })
  }

  console.log('=== PLAN: products to backfill ===')
  for (const t of tasks) {
    console.log(`  ${t.handle.padEnd(26)} <- ${t.file}${t.guessed ? '   [GUESSED - verify]' : ''}`)
  }
  console.log(`\n  ${tasks.length} to update, ${alreadyR2.length} already on R2, ` +
    `${noImage.length} have no source image, ${missingFile.length} missing file`)
  if (missingFile.length) {
    console.log('\n  Missing source files (skipped):')
    for (const m of missingFile) console.log(`    ${m}`)
  }
  if (noImage.length) {
    console.log(`\n  No source image, need owner photography (skipped): ${noImage.length} products`)
    console.log('    e.g. ' + noImage.slice(0, 6).join(', ') + (noImage.length > 6 ? ' ...' : ''))
  }

  if (!APPLY) {
    console.log('\nDry run only. Re-run with APPLY=1 to write.')
    return
  }

  console.log('\n=== APPLYING ===')
  const audit: string[] = []
  let ok = 0
  for (const t of tasks) {
    try {
      const url = await uploadFile(token, t.file)
      await setImage(token, t.id, url)
      console.log(`  OK  ${t.handle.padEnd(26)} -> ${url}`)
      audit.push(`${t.handle}\t${t.file}\t${url}`)
      ok++
    } catch (e: any) {
      console.log(`  ERR ${t.handle}: ${e.message}`)
      audit.push(`${t.handle}\t${t.file}\tERROR ${e.message}`)
    }
  }
  const auditPath = path.join(process.env.SCRATCHPAD || '/tmp', 'r2-backfill-audit.tsv')
  try {
    fs.writeFileSync(auditPath, audit.join('\n') + '\n')
    console.log(`\nDone. ${ok}/${tasks.length} updated. Audit: ${auditPath}`)
  } catch {
    console.log(`\nDone. ${ok}/${tasks.length} updated.`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
