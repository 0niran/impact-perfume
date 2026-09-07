import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { serverEnv } from '@/lib/env'
import { CATALOGUE_CACHE_TAG } from '@/lib/medusa'
import { BESPOKE_CACHE_TAG } from '@/lib/bespokeConfig'

/**
 * Receives product lifecycle events from Medusa and revalidates the affected
 * storefront paths. Lets us drop the "wait up to an hour for the PDP to
 * refresh" problem any time the owner touches a product.
 *
 * Auth: Authorization: Bearer ${MEDUSA_WEBHOOK_SECRET}
 *  (falls back to CRON_SECRET if the dedicated webhook secret isn't set, so
 *  the owner can start with one shared key and split later).
 *
 * Payload (small, owner-controlled — see docs/medusa-webhook-setup.md):
 *  {
 *    "type": "product.updated",
 *    "data": { "id": "prod_…", "handle": "no-5", "categories": ["number-collection"] }
 *  }
 */
interface MedusaEventPayload {
  type?: string
  data?: {
    id?: string
    handle?: string
    categories?: string[]
  }
}

function expectedSecret(): string | undefined {
  return serverEnv.medusaWebhookSecret || serverEnv.cronSecret
}

// Fails CLOSED when no secret is configured — refusing the webhook is
// better than letting anyone churn the cache (audit H-2).
function isAuthorised(req: NextRequest): boolean {
  const secret = expectedSecret()
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

/**
 * Map a product handle + categories to the paths whose cache should be flushed.
 * Conservative: when in doubt, include the path. Over-invalidating is cheap;
 * under-invalidating is the bug we're trying to avoid.
 */
function pathsFor(handle: string, categories: string[] = []): string[] {
  const paths = new Set<string>(['/']) // homepage shows featured numbers

  const noMatch = handle.match(/^no-(\d+)$/)
  if (noMatch) {
    paths.add(`/no/${noMatch[1]}`)
    paths.add('/no-series')
  }

  const oilMatch = handle.match(/^oil-no-(\d+)$/)
  if (oilMatch) {
    paths.add(`/oil/${oilMatch[1]}`)
    paths.add('/oils')
  }

  // Signature, Gifts, Discovery and Home & Car products: rely on category info.
  if (categories.includes('signature')) {
    paths.add(`/signature/${handle}`)
    paths.add('/signature')
  }
  if (categories.includes('gifts') || categories.includes('discovery')) {
    paths.add('/gifts')
  }
  // Each of these categories has its own route. Mapping them all to /home left
  // the actual collection pages (/home-diffusers, /car-diffusers, …) stale.
  const CATEGORY_ROUTES: Record<string, string> = {
    'home-diffusers': '/home-diffusers',
    'car-diffusers': '/car-diffusers',
    'scent-candles': '/scent-candles',
    'scenting-machines': '/scenting-machines',
  }
  for (const c of categories) {
    const route = CATEGORY_ROUTES[c]
    if (route) {
      paths.add(route)
      paths.add('/home') // the combined Home & Gifts landing lists them too
    }
  }

  return [...paths]
}

export async function POST(req: NextRequest) {
  const secret = expectedSecret()
  if (!secret) {
    return NextResponse.json(
      { ok: false, message: 'Webhook not configured.' },
      { status: 503 }
    )
  }
  if (!isAuthorised(req)) {
    return NextResponse.json({ ok: false, message: 'Unauthorised.' }, { status: 401 })
  }

  let body: MedusaEventPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid JSON.' }, { status: 400 })
  }

  // THE important line. Catalogue reads are memoised in unstable_cache under
  // CATALOGUE_CACHE_TAG, and revalidatePath does NOT clear tagged entries — so
  // the previous path-only flush left every product grid and PDP serving stale
  // data until the 120s TTL lapsed. That is the "my edit doesn't show until I
  // refresh" bug. Flush the tag on any authorised product event.
  revalidateTag(CATALOGUE_CACHE_TAG)
  // Bespoke prices live on their own draft products under a separate tag, so
  // the catalogue flush above does not touch them. Without this, editing a
  // bespoke price in the admin stays invisible until its TTL lapses.
  revalidateTag(BESPOKE_CACHE_TAG)

  // Path flushing is now belt-and-braces for rendered routes. A missing handle
  // is no longer fatal: the tag flush above has already done the work that
  // matters, and rejecting the event would throw away a good invalidation just
  // because the payload shape differs from what we expected.
  const handle = body.data?.handle
  const paths = handle ? pathsFor(handle, body.data?.categories ?? []) : []
  for (const p of paths) revalidatePath(p)

  return NextResponse.json({
    ok: true,
    type: body.type ?? null,
    handle: handle ?? null,
    revalidatedTags: [CATALOGUE_CACHE_TAG, BESPOKE_CACHE_TAG],
    revalidated: paths,
  })
}
