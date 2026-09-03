import { getProductsByCategory, toCategoryProduct, type CategoryProduct } from '@/lib/medusa'
import type { StaticProduct } from '@/data/products'

/**
 * Load a category's products for a collection page. Prefers live Medusa
 * products; falls back to static placeholder entries (no image / no price, so
 * the tile renders the styled placeholder and no add-to-cart) so a page that
 * isn't seeded in Medusa yet still looks complete.
 */
export async function loadCategoryProducts(
  medusaHandle: string,
  region: { medusaRegionId?: string; currency: string },
  staticFallback?: StaticProduct[]
): Promise<CategoryProduct[]> {
  const live = await getProductsByCategory(medusaHandle, 100, region.medusaRegionId)
  if (live.length > 0) return live.map((p) => toCategoryProduct(p, region.currency))
  if (staticFallback && staticFallback.length > 0) {
    return staticFallback.map((s) => ({
      handle: s.handle,
      title: s.title,
      descriptor: s.descriptor,
      signatureColor: s.signatureColor,
      tagline: s.tagline,
      priceMinor: 0,
      currency: region.currency,
      imageUrl: null,
      productId: s.handle,
      variantId: s.handle,
    }))
  }
  return []
}
