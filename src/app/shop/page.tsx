import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getAllEnrichments } from '@/sanity/queries/shop'
import CollectionHero from '@/components/shop/CollectionHero'
import ShopClient from '@/components/shop/ShopClient'
import DiscoveryNudge from '@/components/shop/DiscoveryNudge'

export const metadata: Metadata = {
  title: 'The Number Series',
  description:
    '50 numbered EDPs. Each fragrance in the Impact Number Series tells a different story — find yours.',
  openGraph: {
    title: 'The Number Series · Impact Perfumes',
    description: '50 unique fragrances. One house.',
    images: [{ url: '/og-shop.jpg', width: 1200, height: 630 }],
  },
}

function WallSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: 20 }, (_, i) => (
        <div
          key={i}
          className="animate-pulse bg-stone/20"
          style={{ aspectRatio: '1 / 1' }}
        />
      ))}
    </div>
  )
}

export default async function ShopPage() {
  const enrichments = await getAllEnrichments()

  return (
    <>
      <CollectionHero />

      <Suspense fallback={<WallSkeleton />}>
        <ShopClient enrichments={enrichments} />
      </Suspense>

      <DiscoveryNudge />
    </>
  )
}
