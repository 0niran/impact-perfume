import type { Metadata } from 'next'
import CollectionPage from '@/components/shop/CollectionPage'
import { loadCategoryProducts } from '@/lib/loadCategory'
import { getServerRegion } from '@/lib/serverRegion'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Scent Candles',
  description: 'Hand-poured candles in our signature fragrances. Burn time up to 50 hours.',
  openGraph: {
    title: 'Scent Candles · Impact Perfumes',
    description: 'Hand-poured soy candles in Impact signature fragrances.',
    images: [{ url: '/og-default.jpg', width: 1200, height: 630 }],
  },
}

export default async function ScentCandlesPage() {
  const region = getServerRegion()
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
