/**
 * Signed delivery-quote tokens.
 *
 * The delivery fee is added to the Paystack amount client-side, so the server
 * must not trust a fee the browser reports. When /api/delivery/quote issues a
 * quote it signs the raw GIG fee plus the geocoded coordinates into a compact
 * HMAC token, bound to a hash of the exact address it priced. At payment
 * verification the server re-derives the address hash, checks the signature and
 * expiry, and only then trusts the fee and coordinates — so a tampered client
 * can neither understate the delivery fee nor swap in a cheaper address.
 *
 * The token is not secret (coordinates and a fee aren't sensitive); the HMAC
 * only guarantees integrity. Signing key: GIG_QUOTE_SECRET, falling back to
 * PAYSTACK_SECRET_KEY (always present server-side) so no new env is required.
 */

import crypto from 'crypto'
import type { ShippingAddress } from '@/lib/orderFulfillment'
import { serverEnv } from '@/lib/env'

/** How long a quote stays valid. Paying takes seconds; 30 min is generous. */
const TOKEN_TTL_MS = 30 * 60 * 1000

interface QuoteTokenPayload {
  /** Raw GIG delivery fee in MINOR units (before any free-delivery waiver). */
  fee: number
  lat: number
  lng: number
  /** Address hash this quote is bound to. */
  a: string
  /** Expiry, epoch ms. */
  exp: number
}

export interface VerifiedQuote {
  rawFeeMinor: number
  lat: number
  lng: number
}

function signingKey(): string | null {
  return serverEnv.gigQuoteSecret || serverEnv.paystackSecretKey || null
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

/**
 * Stable hash of the address the fee was priced for. Normalised so trivial
 * whitespace/case differences between quote and verify don't break the bind.
 */
export function addressKey(addr: ShippingAddress): string {
  const norm = [addr.address1, addr.address2 ?? '', addr.city, addr.state, addr.country]
    .map((s) => (s ?? '').trim().toLowerCase().replace(/\s+/g, ' '))
    .join('|')
  return crypto.createHash('sha256').update(norm).digest('hex').slice(0, 32)
}

function hmac(key: string, data: string): string {
  return b64url(crypto.createHmac('sha256', key).update(data).digest())
}

/** Issue a token for a priced quote. Returns null if no signing key exists. */
export function signDeliveryQuote(input: {
  rawFeeMinor: number
  lat: number
  lng: number
  addr: ShippingAddress
}): string | null {
  const key = signingKey()
  if (!key) {
    console.error('[deliveryQuote] no signing key (GIG_QUOTE_SECRET / PAYSTACK_SECRET_KEY)')
    return null
  }
  const payload: QuoteTokenPayload = {
    fee: Math.round(input.rawFeeMinor),
    lat: input.lat,
    lng: input.lng,
    a: addressKey(input.addr),
    exp: Date.now() + TOKEN_TTL_MS,
  }
  const body = b64url(Buffer.from(JSON.stringify(payload)))
  return `${body}.${hmac(key, body)}`
}

/**
 * Validate a token against the address it should be bound to. Returns the
 * trusted fee + coordinates, or null if the token is missing, malformed,
 * tampered, expired, or bound to a different address.
 */
export function verifyDeliveryQuote(
  token: string | undefined | null,
  addr: ShippingAddress
): VerifiedQuote | null {
  const key = signingKey()
  if (!key || !token) return null

  const [body, sig] = token.split('.')
  if (!body || !sig) return null

  const expected = hmac(key, body)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null

  let payload: QuoteTokenPayload
  try {
    payload = JSON.parse(fromB64url(body).toString('utf8'))
  } catch {
    return null
  }

  if (typeof payload.fee !== 'number' || typeof payload.exp !== 'number') return null
  if (payload.exp < Date.now()) return null
  if (payload.a !== addressKey(addr)) return null

  return { rawFeeMinor: payload.fee, lat: payload.lat, lng: payload.lng }
}
