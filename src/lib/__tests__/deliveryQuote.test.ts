import { describe, it, expect, beforeAll } from 'vitest'
import { signDeliveryQuote, verifyDeliveryQuote } from '@/lib/deliveryQuote'
import type { ShippingAddress } from '@/lib/orderFulfillment'

const addr: ShippingAddress = {
  address1: '12 Banana Island Road',
  city: 'Ikoyi',
  state: 'Lagos',
  country: 'Nigeria',
}

beforeAll(() => {
  // The signer falls back to PAYSTACK_SECRET_KEY when GIG_QUOTE_SECRET is unset.
  process.env.GIG_QUOTE_SECRET = 'test-secret-key'
})

describe('deliveryQuote token', () => {
  it('round-trips fee + coordinates for the bound address', () => {
    const token = signDeliveryQuote({ rawFeeMinor: 250000, lat: 6.45, lng: 3.42, addr })
    expect(token).toBeTruthy()
    const verified = verifyDeliveryQuote(token, addr)
    expect(verified).toEqual({ rawFeeMinor: 250000, lat: 6.45, lng: 3.42 })
  })

  it('rejects a token replayed for a different (cheaper) address', () => {
    const token = signDeliveryQuote({ rawFeeMinor: 250000, lat: 6.45, lng: 3.42, addr })!
    const otherAddr: ShippingAddress = { ...addr, address1: '1 Faraway Street', city: 'Kano' }
    expect(verifyDeliveryQuote(token, otherAddr)).toBeNull()
  })

  it('rejects a tampered signature', () => {
    const token = signDeliveryQuote({ rawFeeMinor: 250000, lat: 6.45, lng: 3.42, addr })!
    const [body] = token.split('.')
    const forged = `${body}.${'A'.repeat(43)}`
    expect(verifyDeliveryQuote(forged, addr)).toBeNull()
  })

  it('rejects a fee edited in the payload (breaks the HMAC)', () => {
    const token = signDeliveryQuote({ rawFeeMinor: 250000, lat: 6.45, lng: 3.42, addr })!
    const [body, sig] = token.split('.')
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    payload.fee = 1
    const forgedBody = Buffer.from(JSON.stringify(payload)).toString('base64url')
    expect(verifyDeliveryQuote(`${forgedBody}.${sig}`, addr)).toBeNull()
  })

  it('rejects a malformed or missing token', () => {
    expect(verifyDeliveryQuote(undefined, addr)).toBeNull()
    expect(verifyDeliveryQuote('', addr)).toBeNull()
    expect(verifyDeliveryQuote('not-a-token', addr)).toBeNull()
  })
})
