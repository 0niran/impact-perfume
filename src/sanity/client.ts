import { createClient, type SanityClient } from '@sanity/client'

/**
 * Sanity client, or null when Sanity is not configured.
 *
 * Each caller used to build its own client at module scope with a non-null
 * assertion on the project id. `createClient` throws when that id is missing,
 * and because the call sat at module scope the throw happened at import time —
 * so an unset variable did not degrade one feature, it failed the whole build
 * during page-data collection.
 *
 * Returning null instead lets every caller decide: reviews render nothing,
 * saved carts skip, enquiries fall back to email. Sanity is being retired here,
 * and this is what makes it possible to remove one caller at a time rather
 * than all at once.
 */
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production'

function build(opts: { token?: string; useCdn: boolean }): SanityClient | null {
  if (!projectId) return null
  return createClient({ projectId, dataset, apiVersion: '2024-10-01', ...opts })
}

/** Read-only client, CDN-cached. Null when unconfigured. */
export const sanityRead = build({ useCdn: true })

/** Write client. Null when unconfigured or when no write token is set. */
export const sanityWrite = process.env.SANITY_API_WRITE_TOKEN
  ? build({ token: process.env.SANITY_API_WRITE_TOKEN, useCdn: false })
  : null

export const isSanityConfigured = Boolean(projectId)
