/**
 * The single mapping from a client cart line to the wire shape the checkout
 * endpoints accept. Both rails — Paystack verify (NG) and the Stripe
 * create-intent (CA) — validate `lines` with `cartLineInputSchema`, so they
 * take the same payload; keeping one mapper here stops the two checkout
 * components from drifting in what they send (the Stripe panel previously
 * omitted `currency`).
 */

import type { CartLine } from '@/store/cartStore'
import type { CartLineInput } from '@/lib/validation'

/** Map a cart line to the validated order-line payload sent at checkout. */
export function toCartLinePayload(line: CartLine): CartLineInput {
  return {
    variantId: line.variantId,
    productId: line.productId,
    name: line.name,
    variantLabel: line.variantLabel,
    qty: line.qty,
    unitPriceKobo: line.unitPriceKobo,
    currency: line.currency,
  }
}
