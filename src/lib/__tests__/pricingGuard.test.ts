import { describe, it, expect, vi, beforeEach } from 'vitest'

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_MEDUSA_BACKEND_URL', 'https://medusa.test')
  vi.stubEnv('MEDUSA_ADMIN_EMAIL', 'admin@example.com')
  vi.stubEnv('MEDUSA_ADMIN_PASSWORD', 'secret')
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
      if (url.includes('/auth/user/emailpass')) return { token: 't' }
      if (url.includes('/admin/products')) {
        return {
          products: [
            {
              id: 'p1',
              variants: [
                {
                  id: 'v1',
                  prices: [
                    { amount: 50_000, currency_code: 'ngn' },
                    { amount: 65, currency_code: 'cad' },
                  ],
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
      [{ variantId: 'v1', qty: 2, unitPriceKobo: 5_000_000 }],
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
    stubFetch((url) => {
      if (url.includes('/auth/user/emailpass')) return { token: 't' }
      return {
        products: [
          {
            id: 'p1',
            variants: [
              { id: 'v1', prices: [{ amount: 50_000, currency_code: 'ngn' }] },
            ],
          },
        ],
      }
    })
    const { validateLinePricing } = await loadModule()
    // Attacker sends ₦1 (100 kobo) instead of ₦50,000
    const result = await validateLinePricing(
      [{ variantId: 'v1', qty: 1, unitPriceKobo: 100 }],
      'NG'
    )
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/price has changed/i)
  })

  it('rejects when variant has no price in the active currency', async () => {
    stubFetch((url) => {
      if (url.includes('/auth/user/emailpass')) return { token: 't' }
      return {
        products: [
          {
            id: 'p1',
            variants: [
              { id: 'v1', prices: [{ amount: 50_000, currency_code: 'ngn' }] },
            ],
          },
        ],
      }
    })
    const { validateLinePricing } = await loadModule()
    // Asking for CAD on a variant that only has NGN price
    const result = await validateLinePricing(
      [{ variantId: 'v1', qty: 1, unitPriceKobo: 5_000_000 }],
      'CA'
    )
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/not available/i)
  })

  it('rejects when variant cannot be found', async () => {
    stubFetch((url) => {
      if (url.includes('/auth/user/emailpass')) return { token: 't' }
      return { products: [] }
    })
    const { validateLinePricing } = await loadModule()
    const result = await validateLinePricing(
      [{ variantId: 'v-missing', qty: 1, unitPriceKobo: 5_000_000 }],
      'NG'
    )
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/no longer available/i)
  })

  it('rejects when Medusa is unreachable (fails closed)', async () => {
    vi.stubEnv('NEXT_PUBLIC_MEDUSA_BACKEND_URL', '')
    const { validateLinePricing } = await loadModule()
    const result = await validateLinePricing(
      [{ variantId: 'v1', qty: 1, unitPriceKobo: 5_000_000 }],
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
    stubFetch(() => ({ token: 't' }))
    const { validateLinePricing } = await loadModule()
    const result = await validateLinePricing(
      [{ variantId: 'v1', qty: 0, unitPriceKobo: 5_000_000 }],
      'NG'
    )
    expect(result.ok).toBe(false)
  })

  it('rejects oversized quantities (cap of 99)', async () => {
    stubFetch(() => ({ token: 't' }))
    const { validateLinePricing } = await loadModule()
    const result = await validateLinePricing(
      [{ variantId: 'v1', qty: 100, unitPriceKobo: 5_000_000 }],
      'NG'
    )
    expect(result.ok).toBe(false)
  })
})
