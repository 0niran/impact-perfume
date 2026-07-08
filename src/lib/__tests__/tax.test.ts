import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { computeStripeTax, recordTaxTransaction, ngInclusiveVat, isStripeTaxEnabled } from '@/lib/tax'
import type Stripe from 'stripe'

const CA_ADDRESS = {
  line1: '123 King St W',
  city: 'Toronto',
  state: 'Ontario',
  postalCode: 'M5H 1A1',
  countryCode: 'CA',
}

function mockStripe(overrides?: Partial<{ create: unknown; createFromCalculation: unknown }>) {
  return {
    tax: {
      calculations: { create: overrides?.create ?? vi.fn() },
      transactions: { createFromCalculation: overrides?.createFromCalculation ?? vi.fn() },
    },
  } as unknown as Stripe
}

describe('ngInclusiveVat', () => {
  it('extracts the embedded 7.5% portion from an inclusive total', () => {
    expect(ngInclusiveVat(10750)).toBe(750) // 10000 ex-VAT + 750 VAT
    expect(ngInclusiveVat(0)).toBe(0)
  })
})

describe('isStripeTaxEnabled', () => {
  const prev = process.env.STRIPE_TAX_ENABLED
  afterEach(() => {
    process.env.STRIPE_TAX_ENABLED = prev
  })
  it('is true only when the flag is exactly "true"', () => {
    process.env.STRIPE_TAX_ENABLED = 'true'
    expect(isStripeTaxEnabled()).toBe(true)
    process.env.STRIPE_TAX_ENABLED = 'false'
    expect(isStripeTaxEnabled()).toBe(false)
    delete process.env.STRIPE_TAX_ENABLED
    expect(isStripeTaxEnabled()).toBe(false)
  })
})

describe('computeStripeTax', () => {
  const prev = process.env.STRIPE_TAX_ENABLED
  beforeEach(() => {
    process.env.STRIPE_TAX_ENABLED = 'true'
  })
  afterEach(() => {
    process.env.STRIPE_TAX_ENABLED = prev
    vi.restoreAllMocks()
  })

  const lines = [{ variantId: 'variant_1', amountMinor: 10000, qty: 1 }]

  it('returns zero tax (total = subtotal) when the tax engine is disabled', async () => {
    process.env.STRIPE_TAX_ENABLED = 'false'
    const create = vi.fn()
    const stripe = mockStripe({ create })
    const res = await computeStripeTax(stripe, { subtotalMinor: 10000, currency: 'cad', lines, address: CA_ADDRESS })
    expect(res).toEqual({ taxMinor: 0, totalMinor: 10000 })
    expect(create).not.toHaveBeenCalled()
  })

  it('returns zero tax for destinations outside Canada (export)', async () => {
    const create = vi.fn()
    const stripe = mockStripe({ create })
    const res = await computeStripeTax(stripe, {
      subtotalMinor: 10000,
      currency: 'cad',
      lines,
      address: { ...CA_ADDRESS, countryCode: 'GB' },
    })
    expect(res).toEqual({ taxMinor: 0, totalMinor: 10000 })
    expect(create).not.toHaveBeenCalled()
  })

  it('calls Stripe Tax and returns the calculated tax for a Canadian address', async () => {
    const create = vi.fn().mockResolvedValue({
      id: 'taxcalc_1',
      tax_amount_exclusive: 1300,
      amount_total: 11300,
    })
    const stripe = mockStripe({ create })
    const res = await computeStripeTax(stripe, { subtotalMinor: 10000, currency: 'cad', lines, address: CA_ADDRESS })
    expect(res).toEqual({ taxMinor: 1300, totalMinor: 11300, calculationId: 'taxcalc_1' })
    expect(create).toHaveBeenCalledTimes(1)
    const arg = create.mock.calls[0][0]
    expect(arg.customer_details.address.country).toBe('CA')
    expect(arg.line_items[0]).toMatchObject({ amount: 10000, reference: 'variant_1', quantity: 1 })
  })
})

describe('recordTaxTransaction', () => {
  afterEach(() => vi.restoreAllMocks())

  it('no-ops when there is no calculation id', async () => {
    const createFromCalculation = vi.fn()
    const stripe = mockStripe({ createFromCalculation })
    await recordTaxTransaction(stripe, undefined, 'ref-1')
    expect(createFromCalculation).not.toHaveBeenCalled()
  })

  it('records the transaction with the order reference', async () => {
    const createFromCalculation = vi.fn().mockResolvedValue({ id: 'taxtxn_1' })
    const stripe = mockStripe({ createFromCalculation })
    await recordTaxTransaction(stripe, 'taxcalc_1', 'ref-1')
    expect(createFromCalculation).toHaveBeenCalledWith({ calculation: 'taxcalc_1', reference: 'ref-1' })
  })

  it('swallows a duplicate-reference error (idempotent across webhook + redirect)', async () => {
    const createFromCalculation = vi.fn().mockRejectedValue(new Error('reference already exists'))
    const stripe = mockStripe({ createFromCalculation })
    await expect(recordTaxTransaction(stripe, 'taxcalc_1', 'ref-1')).resolves.toBeUndefined()
  })
})
