/**
 * Currency-agnostic price formatting.
 *
 * `amountMinor` is the amount in the smallest currency unit (kobo for NGN,
 * cents for CAD). For a few currencies the smallest-unit divisor differs;
 * the table below handles those.
 */

type SupportedCurrency = 'NGN' | 'CAD' | 'USD' | 'GBP' | 'EUR'

const LOCALE_BY_CURRENCY: Record<SupportedCurrency, string> = {
  NGN: 'en-NG',
  CAD: 'en-CA',
  USD: 'en-US',
  GBP: 'en-GB',
  EUR: 'en-IE',
}

const FRACTION_DIGITS_BY_CURRENCY: Record<SupportedCurrency, number> = {
  NGN: 0,
  CAD: 2,
  USD: 2,
  GBP: 2,
  EUR: 2,
}

/**
 * Format a price for display.
 *
 * @param amountMinor amount in smallest currency unit (kobo, cents…)
 * @param currency ISO 4217 code (uppercase); defaults to NGN for back-compat
 */
export function formatPrice(amountMinor: number, currency: string = 'NGN'): string {
  const cur = currency.toUpperCase() as SupportedCurrency
  const locale = LOCALE_BY_CURRENCY[cur] ?? 'en-US'
  const fractionDigits = FRACTION_DIGITS_BY_CURRENCY[cur] ?? 2
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: cur,
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(amountMinor / 100)
}

/** @deprecated Use formatPrice(amountMinor, 'NGN') instead. Kept until all call sites migrate. */
export function formatNaira(amountInKobo: number): string {
  return formatPrice(amountInKobo, 'NGN')
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trimEnd()}…`
}
