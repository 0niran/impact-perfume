import { createClient } from '@sanity/client'

/**
 * Idempotency lock for payment fulfilment. The redirect-verify path and the
 * webhook path can both arrive for the same payment; only the first one to
 * successfully create the lock document is allowed to actually fulfil the
 * order. Subsequent callers are no-ops.
 *
 * Lock document id is deterministic: `processed-payment-{reference}`.
 * Sanity `create` throws 409 on duplicate ids, which we map to "already
 * processed".
 *
 * Failure mode: if Sanity is unreachable or unconfigured, we fail-open and
 * allow the caller to proceed. Two duplicate Medusa orders is recoverable;
 * a missed order is not.
 */

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production'
const token = process.env.SANITY_API_WRITE_TOKEN

const sanity =
  projectId && token
    ? createClient({ projectId, dataset, token, apiVersion: '2024-10-01', useCdn: false })
    : null

function lockId(reference: string): string {
  // Sanity ids only allow [a-zA-Z0-9_-]
  const safe = reference.replace(/[^a-zA-Z0-9_-]/g, '-')
  return `processed-payment-${safe}`
}

export type PaymentSource = 'verify' | 'webhook'

/**
 * Try to claim the lock for this reference. Returns true if we won (caller
 * should proceed with fulfilment), false if it's already been processed
 * (caller should silently skip).
 */
export async function claimPayment(
  reference: string,
  provider: 'paystack' | 'stripe',
  source: PaymentSource
): Promise<boolean> {
  if (!sanity) {
    console.warn('[processedPayment] Sanity not configured, skipping idempotency lock')
    return true
  }
  try {
    await sanity.create({
      _id: lockId(reference),
      _type: 'processedPayment',
      reference,
      provider,
      source,
      processedAt: new Date().toISOString(),
    })
    return true
  } catch (err) {
    const status =
      err && typeof err === 'object' && 'statusCode' in err
        ? (err as { statusCode?: number }).statusCode
        : undefined
    if (status === 409) {
      // Already processed by another caller — silent skip
      return false
    }
    console.error('[processedPayment] lock claim failed, failing open', err)
    return true
  }
}

/**
 * Release a previously-claimed lock so a later retry can re-attempt
 * fulfilment. Used when order creation fails after the lock was claimed —
 * otherwise the poisoned lock would block every retry and lose a paid order.
 */
export async function releasePayment(reference: string): Promise<void> {
  if (!sanity) return
  try {
    await sanity.delete(lockId(reference))
  } catch (err) {
    console.error('[processedPayment] failed to release lock', err)
  }
}

/** Annotate the lock with the resulting Medusa order id. Best-effort. */
export async function recordMedusaOrderId(
  reference: string,
  medusaOrderId: string
): Promise<void> {
  if (!sanity) return
  try {
    await sanity.patch(lockId(reference)).set({ medusaOrderId }).commit()
  } catch (err) {
    console.error('[processedPayment] failed to record medusaOrderId', err)
  }
}
