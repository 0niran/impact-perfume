import type { TileEnrichment } from '@/types'
import { getAllNumberSeriesProducts, toTileEnrichment } from '@/lib/medusa'
import { FALLBACK_COLOR } from '@/lib/constants'

const FALLBACK: TileEnrichment[] = Array.from({ length: 50 }, (_, i) => ({
  productHandle: `no-${i + 1}`,
  number: i + 1,
  descriptor: 'Coming soon',
  signatureColor: FALLBACK_COLOR,
}))

export async function getAllEnrichments(
  regionId?: string,
  currency: string = 'NGN'
): Promise<TileEnrichment[]> {
  try {
    const products = await getAllNumberSeriesProducts(100, regionId)
    const tiles = products
      .map((p) => toTileEnrichment(p, currency))
      .filter((t): t is TileEnrichment => t !== null)
      .sort((a, b) => a.number - b.number)

    // Only fall back to placeholders if Medusa returned nothing at all
    return tiles.length ? tiles : FALLBACK
  } catch {
    return FALLBACK
  }
}
