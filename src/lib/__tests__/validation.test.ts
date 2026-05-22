import { describe, it, expect } from 'vitest'
import {
  emailSchema,
  phoneSchema,
  customerNameSchema,
  cartLineInputSchema,
  ngShippingAddressSchema,
  caShippingAddressSchema,
  verifyPaymentBodySchema,
  stripeCreateIntentBodySchema,
  cartSaveBodySchema,
  newsletterBodySchema,
} from '../validation'

describe('emailSchema', () => {
  it('accepts well-formed emails', () => {
    expect(emailSchema.safeParse('jane@example.com').success).toBe(true)
    expect(emailSchema.safeParse('foo.bar+tag@sub.domain.co').success).toBe(true)
  })

  it('rejects invalid formats', () => {
    expect(emailSchema.safeParse('not-an-email').success).toBe(false)
    expect(emailSchema.safeParse('@example.com').success).toBe(false)
    expect(emailSchema.safeParse('foo@').success).toBe(false)
  })

  it('lowercases + trims', () => {
    const r = emailSchema.safeParse('  Jane@EXAMPLE.com ')
    expect(r.success).toBe(true)
    if (r.success) expect(r.data).toBe('jane@example.com')
  })

  it('rejects emails over 254 chars (RFC 5321)', () => {
    const long = 'a'.repeat(250) + '@x.co'
    expect(emailSchema.safeParse(long).success).toBe(false)
  })
})

describe('phoneSchema', () => {
  it('accepts common formats', () => {
    expect(phoneSchema.safeParse('+234 803 555 0142').success).toBe(true)
    expect(phoneSchema.safeParse('+1 (416) 555-0142').success).toBe(true)
    expect(phoneSchema.safeParse('08035550142').success).toBe(true)
  })

  it('rejects letters', () => {
    expect(phoneSchema.safeParse('call-me').success).toBe(false)
  })

  it('rejects too-short numbers', () => {
    expect(phoneSchema.safeParse('123').success).toBe(false)
  })
})

describe('customerNameSchema', () => {
  it('accepts ordinary names', () => {
    expect(customerNameSchema.safeParse('Ada Okonkwo').success).toBe(true)
    expect(customerNameSchema.safeParse("Jane O'Brien-Smith").success).toBe(true)
  })

  it('accepts Unicode names with diacritics', () => {
    expect(customerNameSchema.safeParse('Aïcha Aïssatou').success).toBe(true)
    expect(customerNameSchema.safeParse('Ngozi Adéwálé').success).toBe(true)
  })

  it('rejects HTML payloads', () => {
    expect(customerNameSchema.safeParse('<script>alert(1)</script>').success).toBe(false)
    expect(customerNameSchema.safeParse('Jane<br>Smith').success).toBe(false)
    expect(customerNameSchema.safeParse('Jane <img src=x>').success).toBe(false)
  })

  it('rejects control characters', () => {
    expect(customerNameSchema.safeParse('Jane\x00Smith').success).toBe(false)
    expect(customerNameSchema.safeParse('Jane\nSmith').success).toBe(false)
  })

  it('rejects empty strings', () => {
    expect(customerNameSchema.safeParse('').success).toBe(false)
    expect(customerNameSchema.safeParse('   ').success).toBe(false)
  })

  it('rejects strings over 200 chars', () => {
    expect(customerNameSchema.safeParse('a'.repeat(201)).success).toBe(false)
  })
})

describe('cartLineInputSchema', () => {
  it('accepts a minimal valid line', () => {
    const r = cartLineInputSchema.safeParse({
      variantId: 'variant_01KR2GZSD',
      name: 'Impact No. 5',
      qty: 1,
      unitPriceKobo: 5_000_000,
    })
    expect(r.success).toBe(true)
  })

  it('rejects variantId with special characters', () => {
    const r = cartLineInputSchema.safeParse({
      variantId: '../../../etc/passwd',
      name: 'X',
      qty: 1,
      unitPriceKobo: 100,
    })
    expect(r.success).toBe(false)
  })

  it('rejects qty over 99', () => {
    const r = cartLineInputSchema.safeParse({
      variantId: 'v1',
      name: 'X',
      qty: 1000,
      unitPriceKobo: 100,
    })
    expect(r.success).toBe(false)
  })

  it('rejects negative qty', () => {
    const r = cartLineInputSchema.safeParse({
      variantId: 'v1',
      name: 'X',
      qty: -1,
      unitPriceKobo: 100,
    })
    expect(r.success).toBe(false)
  })

  it('rejects HTML in product name', () => {
    const r = cartLineInputSchema.safeParse({
      variantId: 'v1',
      name: '<img src=x onerror=alert(1)>',
      qty: 1,
      unitPriceKobo: 100,
    })
    expect(r.success).toBe(false)
  })
})

describe('ngShippingAddressSchema', () => {
  const valid = {
    address1: '12 Banana Island Road',
    address2: 'Flat 3B',
    city: 'Ikoyi',
    state: 'Lagos',
    country: 'Nigeria',
  }

  it('accepts a well-formed NG address', () => {
    expect(ngShippingAddressSchema.safeParse(valid).success).toBe(true)
  })

  it('requires country = "Nigeria"', () => {
    expect(
      ngShippingAddressSchema.safeParse({ ...valid, country: 'Ghana' }).success
    ).toBe(false)
  })

  it('rejects HTML in address1', () => {
    expect(
      ngShippingAddressSchema.safeParse({ ...valid, address1: '<a>X</a>' }).success
    ).toBe(false)
  })
})

