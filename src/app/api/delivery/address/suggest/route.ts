import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit } from '@/lib/rateLimit'
import { placesAutocomplete } from '@/lib/places'

/**
 * Address autocomplete proxy. Keeps GOOGLE_MAPS_API_KEY server-side and
 * rate-limits the public endpoint so it can't be used to drain the Places quota.
 * Returns [] (never an error) on failure so the field degrades to manual entry.
 */

const bodySchema = z.object({
  input: z.string().min(1).max(200),
  regionCode: z.enum(['ng', 'ca']).optional(),
  sessionToken: z.string().min(1).max(64).optional(),
})

export async function POST(req: NextRequest) {
  const limit = await rateLimit(req, 'address-suggest', { limit: 30, window: '1 m' })
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, suggestions: [] },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    )
  }

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ ok: false, suggestions: [] }, { status: 400 })
  }
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, suggestions: [] }, { status: 400 })
  }

  const suggestions = await placesAutocomplete(parsed.data.input, {
    regionCode: parsed.data.regionCode ?? 'ng',
    sessionToken: parsed.data.sessionToken,
  })
  return NextResponse.json({ ok: true, suggestions })
}
