import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'
import { trackShipment } from '@/lib/gig'

/**
 * Public delivery tracking by GIG waybill. Read-only; the waybill is the
 * capability (it's printed on the parcel and emailed to the customer).
 */
export async function GET(req: NextRequest) {
  const limit = await rateLimit(req, 'delivery-track', { limit: 30, window: '1 m' })
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, message: 'Too many requests. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    )
  }

  const waybill = req.nextUrl.searchParams.get('waybill')?.trim()
  if (!waybill || !/^[a-zA-Z0-9-]{4,40}$/.test(waybill)) {
    return NextResponse.json({ ok: false, message: 'Invalid waybill.' }, { status: 400 })
  }

  const result = await trackShipment(waybill)
  if (!result) {
    return NextResponse.json(
      { ok: false, message: 'No tracking found for that waybill yet.' },
      { status: 404 }
    )
  }

  return NextResponse.json({ ok: true, waybill: result.waybill, events: result.events })
}
