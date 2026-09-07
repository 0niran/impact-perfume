import type { Metadata } from 'next'
import CollectionPage from '@/components/shop/CollectionPage'
import { loadCategoryProducts } from '@/lib/loadCategory'
import { getServerRegion } from '@/lib/serverRegion'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Car Diffusers',
  description: 'Vent-mounted clip-on diffusers. Up to 60 days per refill.',
  openGraph: {
    title: 'Car Diffusers · Impact Perfumes',
    description: 'Vent-mounted car diffusers in Impact signature fragrances.',
  },
}

export default async function CarDiffusersPage() {
  const region = getServerRegion()
  const products = await loadCategoryProducts('car-diffusers', region)
  return (
    <CollectionPage
      eyebrow="On the Move"
      title="Car Diffusers"
      subtitle="Vent-mounted clip-on diffusers. Up to 60 days of fragrance per refill."
      products={products}
      variantLabel="Car Diffuser"
    />
  )
}
