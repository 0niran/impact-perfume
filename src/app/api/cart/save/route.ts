import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@sanity/client'

const writeClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-10-01',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
})

interface IncomingLine {
  variantId: string
  productId?: string
  handle?: string
  name: string
  variantLabel?: string
  qty: number
  unitPriceMinor?: number
  unitPriceKobo?: number // legacy / cart-store alias
  thumbnail?: string
}

interface SavePayload {
  email: string
  region: 'NG' | 'CA'
  currency: string
  subtotalMinor: number
  lines: IncomingLine[]
}

function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && /^\S+@\S+\.\S+$/.test(value)
}

export async function POST(req: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || !process.env.SANITY_API_WRITE_TOKEN) {
    return NextResponse.json({ ok: false, message: 'Cart save not configured.' }, { status: 500 })
  }

  let body: Partial<SavePayload>
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false, message: 'Invalid body.' }, { status: 400 })
  }

  if (!isValidEmail(body.email)) {
    return NextResponse.json({ ok: false, message: 'A valid email is required.' }, { status: 400 })
  }
  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    return NextResponse.json({ ok: false, message: 'Cart is empty.' }, { status: 400 })
  }

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
      region: body.region ?? 'NG',
      currency: (body.currency ?? 'NGN').toUpperCase(),
      subtotalMinor: body.subtotalMinor ?? 0,
      lines: normalisedLines,
      createdAt: new Date().toISOString(),
      remindersSent: 0,
      status: 'pending',
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
