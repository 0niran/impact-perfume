import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@sanity/client'
import { rateLimit } from '@/lib/rateLimit'
import { cartSaveBodySchema, formatZodError } from '@/lib/validation'

const writeClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-10-01',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
})

export async function POST(req: NextRequest) {
  const limit = await rateLimit(req, 'cart-save', { limit: 5, window: '1 m' })
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, message: 'Too many requests. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    )
  }

  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || !process.env.SANITY_API_WRITE_TOKEN) {
    return NextResponse.json({ ok: false, message: 'Cart save not configured.' }, { status: 500 })
  }

  let rawBody: unknown
  try { rawBody = await req.json() } catch {
    return NextResponse.json({ ok: false, message: 'Invalid body.' }, { status: 400 })
  }

  const parsed = cartSaveBodySchema.safeParse(rawBody)
  if (!parsed.success) {
    const { message, field } = formatZodError(parsed.error)
    return NextResponse.json({ ok: false, message, field }, { status: 400 })
  }
  const body = parsed.data

  const normalisedLines = body.lines.map((l) => ({
    variantId: l.variantId,
    productId: l.productId,
    handle: l.handle,
    name: l.name,
    variantLabel: l.variantLabel,
    qty: l.qty,
    unitPriceMinor: l.unitPriceMinor ?? l.unitPriceKobo ?? 0,
    thumbnail: l.thumbnail,
  }))

  try {
    // Upsert by email: replace any existing pending cart for this address so
    // the customer only ever receives one reminder per active cart.
    const existing = await writeClient.fetch<{ _id: string }[]>(
      `*[_type == "pendingCart" && email == $email && status == "pending"]{ _id }`,
      { email: body.email }
    )

    const doc = {
      _type: 'pendingCart',
      email: body.email,
      region: body.region,
      currency: body.currency,
      subtotalMinor: body.subtotalMinor,
      lines: normalisedLines,
      createdAt: new Date().toISOString(),
      remindersSent: 0,
      status: 'pending',
      consentToContact: true,
      consentedAt: new Date().toISOString(),
    }

    if (existing.length > 0) {
      // Replace the contents of the existing doc rather than creating a duplicate.
      await writeClient
        .patch(existing[0]._id)
        .set({ ...doc, _id: existing[0]._id })
        .commit()
    } else {
      await writeClient.create(doc)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[cart.save] failed:', err)
    return NextResponse.json({ ok: false, message: 'Could not save cart.' }, { status: 500 })
  }
}
