import type { Metadata } from 'next'
import CollectionPage from '@/components/shop/CollectionPage'
import { loadCategoryProducts } from '@/lib/loadCategory'
import { getServerRegion } from '@/lib/serverRegion'
import { SCENTING_MACHINES } from '@/data/products'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Scenting Machines',
  description: 'Cold-air diffusion machines for hotels, offices, and large spaces. Consistent fragrance, all day.',
  openGraph: {
    title: 'Scenting Machines · Impact Perfumes',
    description: 'Professional cold-air scenting machines for large spaces.',
    images: [{ url: '/og-default.jpg', width: 1200, height: 630 }],
  },
}

export default async function ScentingMachinesPage() {
  const region = getServerRegion()
  const products = await loadCategoryProducts('scenting-machines', region, SCENTING_MACHINES)
  return (
    <CollectionPage
      eyebrow="Always On"
      title="Scenting Machines"
      subtitle="Cold-air diffusion machines for hotels, offices, and large spaces. Consistent fragrance, all day."
      products={products}
      variantLabel="Scenting Machine"
    />
  )
}
