import { redis } from '@/lib/redis'

/**
 * Saved carts, for the abandoned-cart reminder.
 *
 * Previously Sanity documents with a `status` field and a nightly pass that
 * flipped stale ones to "expired". Redis does that for free: the key carries a
 * TTL, so an unconverted cart disappears on its own and there is no expiry
 * sweep to write, schedule, or get wrong.
 *
 * Two keys per cart:
 *   pending-cart:<email>   the cart itself, TTL'd
 *   pending-carts          a sorted set scored by creation time, so the cron
 *                          can ask for "carts older than an hour" directly
 *                          rather than scanning
 *
 * A cart is removed from the index once reminded, which is what stops a second
 * email — the old `remindersSent` counter with no index to protect it.
 *
 * Consent: only carts saved with explicit consent are stored at all. The
 * checkout does not call this unless the box is ticked, and the consent and its
 * timestamp travel with the record so the basis is auditable.
 */

const INDEX = 'pending-carts'
const TTL_SECONDS = 7 * 24 * 60 * 60

export interface PendingCartLine {
  variantId: string
  productId?: string
  handle?: string
  name: string
  variantLabel?: string
  qty: number
  unitPriceMinor: number
  thumbnail?: string
}

export interface PendingCart {
  email: string
  region: string
  currency: string
  subtotalMinor: number
  lines: PendingCartLine[]
  createdAt: string
  consentToContact: true
  consentedAt: string
}

function key(email: string): string {
  // Emails are validated upstream; normalise so one address cannot occupy two
  // slots through casing, and keep the key charset predictable.
  return `pending-cart:${email.trim().toLowerCase()}`
}

/** Save or replace this address's cart. One cart per address, by design. */
export async function savePendingCart(
  cart: Omit<PendingCart, 'createdAt' | 'consentToContact' | 'consentedAt'>
): Promise<boolean> {
  if (!redis) return false
  const now = new Date().toISOString()
  const record: PendingCart = {
    ...cart,
    createdAt: now,
    consentToContact: true,
    consentedAt: now,
  }
  const email = cart.email.trim().toLowerCase()
  await redis.set(key(email), record, { ex: TTL_SECONDS })
  // Re-adding an existing member just updates its score, which is the upsert.
  await redis.zadd(INDEX, { score: Date.now(), member: email })
  return true
}

/**
 * Carts saved longer ago than `olderThanMs` and not yet reminded.
 *
 * Anything already reminded has been removed from the index, so presence in
 * the index is the whole "not yet reminded" condition.
 */
export async function listDueCarts(
  olderThanMs: number,
  limit = 50
): Promise<PendingCart[]> {
  const client = redis
  if (!client) return []
  const cutoff = Date.now() - olderThanMs
  const emails = await client.zrange<string[]>(INDEX, 0, cutoff, {
    byScore: true,
    offset: 0,
    count: limit,
  })
  if (emails.length === 0) return []

  const carts = await Promise.all(emails.map((e) => client.get<PendingCart>(key(e))))
  return carts.filter((c): c is PendingCart => Boolean(c))
}

/**
 * Mark a cart reminded by dropping it from the index. The cart itself is left
 * to expire naturally, so a support question about what someone had in their
 * basket is still answerable for the rest of the week.
 */
export async function markReminded(email: string): Promise<void> {
  if (!redis) return
  await redis.zrem(INDEX, email.trim().toLowerCase())
}

/** Drop the cart entirely, e.g. once the order is placed. */
export async function clearPendingCart(email: string): Promise<void> {
  if (!redis) return
  const e = email.trim().toLowerCase()
  await redis.del(key(e))
  await redis.zrem(INDEX, e)
}

/**
 * Remove index entries whose carts have already expired. The cart keys expire
 * themselves; without this the index would keep pointing at them for ever.
 */
export async function pruneIndex(): Promise<number> {
  if (!redis) return 0
  return redis.zremrangebyscore(INDEX, 0, Date.now() - TTL_SECONDS * 1000)
}
