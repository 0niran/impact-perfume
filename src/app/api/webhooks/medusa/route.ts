import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

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
  return process.env.MEDUSA_WEBHOOK_SECRET || process.env.CRON_SECRET
}

function isAuthorised(req: NextRequest): boolean {
  const secret = expectedSecret()
  if (!secret) return true // not configured — allow (e.g. local dev)
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
  if (categories.some((c) => ['home-diffusers', 'scent-candles', 'scenting-machines', 'car-diffusers'].includes(c))) {
    paths.add('/home')
  }

  return [...paths]
}

export async function POST(req: NextRequest) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ ok: false, message: 'Unauthorised.' }, { status: 401 })
  }

  let body: MedusaEventPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid JSON.' }, { status: 400 })
  }

  const handle = body.data?.handle
  if (!body.type || !handle) {
    return NextResponse.json({ ok: false, message: 'Missing type or data.handle.' }, { status: 400 })
  }

  const paths = pathsFor(handle, body.data?.categories ?? [])
  for (const p of paths) revalidatePath(p)

  return NextResponse.json({
    ok: true,
    type: body.type,
    handle,
    revalidated: paths,
  })
}
