import type { Metadata } from 'next'
import CollectionPage from '@/components/shop/CollectionPage'
import { loadCategoryProducts } from '@/lib/loadCategory'
import { getServerRegion } from '@/lib/serverRegion'
import { HOME_DIFFUSERS } from '@/data/products'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Home Diffusers',
  description: 'Reed diffusers that slowly release fragrance into your space. Minimal design, maximum presence.',
  openGraph: {
    title: 'Home Diffusers · Impact Perfumes',
    description: 'Long-lasting reed diffusers in Impact signature fragrances.',
    images: [{ url: '/og-default.jpg', width: 1200, height: 630 }],
  },
}

export default async function HomeDiffusersPage() {
  const region = getServerRegion()
  const products = await loadCategoryProducts('home-diffusers', region, HOME_DIFFUSERS)
  return (
    <CollectionPage
      eyebrow="For the Home"
      title="Home Diffusers"
      subtitle="Reed diffusers that release fragrance slowly and evenly. Minimal design, maximum presence."
      products={products}
      variantLabel="100ml Reed Diffuser"
    />
  )
}
