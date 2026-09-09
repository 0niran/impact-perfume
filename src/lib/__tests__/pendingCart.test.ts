import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Saved carts, moved off Sanity onto Redis.
 *
 * The behaviour that matters is not the storage but the guarantees around it:
 * one cart per address, consent recorded with the record, a reminder sent at
 * most once, and carts that expire on their own rather than needing a sweep.
 */
const set = vi.fn()
const get = vi.fn()
const del = vi.fn()
const zadd = vi.fn()
const zrem = vi.fn()
const zrange = vi.fn()
const zremrangebyscore = vi.fn()
let configured = true

vi.mock('@/lib/redis', () => ({
  get redis() {
    return configured ? { set, get, del, zadd, zrem, zrange, zremrangebyscore } : null
  },
  get isRedisConfigured() {
    return configured
  },
}))

import {
  savePendingCart,
  listDueCarts,
  markReminded,
  clearPendingCart,
  pruneIndex,
} from '../pendingCart'

const cart = {
  email: 'Amara@Example.com',
  region: 'NG',
  currency: 'NGN',
  subtotalMinor: 5_000_000,
  lines: [{ variantId: 'v1', name: 'Impact No. 5', qty: 1, unitPriceMinor: 5_000_000 }],
}

beforeEach(() => {
  vi.clearAllMocks()
  configured = true
})

describe('savePendingCart', () => {
  it('stores the cart with an expiry so it disappears on its own', async () => {
    await savePendingCart(cart)
    const [, , opts] = set.mock.calls[0]
    expect(opts.ex).toBeGreaterThan(0)
  })

  it('normalises the address so one person cannot occupy two slots', async () => {
    await savePendingCart(cart)
    expect(set.mock.calls[0][0]).toBe('pending-cart:amara@example.com')
    expect(zadd.mock.calls[0][1]).toMatchObject({ member: 'amara@example.com' })
  })

  it('records consent and when it was given', async () => {
    // The reminder email's lawful basis is consent, so it has to travel with
    // the record rather than being assumed at send time.
    await savePendingCart(cart)
    const [, value] = set.mock.calls[0]
    expect(value.consentToContact).toBe(true)
    expect(value.consentedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('reports false rather than throwing when Redis is absent', async () => {
    configured = false
    expect(await savePendingCart(cart)).toBe(false)
  })
})

describe('listDueCarts', () => {
  it('asks only for carts older than the cutoff', async () => {
    zrange.mockResolvedValue([])
    await listDueCarts(60 * 60 * 1000)
    const [key, min, max, opts] = zrange.mock.calls[0]
    expect(key).toBe('pending-carts')
    expect(min).toBe(0)
    expect(max).toBeLessThan(Date.now())
    expect(opts).toMatchObject({ byScore: true })
  })

  it('drops index entries whose cart has already expired', async () => {
    zrange.mockResolvedValue(['a@example.com', 'gone@example.com'])
    get.mockResolvedValueOnce({ email: 'a@example.com' }).mockResolvedValueOnce(null)
    const due = await listDueCarts(1000)
    expect(due).toHaveLength(1)
  })

  it('returns nothing when Redis is absent', async () => {
    configured = false
    expect(await listDueCarts(1000)).toEqual([])
  })
})

describe('markReminded', () => {
  it('removes the cart from the index, which is what prevents a second email', async () => {
    await markReminded('Amara@Example.com')
    expect(zrem).toHaveBeenCalledWith('pending-carts', 'amara@example.com')
  })

  it('leaves the cart itself in place for support to look at', async () => {
    await markReminded('a@example.com')
    expect(del).not.toHaveBeenCalled()
  })
})

describe('clearPendingCart', () => {
  it('removes both the cart and its index entry', async () => {
    await clearPendingCart('a@example.com')
    expect(del).toHaveBeenCalledWith('pending-cart:a@example.com')
    expect(zrem).toHaveBeenCalledWith('pending-carts', 'a@example.com')
  })
})

describe('pruneIndex', () => {
  it('clears index entries older than the cart TTL', async () => {
    zremrangebyscore.mockResolvedValue(3)
    expect(await pruneIndex()).toBe(3)
    const [key, min, max] = zremrangebyscore.mock.calls[0]
    expect(key).toBe('pending-carts')
    expect(min).toBe(0)
    expect(max).toBeLessThan(Date.now())
  })
})
