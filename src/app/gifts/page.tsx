import type { Metadata } from 'next'
import CollectionPage from '@/components/shop/CollectionPage'
import { loadCategoryProducts } from '@/lib/loadCategory'
import { getServerRegion } from '@/lib/serverRegion'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Gift Sets',
  description: 'Curated fragrance gift boxes in signature packaging, ready to give.',
  openGraph: {
    title: 'Gift Sets · Impact Perfumes',
    description: 'Curated fragrance gift boxes, ready to give.',
  },
}

export default async function GiftsPage() {
  const region = getServerRegion()
  const products = await loadCategoryProducts('gifts', region)
  return (
    <CollectionPage
      eyebrow="Gifts"
      title="Gift Sets"
      subtitle="Curated fragrance boxes in signature packaging, ready to give."
      products={products}
      variantLabel="Gift Set"
    />
  )
}
