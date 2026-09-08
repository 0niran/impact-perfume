import type { Metadata } from 'next'
import { DEFAULT_OG_IMAGES } from '@/lib/seo'
import CollectionPage from '@/components/shop/CollectionPage'
import { loadCategoryProducts } from '@/lib/loadCategory'
import { getServerRegion } from '@/lib/serverRegion'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Scent Candles',
  description: 'Hand-poured candles in our signature fragrances. Burn time up to 50 hours.',
  openGraph: {
    images: DEFAULT_OG_IMAGES,
    title: 'Scent Candles · Impact Perfumes',
    description: 'Hand-poured soy candles in Impact signature fragrances.',
  },
}

export default async function ScentCandlesPage() {
  const region = await getServerRegion()
  const products = await loadCategoryProducts('scent-candles', region)
  return (
    <CollectionPage
      eyebrow="Light & Linger"
      title="Scent Candles"
      subtitle="Hand-poured soy candles in our signature fragrances. Burn time up to 50 hours."
      products={products}
      variantLabel="220g Soy Candle"
    />
  )
}
