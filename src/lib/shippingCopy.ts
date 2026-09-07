import { formatPrice } from './format'
import { type Region } from './region'

/**
 * Region-aware Shipping & Returns copy shown on the PDP accordion.
 * Reads the region's free-delivery threshold and currency so the number
 * matches what the customer sees in the cart and header.
 */
export function shippingCopyFor(region: Region): string {
  const threshold = formatPrice(region.freeDeliveryThresholdMinor, region.currency)
  if (region.id === 'NG') {
    return `Free delivery on orders over ${threshold}. Standard delivery 3–5 business days within the city; 5–10 days nationwide. Returns accepted within 7 days of delivery on unopened, sealed products. Contact us to initiate a return.`
  }
  if (region.id === 'CA') {
    // Canada has no carrier service to promise: it is free collection in
    // Brantford, or shipping priced per order and quoted before payment. The
    // previous copy advertised free Canada-wide delivery over a threshold and a
    // 5–10 day transit time, neither of which we can honour.
    return `Collect free from our Brantford, Ontario location, or ask us to ship: Canadian delivery is priced per order by weight and destination, and we email you the cost before any payment is taken. Returns accepted within 7 days of delivery on unopened, sealed products. Contact us to initiate a return.`
  }
  return `Free delivery on orders over ${threshold}. Returns accepted within 7 days of delivery on unopened, sealed products.`
}
