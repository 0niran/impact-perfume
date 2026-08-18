/**
 * Shared Medusa admin auth for the maintenance scripts.
 *
 * Mirrors the app (src/lib/medusaAdmin.ts): authenticate with a Medusa v2
 * SECRET API KEY over HTTP Basic auth rather than a human email + password, so
 * no password is needed to run these tools. Set MEDUSA_ADMIN_API_KEY in
 * .env.local (the same secret key the deployed app uses).
 *
 * Loads .env.local on import so a script only needs to import from here.
 */

import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

export const MEDUSA_BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'

/** `Basic base64("<key>:")`. Throws (fails loud) when the key is missing. */
export function adminAuthHeader(): string {
  const key = process.env.MEDUSA_ADMIN_API_KEY
  if (!key) {
    throw new Error(
      'MEDUSA_ADMIN_API_KEY not set in .env.local — create a secret API key in the Medusa admin (Settings -> Secret API Keys).'
    )
  }
  return `Basic ${Buffer.from(`${key}:`).toString('base64')}`
}

/**
 * Admin API fetch with auth + JSON handling. Throws on a non-2xx with the
 * response body, matching the ad-hoc `admin()` helpers the scripts used before.
 */
export async function adminFetch(p: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${MEDUSA_BACKEND_URL}${p}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: adminAuthHeader(),
      ...(options.headers ?? {}),
    },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(body)}`)
  return body
}
