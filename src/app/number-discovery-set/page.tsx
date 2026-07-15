import type { Metadata } from 'next'
import { Container } from '@/components/layout'
import { getServerRegion } from '@/lib/serverRegion'
import {
  getAllNumberSeriesProducts,
  getMedusaProduct,
  getPrice,
  toTileEnrichment,
} from '@/lib/medusa'
import DiscoverySetBuilder, { type PickItem } from '@/components/shop/DiscoverySetBuilder'

export const revalidate = 60

const REQUIRED = 8

export const metadata: Metadata = {
  title: 'Number Discovery Set',
  description: 'Build your own discovery set: choose any 8 from the Number Series as 2ml samples.',
  openGraph: {
    title: 'Number Discovery Set · Impact Perfumes',
    description: 'Pick any 8 from the Number Series and build your own discovery set.',
    images: [{ url: '/og-default.jpg', width: 1200, height: 630 }],
  },
}

export default async function NumberDiscoverySetPage() {
  const region = getServerRegion()
  const [products, setProduct] = await Promise.all([
    getAllNumberSeriesProducts(100, region.medusaRegionId),
    getMedusaProduct('number-discovery-set', region.medusaRegionId),
  ])

  const items: PickItem[] = products
    .map((p) => toTileEnrichment(p, region.currency))
    .filter((t): t is NonNullable<typeof t> => t !== null)
    .sort((a, b) => a.number - b.number)
    .map((t) => ({ number: t.number, descriptor: t.descriptor, color: t.signatureColor }))

  const variant = setProduct?.variants?.[0]
  const price = setProduct ? getPrice(setProduct, region.currency) : null
  const canBuild = Boolean(variant?.id && setProduct?.id && price && price.amount > 0 && items.length >= REQUIRED)

  return (
    <>
      {/* Hero */}
      <section className="border-b border-stone/20 bg-ink py-14 md:py-20">
        <Container>
          <p className="text-label uppercase tracking-[0.12em] text-accent">Discovery Set</p>
          <h1 className="mt-3 font-display text-display-l leading-none text-bone">
            Build Your Set.
          </h1>
          <p className="mt-4 max-w-lg text-body text-stone">
            Choose any {REQUIRED} from the Number Series as 2ml samples. The simplest
            way to find your scent, or gift the journey.
          </p>
        </Container>
      </section>

      {/* Builder */}
      <section className="bg-ink py-10 md:py-14">
        <Container>
          {canBuild && variant && setProduct && price ? (
            <DiscoverySetBuilder
              items={items}
              requiredCount={REQUIRED}
              setLine={{
                variantId: variant.id,
                productId: setProduct.id,
                priceMinor: price.amount,
                currency: price.currency,
                handle: 'number-discovery-set',
              }}
            />
          ) : (
            <p className="py-16 text-center text-stone">
              The discovery set builder is being prepared. Please check back shortly.
            </p>
          )}
        </Container>
      </section>
    </>
  )
}
