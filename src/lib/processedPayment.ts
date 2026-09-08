import { redis } from '@/lib/redis'

/**
 * Idempotency lock for payment fulfilment.
 *
 * The redirect-verify path and the provider webhook can both arrive for the
 * same payment. Only the first caller to claim the lock may fulfil the order;
 * the rest are no-ops. Without this, one payment produces two Medusa orders.
 *
 * Backed by Redis rather than a CMS document. `SET key value NX EX ttl` is
 * atomic and purpose-built for exactly this: it either sets and returns OK, or
 * finds the key present and returns null, in a single round trip with no race
 * between check and write. The previous implementation used a Sanity document
 * whose duplicate-id 409 stood in for the same signal — workable, but it made a
 * money-path guarantee depend on the content system, and it broke silently the
 * moment Sanity was unconfigured.
 *
 * Failure mode, unchanged and deliberate: if Redis is unreachable or
 * unconfigured we fail OPEN and let the caller proceed. Two duplicate orders
 * are recoverable by a human; a payment taken with no order behind it is not.
 */

/**
 * How long a claim is remembered. Duplicate deliveries arrive within seconds to
 * hours — provider webhook retries are measured in hours at the outside — so 30
 * days is far beyond any real duplicate window while still letting the keys
 * expire instead of growing without bound.
 */
const LOCK_TTL_SECONDS = 60 * 60 * 24 * 30

export type PaymentSource = 'verify' | 'webhook'

interface LockValue {
  reference: string
  provider: 'paystack' | 'stripe'
  source: PaymentSource
  processedAt: string
  medusaOrderId?: string
}

/**
 * Key for a payment reference. References come from Paystack and Stripe, so
 * they are constrained already, but they are still external input — anything
 * outside the safe set is replaced so a reference can never break out of its
 * namespace and collide with, or overwrite, another key.
 */
function lockKey(reference: string): string {
  const safe = reference.replace(/[^a-zA-Z0-9_-]/g, '-')
  return `processed-payment:${safe}`
}

/**
 * Claim the lock for this reference. True means the caller won and should
 * fulfil; false means someone already has and the caller should silently skip.
 */
export async function claimPayment(
  reference: string,
  provider: 'paystack' | 'stripe',
  source: PaymentSource
): Promise<boolean> {
  if (!redis) {
    console.warn('[processedPayment] Redis not configured, skipping idempotency lock')
    return true
  }

  const value: LockValue = {
    reference,
    provider,
    source,
    processedAt: new Date().toISOString(),
  }

  try {
    // NX makes this the whole guard: set-if-absent, atomically.
    const result = await redis.set(lockKey(reference), value, {
      nx: true,
      ex: LOCK_TTL_SECONDS,
    })
    // Upstash returns "OK" when the key was set, null when NX found it present.
    return result === 'OK'
  } catch (err) {
    console.error('[processedPayment] lock claim failed, failing open', err)
    return true
  }
}

/**
 * Release a claimed lock so a later retry can re-attempt fulfilment. Used when
 * order creation fails after the claim — otherwise the poisoned lock blocks
 * every retry and a paid order is lost.
 */
export async function releasePayment(reference: string): Promise<void> {
  if (!redis) return
  try {
    await redis.del(lockKey(reference))
  } catch (err) {
    console.error('[processedPayment] failed to release lock', err)
  }
}

/**
 * Annotate the lock with the Medusa order it produced. Best-effort: this is
 * for tracing a payment to its order, and losing it must never fail a payment.
 *
 * Re-sets the whole value rather than merging, because the lock is a single
 * JSON value; the TTL is re-applied so the annotation cannot outlive the lock.
 */
export async function recordMedusaOrderId(
  reference: string,
  medusaOrderId: string
): Promise<void> {
  if (!redis) return
  try {
    const key = lockKey(reference)
    const existing = (await redis.get<LockValue>(key)) ?? null
    if (!existing) return
    await redis.set(key, { ...existing, medusaOrderId }, { ex: LOCK_TTL_SECONDS })
  } catch (err) {
    console.error('[processedPayment] failed to record medusaOrderId', err)
  }
}
