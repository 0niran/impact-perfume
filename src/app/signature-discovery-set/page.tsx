import type { Metadata } from 'next'
import Image from 'next/image'
import { Container } from '@/components/layout'
import { getServerRegion } from '@/lib/serverRegion'
import { getSignatureProducts, getMedusaProduct, getPrice } from '@/lib/medusa'
import { SIGNATURE_PLACEHOLDERS } from '@/data/products'
import { formatPrice } from '@/lib/format'
import AddDiscoverySetButton from '@/components/shop/AddDiscoverySetButton'

export const revalidate = 60

const BOX_IMAGE = '/images/Signature Discovery Set 2.png'

export const metadata: Metadata = {
  title: 'Signature Discovery Set',
  description: 'A signature box of our Signature Scents in sample vials. Named, not numbered.',
  openGraph: {
    title: 'Signature Discovery Set · Impact Perfumes',
    description: 'A curated box of Impact Signature Scents in sample vials.',
    images: [{ url: '/og-default.jpg', width: 1200, height: 630 }],
  },
}

export default async function SignatureDiscoverySetPage() {
  const region = getServerRegion()
  const [sigProducts, setProduct] = await Promise.all([
    getSignatureProducts(region.medusaRegionId),
    getMedusaProduct('signature-discovery-set', region.medusaRegionId),
  ])

  const contents =
    sigProducts.length > 0
      ? sigProducts.map((p) => p.title)
      : SIGNATURE_PLACEHOLDERS.map((s) => s.title)

  const variant = setProduct?.variants?.[0]
  const price = setProduct ? getPrice(setProduct, region.currency) : null
  const canBuy = Boolean(variant?.id && setProduct?.id && price && price.amount > 0)

  return (
    <section className="bg-ink py-14 md:py-20">
      <Container>
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          {/* Box */}
          <div className="relative aspect-square overflow-hidden border border-stone/15 bg-ink">
            <Image
              src={BOX_IMAGE}
              alt="Impact Signature Discovery Set box"
              fill
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover"
              priority
            />
          </div>

          {/* Buy box */}
          <div>
            <p className="text-label uppercase tracking-[0.12em] text-accent">Discovery Set</p>
            <h1 className="mt-3 font-display text-display-l leading-none text-bone">
              Signature Discovery.
            </h1>
            <p className="mt-4 max-w-lg text-body text-stone">
              A signature box of our Signature Scents in sample vials. Named, not
              numbered. Bolder compositions, ready to explore, and beautifully boxed to gift.
            </p>

            {canBuy && price && variant && setProduct ? (
              <>
                <p className="mt-6 font-display text-h1 text-bone">
                  {formatPrice(price.amount, price.currency)}
                </p>
                <div className="mt-6">
                  <AddDiscoverySetButton
                    variantId={variant.id}
                    productId={setProduct.id}
                    name="Signature Discovery Set"
                    variantLabel="Signature sample box"
                    priceMinor={price.amount}
                    currency={price.currency}
                    handle="signature-discovery-set"
                    href="/signature-discovery-set"
                  />
                </div>
                <p className="mt-3 text-small text-stone">Ships in signature packaging.</p>
              </>
            ) : (
              <p className="mt-6 text-body text-stone">Coming soon.</p>
            )}

            {contents.length > 0 && (
              <div className="mt-8 border-t border-stone/15 pt-6">
                <p className="text-label uppercase tracking-[0.1em] text-stone">Inside the box</p>
                <p className="mt-2 text-body text-bone/80">{contents.join(' · ')}</p>
              </div>
            )}
          </div>
        </div>
      </Container>
    </section>
  )
}
