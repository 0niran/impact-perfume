/**
 * Bespoke pricing — pure, shared by the client configurator and the server
 * action. No server-only imports live here so both can compute the same
 * estimate from the same config. The config values themselves come from
 * Medusa (see lib/bespokeConfig.ts); nothing is hardcoded.
 *
 * Money is in MINOR units (kobo) throughout, matching the rest of the
 * storefront. The Medusa read boundary multiplies major -> minor.
 */

/** A single priceable option (volume, bottle type, or inscription method). */
export interface PricedOption {
  /** Stable key derived from the Medusa SKU (never renamed). */
  key: string
  /** Display label from the Medusa variant title (owner-editable). */
  label: string
  /** Surcharge / price in MINOR units (kobo). */
  priceMinor: number
  /** Optional short description shown under the label. */
  description?: string
}

/** Business rates, editable via the bespoke-config product metadata in Medusa. */
export interface BespokeRates {
  /** Deposit taken at confirmation, as a percentage (e.g. 50). */
  depositPct: number
  /** Quantities at or above this switch to the "custom quote" path. */
  quoteMinQty: number
  /** Volume discount tiers, ascending by minQty. pct is a percentage. */
  discountTiers: Array<{ minQty: number; pct: number }>
}

export interface BespokeConfig {
  /** Base price per volume (absolute, not a multiplier). */
  volumes: PricedOption[]
  /** Bottle-type surcharge (Gloss / Matted). */
  bottleTypes: PricedOption[]
  /** Inscription-method surcharge (Gold foil / Silver foil / Rain sticker). */
  inscriptions: PricedOption[]
  rates: BespokeRates
}

export interface BespokeSelection {
  volumeKey: string
  bottleTypeKey: string
  /** The chosen inscription method, or null when no inscription was requested. */
  inscriptionKey: string | null
  quantity: number
}

export interface BespokeEstimate {
  /** Per-bottle price (base + bottle + inscription), MINOR units. */
  unitMinor: number
  /** Order total after quantity discount, MINOR units. 0 when needsQuote. */
  totalMinor: number
  /** Applied discount as a percentage (0 when none). */
  discountPct: number
  /** Deposit to secure the slot, MINOR units. 0 when needsQuote. */
  depositMinor: number
  /** True for large orders that get a tailored quote instead of a live price. */
  needsQuote: boolean
}

function priceOf(options: PricedOption[], key: string | null): number {
  if (!key) return 0
  return options.find((o) => o.key === key)?.priceMinor ?? 0
}

/** Highest-applicable volume discount percentage for a quantity. */
function discountPctFor(rates: BespokeRates, quantity: number): number {
  let pct = 0
  for (const tier of rates.discountTiers) {
    if (quantity >= tier.minQty) pct = Math.max(pct, tier.pct)
  }
  return pct
}

/**
 * Compute the live estimate from Medusa-driven config. The same function runs
 * client-side (for the on-page estimate) and server-side (authoritative, for
 * the Paystack deposit), so the two can never diverge.
 */
export function computeBespokeEstimate(
  config: BespokeConfig,
  sel: BespokeSelection
): BespokeEstimate {
  const unitMinor =
    priceOf(config.volumes, sel.volumeKey) +
    priceOf(config.bottleTypes, sel.bottleTypeKey) +
    priceOf(config.inscriptions, sel.inscriptionKey)

  if (sel.quantity >= config.rates.quoteMinQty) {
    return { unitMinor, totalMinor: 0, discountPct: 0, depositMinor: 0, needsQuote: true }
  }

  const discountPct = discountPctFor(config.rates, sel.quantity)
  const totalMinor = Math.round(unitMinor * sel.quantity * (1 - discountPct / 100))
  const depositMinor = Math.round(totalMinor * (config.rates.depositPct / 100))
  return { unitMinor, totalMinor, discountPct, depositMinor, needsQuote: false }
}
