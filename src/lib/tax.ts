/**
 * Sales tax for the two markets.
 *
 *  - Canada (CAD / Stripe): tax is ADDED at checkout. We use Stripe Tax to
 *    calculate the correct GST/HST/PST for the ship-to province, so the rate
 *    table stays current and remittance is reportable from the Stripe dashboard.
 *    Only shipments *within Canada* are taxed here; anything shipping elsewhere
 *    on the CAD rail is treated as an export (zero Canadian tax — the buyer may
 *    owe import duties, which is out of scope).
 *
 *  - Nigeria (NGN / Paystack): prices are VAT-inclusive, so the charged amount
 *    does not change. We only compute the embedded 7.5% portion for bookkeeping
 *    on the order record.
 *
 * Rollout is gated by STRIPE_TAX_ENABLED. Until it is "true", computeStripeTax
 * returns zero tax so the CAD checkout keeps working exactly as before — flip
 * the flag only after Stripe Tax is turned on and your provinces are registered
 * in the Stripe dashboard.
 */

import type Stripe from 'stripe'
import { serverEnv } from '@/lib/env'

/** Stripe tax code for general tangible goods (fragrance). */
const GENERAL_GOODS_TAX_CODE = 'txcd_99999999'

/** Nigerian VAT rate — prices are inclusive of this. */
const NG_VAT_RATE = 0.075

export interface TaxLine {
  variantId: string
  /** Line total in MINOR units (unit price × qty), tax-exclusive. */
  amountMinor: number
  qty: number
}

export interface TaxResult {
  /** Tax to add, MINOR units. */
  taxMinor: number
  /** Subtotal + tax, MINOR units (what to charge). */
  totalMinor: number
  /** Stripe Tax calculation id, when one was created (for the tax transaction). */
  calculationId?: string
}

export function isStripeTaxEnabled(): boolean {
  return serverEnv.stripeTaxEnabled
}

interface TaxAddress {
  line1: string
  line2?: string
  city: string
  state: string
  postalCode: string
  /** ISO 3166-1 alpha-2, uppercase. */
  countryCode: string
}

/**
 * Calculate Canadian tax via Stripe Tax. Returns zero tax (total = subtotal)
 * when the tax engine is disabled or the destination is outside Canada, so the
 * caller can always trust `totalMinor` as the amount to charge.
 */
export async function computeStripeTax(
  stripe: Stripe,
  opts: { subtotalMinor: number; currency: string; lines: TaxLine[]; address: TaxAddress }
): Promise<TaxResult> {
  const country = opts.address.countryCode?.toUpperCase()
  if (!isStripeTaxEnabled() || country !== 'CA') {
    return { taxMinor: 0, totalMinor: opts.subtotalMinor }
  }

  const calc = await stripe.tax.calculations.create({
    currency: opts.currency.toLowerCase(),
    line_items: opts.lines.map((l) => ({
      amount: l.amountMinor,
      reference: l.variantId,
      quantity: l.qty,
      tax_code: GENERAL_GOODS_TAX_CODE,
      tax_behavior: 'exclusive',
    })),
    customer_details: {
      address: {
        line1: opts.address.line1,
        line2: opts.address.line2 || undefined,
        city: opts.address.city,
        state: opts.address.state,
        postal_code: opts.address.postalCode,
        country: 'CA',
      },
      address_source: 'shipping',
    },
  })

  return {
    taxMinor: calc.tax_amount_exclusive,
    totalMinor: calc.amount_total,
    calculationId: calc.id ?? undefined,
  }
}

/**
 * Record a Stripe Tax transaction from a calculation once the payment settled,
 * so the sale shows up in Stripe's tax reporting for remittance. Idempotent by
 * `reference`: a duplicate call (webhook + redirect) throws "reference already
 * exists", which we swallow.
 */
export async function recordTaxTransaction(
  stripe: Stripe,
  calculationId: string | undefined,
  reference: string
): Promise<void> {
  if (!calculationId) return
  try {
    await stripe.tax.transactions.createFromCalculation({
      calculation: calculationId,
      reference,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // A repeat call for the same reference is expected and harmless.
    if (/already exists|reference/i.test(msg)) return
    console.error('[tax] recordTaxTransaction failed', { reference, msg })
  }
}

/** Embedded VAT portion of a tax-inclusive Nigerian total, MINOR units. */
export function ngInclusiveVat(totalMinorInclusive: number): number {
  return Math.round(totalMinorInclusive - totalMinorInclusive / (1 + NG_VAT_RATE))
}
