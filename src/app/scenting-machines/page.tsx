import type { Metadata } from 'next'
import { DEFAULT_OG_IMAGES } from '@/lib/seo'
import CollectionPage from '@/components/shop/CollectionPage'
import { loadCategoryProducts } from '@/lib/loadCategory'
import { getServerRegion } from '@/lib/serverRegion'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Scenting Machines',
  description: 'Cold-air diffusion machines for hotels, offices, and large spaces. Consistent fragrance, all day.',
  openGraph: {
    images: DEFAULT_OG_IMAGES,
    title: 'Scenting Machines · Impact Perfumes',
    description: 'Professional cold-air scenting machines for large spaces.',
  },
}

export default async function ScentingMachinesPage() {
  const region = await getServerRegion()
  const products = await loadCategoryProducts('scenting-machines', region)
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