describe('caShippingAddressSchema', () => {
  const valid = {
    address1: '123 King St W',
    address2: 'Apt 4B',
    city: 'Toronto',
    state: 'ON',
    postalCode: 'M5H 1A1',
    country: 'Canada',
  }

  it('accepts a well-formed CA address', () => {
    expect(caShippingAddressSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects invalid Canadian postal codes', () => {
    expect(
      caShippingAddressSchema.safeParse({ ...valid, postalCode: '12345' }).success
    ).toBe(false)
    expect(
      caShippingAddressSchema.safeParse({ ...valid, postalCode: 'AAAAA' }).success
    ).toBe(false)
  })

  it('uppercases and trims postal codes', () => {
    const r = caShippingAddressSchema.safeParse({ ...valid, postalCode: ' m5h 1a1 ' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.postalCode).toBe('M5H 1A1')
  })

  it('requires postalCode (unlike NG)', () => {
    const { postalCode: _omit, ...without } = valid
    expect(caShippingAddressSchema.safeParse(without).success).toBe(false)
  })
})

describe('verifyPaymentBodySchema', () => {
  const ok = {
    reference: 'impact-1737469200-abcd',
    amountKobo: 5_000_000,
    customerName: 'Ada Okonkwo',
    customerEmail: 'ada@example.com',
    customerPhone: '+234 803 555 0142',
    shippingAddress: {
      address1: '12 Banana Island Road',
      city: 'Ikoyi',
      state: 'Lagos',
      country: 'Nigeria',
    },
    lines: [
      {
        variantId: 'variant_01KR',
        name: 'Impact No. 5',
        qty: 1,
        unitPriceKobo: 5_000_000,
      },
    ],
  }

  it('accepts a fully valid request', () => {
    expect(verifyPaymentBodySchema.safeParse(ok).success).toBe(true)
  })

  it('rejects a reference with path-traversal characters', () => {
    expect(
      verifyPaymentBodySchema.safeParse({ ...ok, reference: '../etc/passwd' }).success
    ).toBe(false)
  })

  it('rejects when lines array is empty', () => {
    expect(verifyPaymentBodySchema.safeParse({ ...ok, lines: [] }).success).toBe(false)
  })

  it('caps lines array at 50 to bound payload size', () => {
    const tooMany = Array.from({ length: 51 }, () => ok.lines[0])
    expect(verifyPaymentBodySchema.safeParse({ ...ok, lines: tooMany }).success).toBe(false)
  })

  it('rejects when an inner line is malformed', () => {
    expect(
      verifyPaymentBodySchema.safeParse({
        ...ok,
        lines: [{ ...ok.lines[0], name: '<script>alert(1)</script>' }],
      }).success
    ).toBe(false)
  })
})

describe('stripeCreateIntentBodySchema', () => {
  const ok = {
    currency: 'CAD',
    customerName: 'Jane Doe',
    customerEmail: 'jane@example.com',
    customerPhone: '+1 416 555 0142',
    shippingAddress: {
      address1: '123 King St',
      city: 'Toronto',
      state: 'ON',
      postalCode: 'M5H 1A1',
      country: 'Canada',
    },
    lines: [
      { variantId: 'v1', name: 'Impact No. 5', qty: 1, unitPriceKobo: 6_500 },
    ],
  }

  it('accepts a fully valid request', () => {
    expect(stripeCreateIntentBodySchema.safeParse(ok).success).toBe(true)
  })

  it('rejects non-CAD currencies', () => {
    expect(
      stripeCreateIntentBodySchema.safeParse({ ...ok, currency: 'USD' }).success
    ).toBe(false)
  })

  it('accepts an empty phone (optional)', () => {
    expect(
      stripeCreateIntentBodySchema.safeParse({ ...ok, customerPhone: '' }).success
    ).toBe(true)
  })
})

describe('cartSaveBodySchema', () => {
  const ok = {
    email: 'ada@example.com',
    region: 'NG' as const,
    currency: 'NGN',
    subtotalMinor: 5_000_000,
    consentToContact: true as const,
    lines: [
      {
        variantId: 'v1',
        name: 'Impact No. 5',
        qty: 1,
        unitPriceKobo: 5_000_000,
      },
    ],
  }

  it('accepts a valid save', () => {
    expect(cartSaveBodySchema.safeParse(ok).success).toBe(true)
  })

  it('rejects when consent is missing', () => {
    const { consentToContact: _omit, ...without } = ok
    expect(cartSaveBodySchema.safeParse(without).success).toBe(false)
  })

  it('rejects when consent is false', () => {
    expect(
      cartSaveBodySchema.safeParse({ ...ok, consentToContact: false }).success
    ).toBe(false)
  })
})

describe('newsletterBodySchema', () => {
  it('accepts a valid email', () => {
    expect(newsletterBodySchema.safeParse({ email: 'a@b.co' }).success).toBe(true)
  })

  it('rejects invalid emails', () => {
    expect(newsletterBodySchema.safeParse({ email: 'nope' }).success).toBe(false)
  })
})
