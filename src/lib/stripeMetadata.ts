/**
 * Stripe caps each PaymentIntent metadata value at 500 characters. A cart with
 * enough line items serializes past that limit, which made `paymentIntents.create`
 * throw and surfaced as "Could not initialise payment" at checkout.
 *
 * To stay within the limit for any realistic cart, the serialized line array is
 * split across numbered keys (`lines`, `lines_1`, `lines_2`, …) on write and
 * reassembled on read. Stripe allows up to 50 metadata keys, so this comfortably
 * covers the 50-line cart maximum. For small carts everything fits in `lines`,
 * so the shape is unchanged and backwards compatible with existing intents.
 */

// Keep a margin under Stripe's 500-char ceiling.
const CHUNK_SIZE = 450

/** Split a serialized line payload into chunked metadata keys. */
export function packStripeLines(serialized: string): Record<string, string> {
  const out: Record<string, string> = {}
  let part = 0
  for (let i = 0; i < serialized.length; i += CHUNK_SIZE, part += 1) {
    const key = part === 0 ? 'lines' : `lines_${part}`
    out[key] = serialized.slice(i, i + CHUNK_SIZE)
  }
  // Always emit the base key so readers have something to parse.
  if (out.lines === undefined) out.lines = ''
  return out
}

/** Reassemble the serialized line payload from chunked metadata keys. */
export function unpackStripeLines(
  md: Record<string, string> | null | undefined
): string {
  if (!md) return ''
  let result = md.lines ?? ''
  for (let part = 1; md[`lines_${part}`] !== undefined; part += 1) {
    result += md[`lines_${part}`]
  }
  return result
}
