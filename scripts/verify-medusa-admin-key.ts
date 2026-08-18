#!/usr/bin/env tsx
/**
 * Verifies that MEDUSA_ADMIN_API_KEY authenticates against the Medusa Admin API.
 *
 * Run this right after creating a secret API key in the Medusa admin and adding
 * it to .env.local, BEFORE setting it in Vercel. It confirms the key works and
 * that the app's header format (HTTP Basic, key as username with empty
 * password) is the one this Medusa instance accepts. For safety it also probes
 * the un-encoded form and reports which succeeds.
 *
 *   npx tsx scripts/verify-medusa-admin-key.ts
 *
 * It only reads; it makes a single harmless GET /admin/products?limit=1. The key value
 * is never printed.
 */

import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const BACKEND = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
const KEY = process.env.MEDUSA_ADMIN_API_KEY

if (!BACKEND) {
  console.error('Missing NEXT_PUBLIC_MEDUSA_BACKEND_URL in .env.local')
  process.exit(1)
}
if (!KEY) {
  console.error('Missing MEDUSA_ADMIN_API_KEY in .env.local — create a secret API key in the Medusa admin first.')
  process.exit(1)
}

// This is exactly what src/lib/medusaAdmin.ts sends.
const encoded = `Basic ${Buffer.from(`${KEY}:`).toString('base64')}`
// The alternate form Medusa also documents (raw token, no base64).
const raw = `Basic ${KEY}`

async function probe(label: string, authHeader: string): Promise<boolean> {
  try {
    // Use a real admin data endpoint, not /admin/users/me: a secret API key is
    // not a user, so the "me" route 404s even for a valid key.
    const res = await fetch(`${BACKEND}/admin/products?limit=1&fields=id`, {
      headers: { Authorization: authHeader },
    })
    const ok = res.ok
    console.log(`  ${ok ? 'PASS' : 'fail'}  ${label.padEnd(28)} -> ${res.status} ${res.statusText}`)
    return ok
  } catch (err) {
    console.log(`  fail  ${label.padEnd(28)} -> threw ${err instanceof Error ? err.message : err}`)
    return false
  }
}

async function main() {
  console.log(`Verifying MEDUSA_ADMIN_API_KEY against ${BACKEND}\n`)
  const appOk = await probe('app format base64("key:")', encoded)
  const rawOk = await probe('alternate raw key', raw)

  console.log('')
  if (appOk) {
    console.log('OK — the app format works. You can set MEDUSA_ADMIN_API_KEY in Vercel.')
    process.exit(0)
  }
  if (rawOk) {
    console.log('The key is valid, but this Medusa accepts the RAW form, not base64.')
    console.log('Tell me and I will switch src/lib/medusaAdmin.ts to the raw form before you deploy.')
    process.exit(2)
  }
  console.log('Neither form authenticated. Check the key was copied correctly and is a SECRET (not publishable) key,')
  console.log('and that it has not been revoked. The key value is never printed by this script.')
  process.exit(1)
}

main().catch((err) => {
  console.error('\nVerification failed to run:', err instanceof Error ? err.message : err)
  process.exit(1)
})
