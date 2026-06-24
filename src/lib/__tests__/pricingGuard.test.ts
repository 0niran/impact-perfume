import { describe, it, expect, vi, beforeEach } from 'vitest'

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_MEDUSA_BACKEND_URL', 'https://medusa.test')
  vi.stubEnv('NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY', 'pk_test')
  vi.stubEnv('NEXT_PUBLIC_MEDUSA_REGION_ID', 'reg_ng')
  vi.stubEnv('NEXT_PUBLIC_MEDUSA_REGION_ID_CA', 'reg_ca')
  vi.resetModules()
})

function stubFetch(handler: (url: string, init?: RequestInit) => unknown) {
  const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const res = handler(String(url), init)
    return new Response(JSON.stringify(res), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function loadModule() {
  return await import('../pricingGuard')
}

describe('validateLinePricing — happy path', () => {
  it('passes when client prices match Medusa exactly', async () => {
    stubFetch((url) => {
      if (url.includes('/store/products')) {
        return {
          products: [
            {
              id: 'p1',
              variants: [
                {
                  id: 'v1',
                  calculated_price: {
                    calculated_amount: 50_000,
                    currency_code: 'ngn',
                  },
                },
              ],
            },
          ],
        }
      }
      return {}
    })
    const { validateLinePricing } = await loadModule()
    // Client claims 5,000,000 kobo (₦50,000 × 100). Medusa has 50,000 major
    // units. 50,000 × 100 = 5,000,000 → matches.
    const result = await validateLinePricing(
      [{ variantId: 'v1', productId: 'p1', qty: 2, unitPriceKobo: 5_000_000 }],
      'NG'
    )
    expect(result.ok).toBe(true)
    expect(result.totalMinor).toBe(10_000_000) // 5M × 2
    expect(result.currency).toBe('NGN')
    expect(result.lines[0].serverUnitPriceMinor).toBe(5_000_000)
  })
})

describe('validateLinePricing — rejects', () => {
  it('rejects when client unitPriceKobo differs from Medusa', async () => {
    stubFetch(() => ({
      products: [
        {
          id: 'p1',
          variants: [
            {
              id: 'v1',
              calculated_price: { calculated_amount: 50_000, currency_code: 'ngn' },
            },
          ],
        },
      ],
    }))
    const { validateLinePricing } = await loadModule()
    // Attacker sends ₦1 (100 kobo) instead of ₦50,000
    const result = await validateLinePricing(
      [{ variantId: 'v1', productId: 'p1', qty: 1, unitPriceKobo: 100 }],
      'NG'
    )
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/price has changed/i)
  })

  it('rejects when variant has no calculated price', async () => {
    stubFetch(() => ({
      products: [
        {
          id: 'p1',
          variants: [{ id: 'v1', calculated_price: undefined }],
        },
      ],
    }))
    const { validateLinePricing } = await loadModule()
    const result = await validateLinePricing(
      [{ variantId: 'v1', productId: 'p1', qty: 1, unitPriceKobo: 5_000_000 }],
      'NG'
    )
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/not available/i)
  })

  it('rejects when calculated price currency does not match region', async () => {
    stubFetch(() => ({
      products: [
        {
          id: 'p1',
          variants: [
            {
              id: 'v1',
              calculated_price: { calculated_amount: 65, currency_code: 'cad' },
            },
          ],
        },
      ],
    }))
    const { validateLinePricing } = await loadModule()
    // Asking NG region against a CAD-priced variant
    const result = await validateLinePricing(
      [{ variantId: 'v1', productId: 'p1', qty: 1, unitPriceKobo: 6_500 }],
      'NG'
    )
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/not available/i)
  })

  it('rejects when variant cannot be found on the named product', async () => {
    stubFetch(() => ({
      products: [
        {
          id: 'p1',
          variants: [
            {
              id: 'v-other',
              calculated_price: { calculated_amount: 50_000, currency_code: 'ngn' },
            },
          ],
        },
      ],
    }))
    const { validateLinePricing } = await loadModule()
    const result = await validateLinePricing(
      [{ variantId: 'v-missing', productId: 'p1', qty: 1, unitPriceKobo: 5_000_000 }],
      'NG'
    )
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/no longer available/i)
  })

  it('rejects when Medusa is unreachable (fails closed)', async () => {
    vi.stubEnv('NEXT_PUBLIC_MEDUSA_BACKEND_URL', '')
    const { validateLinePricing } = await loadModule()
    const result = await validateLinePricing(
      [{ variantId: 'v1', productId: 'p1', qty: 1, unitPriceKobo: 5_000_000 }],
      'NG'
    )
    expect(result.ok).toBe(false)
  })

  it('rejects empty carts', async () => {
    const { validateLinePricing } = await loadModule()
    const result = await validateLinePricing([], 'NG')
    expect(result.ok).toBe(false)
  })

  it('rejects invalid quantities', async () => {
    const { validateLinePricing } = await loadModule()
    const result = await validateLinePricing(
      [{ variantId: 'v1', productId: 'p1', qty: 0, unitPriceKobo: 5_000_000 }],
      'NG'
    )
    expect(result.ok).toBe(false)
  })

  it('rejects oversized quantities (cap of 99)', async () => {
    const { validateLinePricing } = await loadModule()
    const result = await validateLinePricing(
      [{ variantId: 'v1', productId: 'p1', qty: 100, unitPriceKobo: 5_000_000 }],
      'NG'
    )
    expect(result.ok).toBe(false)
  })

  it('rejects when productId is missing on a line', async () => {
    const { validateLinePricing } = await loadModule()
    const result = await validateLinePricing(
      [{ variantId: 'v1', qty: 1, unitPriceKobo: 5_000_000 }],
      'NG'
    )
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/out of date/i)
  })
})

describe('verifyPaidOrder — fulfilment gate (audit H-1)', () => {
  const ngVariant = {
    products: [
      {
        id: 'p1',
        variants: [
          {
            id: 'v1',
            calculated_price: { calculated_amount: 50_000, currency_code: 'ngn' },
          },
        ],
      },
    ],
  }

  it('passes and returns server-priced lines when prices and amount match', async () => {
    stubFetch(() => ngVariant)
    const { verifyPaidOrder } = await loadModule()
    const result = await verifyPaidOrder(
      [{ variantId: 'v1', productId: 'p1', name: 'Impact No. 1', qty: 1, unitPriceKobo: 5_000_000 }],
      'NG',
      5_000_000 // amount actually paid
    )
    expect(result.ok).toBe(true)
    expect(result.totalMinor).toBe(5_000_000)
    expect(result.lines[0]).toMatchObject({ name: 'Impact No. 1', unitPriceKobo: 5_000_000 })
  })

  it('rejects underpayment even when line prices match Medusa', async () => {
    stubFetch(() => ngVariant)
    const { verifyPaidOrder } = await loadModule()
    // Correct line prices, but the customer only paid ₦1 (Paystack amount is
    // client-controlled). Must be refused.
    const result = await verifyPaidOrder(
      [{ variantId: 'v1', productId: 'p1', name: 'Impact No. 1', qty: 1, unitPriceKobo: 5_000_000 }],
      'NG',
      100
    )
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/amount paid/i)
  })

  it('rejects tampered line prices via the re-pricing check', async () => {
    stubFetch(() => ngVariant)
    const { verifyPaidOrder } = await loadModule()
    const result = await verifyPaidOrder(
      [{ variantId: 'v1', productId: 'p1', name: 'Impact No. 1', qty: 1, unitPriceKobo: 100 }],
      'NG',
      100
    )
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/price has changed/i)
  })
})
