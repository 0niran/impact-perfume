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
    return `Free delivery across Canada on orders over ${threshold}. Standard shipping 5–10 business days. Returns accepted within 7 days of delivery on unopened, sealed products. Contact us to initiate a return.`
  }
  return `Free delivery on orders over ${threshold}. Returns accepted within 7 days of delivery on unopened, sealed products.`
}
