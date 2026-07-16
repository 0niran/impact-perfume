import type { Metadata } from 'next'
import Image from 'next/image'
import { Container } from '@/components/layout'
import { getServerRegion } from '@/lib/serverRegion'
import {
  getAllNumberSeriesProducts,
  getMedusaProduct,
  getPrice,
  toTileEnrichment,
} from '@/lib/medusa'
import { formatPrice } from '@/lib/format'
import DiscoverySetBuilder, { type PickItem } from '@/components/shop/DiscoverySetBuilder'

export const revalidate = 60

const REQUIRED = 8
const BOX_IMAGE = '/images/No Series Discovery Set.jpeg'

export const metadata: Metadata = {
  title: 'Number Discovery Set',
  description: 'Build your own discovery set: choose 8 from the Number Series as 2ml vials in our signature box.',
  openGraph: {
    title: 'Number Discovery Set · Impact Perfumes',
    description: 'Pick 8 from the Number Series and fill your own discovery box.',
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
    .map((t) => ({
      number: t.number,
      descriptor: t.descriptor,
      color: t.signatureColor,
      imageUrl: t.imageUrl,
      notes:
        [t.topNotes?.[0], t.heartNotes?.[0], t.baseNotes?.[0]].filter(Boolean).join(' · ') ||
        t.scentFamily,
    }))

  const variant = setProduct?.variants?.[0]
  const price = setProduct ? getPrice(setProduct, region.currency) : null
  const canBuild = Boolean(variant?.id && setProduct?.id && price && price.amount > 0 && items.length >= REQUIRED)

  return (
    <>
      {/* Hero — the box + how it works */}
      <section className="border-b border-stone/20 bg-ink py-14 md:py-20">
        <Container>
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-label uppercase tracking-[0.12em] text-accent">Discovery Set</p>
              <h1 className="mt-3 font-display text-display-l leading-none text-bone">
                Build Your Set.
              </h1>
              <p className="mt-4 max-w-lg text-body text-stone">
                Choose {REQUIRED} from the Number Series as 2ml vials, presented in our
                signature box. The simplest way to find your scent, or gift the journey.
              </p>
              {price && price.amount > 0 && (
                <p className="mt-5 font-display text-h1 text-bone">
                  {formatPrice(price.amount, price.currency)}
                  <span className="ml-2 align-middle text-small text-stone">· {REQUIRED} × 2ml</span>
                </p>
              )}
            </div>
            <div className="relative aspect-[16/10] overflow-hidden border border-stone/15 bg-ink">
              <Image
                src={BOX_IMAGE}
                alt="Impact Number Discovery Set box"
                fill
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover"
                priority
              />
            </div>
          </div>
        </Container>
      </section>

      {/* Builder */}
      <section className="bg-ink py-10 md:py-14">
        <Container>
          <div className="mb-6">
            <p className="text-label uppercase tracking-[0.1em] text-accent">Fill the box</p>
            <h2 className="mt-2 font-display text-h1 text-bone">Choose your {REQUIRED} numbers</h2>
          </div>
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
