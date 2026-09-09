import { getProductsByCategory, toCategoryProduct, type CategoryProduct } from '@/lib/medusa'

/**
 * Load a category's products for a collection page.
 *
 * This used to accept a static fallback array for categories not yet seeded in
 * Medusa. Every category is seeded now, no caller ever passed one, and the
 * branch could not be reached — so a page with no products returns none and
 * says so, rather than quietly rendering placeholders that cannot be bought.
 */
export async function loadCategoryProducts(
  medusaHandle: string,
  region: { medusaRegionId?: string; currency: string }
): Promise<CategoryProduct[]> {
  const live = await getProductsByCategory(medusaHandle, 100, region.medusaRegionId)
  if (live.length > 0) return live.map((p) => toCategoryProduct(p, region.currency))
  return []
}
