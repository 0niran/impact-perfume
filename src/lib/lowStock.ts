/**
 * Low-stock detection for the just-placed order. After an order is created the
 * purchased variants' stock drops; this reports any (variant, location) whose
 * available quantity (stocked − reserved) has fallen below the threshold, so the
 * fulfilment path can email the business inbox to restock.
 *
 * Medusa v2 has no "inventory by variant id" list filter, but the order's items
 * carry product_id, and the product-scoped variants endpoint exposes the nested
 * inventory levels — so we resolve product → variants → location levels.
 */
import type { AlertItem } from '@/lib/email'

export const LOW_STOCK_THRESHOLD = 5

interface LocationLevel {
  stocked_quantity?: number
  reserved_quantity?: number
  location_id?: string
}
interface InventoryItem {
  inventory?: { location_levels?: LocationLevel[] }
}
interface Variant {
  id: string
  title?: string
  sku?: string
  inventory_items?: InventoryItem[]
}
interface OrderItem {
  variant_id?: string
  product_id?: string
}

const VARIANT_INV_FIELDS = [
  'title',
  'variants.id',
  'variants.title',
  'variants.sku',
  'variants.inventory_items.inventory.location_levels.stocked_quantity',
  'variants.inventory_items.inventory.location_levels.reserved_quantity',
  'variants.inventory_items.inventory.location_levels.location_id',
].join(',')

export async function findLowStockAfterOrder(opts: {
  backendUrl: string
  token: string
  orderId: string
  threshold?: number
}): Promise<AlertItem[]> {
  const { backendUrl, token, orderId } = opts
  const threshold = opts.threshold ?? LOW_STOCK_THRESHOLD
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const orderRes = await fetch(
    `${backendUrl}/admin/orders/${orderId}?fields=display_id,items.variant_id,items.product_id`,
    { headers }
  )
  if (!orderRes.ok) return []
  const order = (await orderRes.json()).order as { display_id?: number; items?: OrderItem[] }
  const items = order?.items ?? []
  const orderedVariantIds = new Set(items.map((i) => i.variant_id).filter(Boolean))
  const productIds = [...new Set(items.map((i) => i.product_id).filter(Boolean))] as string[]
  if (productIds.length === 0) return []

  // location id -> name (cosmetic; falls back to the id if unavailable)
  const locNames = new Map<string, string>()
  try {
    const locRes = await fetch(`${backendUrl}/admin/stock-locations?limit=100&fields=id,name`, { headers })
    if (locRes.ok) {
      for (const l of ((await locRes.json()).stock_locations ?? []) as { id: string; name?: string }[]) {
        if (l.name) locNames.set(l.id, l.name)
      }
    }
  } catch {
    /* names are cosmetic */
  }

  const alerts: AlertItem[] = []
  for (const pid of productIds) {
    const pr = await fetch(
      `${backendUrl}/admin/products/${pid}?fields=${encodeURIComponent(VARIANT_INV_FIELDS)}`,
      { headers }
    )
    if (!pr.ok) continue
    const product = (await pr.json()).product as { title?: string; variants?: Variant[] }
    for (const v of product.variants ?? []) {
      if (!orderedVariantIds.has(v.id)) continue

      // available per location = stocked − reserved (a variant usually maps to
      // a single inventory item, but sum defensively across items per location).
      const byLocation = new Map<string, number>()
      let tracked = false
      for (const ii of v.inventory_items ?? []) {
        for (const lvl of ii.inventory?.location_levels ?? []) {
          tracked = true
          const key = lvl.location_id ?? 'unknown'
          const avail = (lvl.stocked_quantity ?? 0) - (lvl.reserved_quantity ?? 0)
          byLocation.set(key, (byLocation.get(key) ?? 0) + avail)
        }
      }
      if (!tracked) continue

      for (const [locId, avail] of byLocation) {
        if (avail < threshold) {
          const name =
            v.title && v.title !== product.title
              ? `${product.title} — ${v.title}`
              : product.title ?? 'Product'
          alerts.push({
            title: name,
            lines: [
              `Only ${avail} left at ${locNames.get(locId) ?? locId}`,
              v.sku ? `SKU: ${v.sku}` : '',
              order.display_id ? `Triggered by order #${order.display_id}` : '',
            ].filter(Boolean),
          })
        }
      }
    }
  }
  return alerts
}
