import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Container, Section } from '@/components/layout'
import { getSignatureProducts, getPrice, getProductImage } from '@/lib/medusa'
import { getServerRegion } from '@/lib/serverRegion'
import { formatPrice } from '@/lib/format'
import { SITE_CONFIG } from '@/lib/config'
import SignatureAddToCart from '@/components/signature/SignatureAddToCart'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Signature Collection',
  description:
    'Named, not numbered. Our Signature fragrances are composed for those who know exactly who they are.',
  openGraph: {
    title: 'Signature Collection · Impact Perfumes',
    description: 'Named, not numbered. Composed for character.',
    images: [{ url: '/og-default.jpg', width: 1200, height: 630 }],
  },
}

export default async function SignaturePage() {
  const region = getServerRegion()
  const products = await getSignatureProducts(region.medusaRegionId)

  return (
    <>
      {/* Hero */}
      <section className="border-b border-stone/20 bg-ink py-16 md:py-24">
        <Container>
          <p className="text-label uppercase tracking-[0.12em] text-accent">
            Signature Collection
          </p>
          <h1 className="mt-3 max-w-2xl font-display text-display-l leading-none">
            Named, Not
            <br />
            Numbered.
          </h1>
          <p className="mt-5 max-w-lg text-body text-stone">
            Named compositions. Bolder. More personal. For those who already
            know who they are.
          </p>
        </Container>
      </section>

      {/* Product grid */}
      <Section id="collection" className="bg-ink">
        <Container>
          {products.length === 0 ? (
            <div className="py-24 text-center">
              <p className="font-display text-h2 text-stone">Coming soon.</p>
              <p className="mt-3 text-body text-stone/70">
                Our Signature range is being composed. Check back shortly.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-px bg-stone/20 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => {
                const imageUrl = getProductImage(product)
                const priceInfo = getPrice(product, region.currency)
                const variant = product.variants?.[0]
                const variantId = variant?.id ?? product.handle ?? product.id

                return (
                  <div
                    key={product.id}
                    className="group relative flex flex-col overflow-hidden bg-ink"
                  >
                    {/* Clickable image panel */}
                    <Link
                      href={`/signature/${product.handle}`}
                      className="relative overflow-hidden bg-ink block"
                      style={{ aspectRatio: '3/4' }}
                    >
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={product.title}
                          fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <p className="font-brand text-[64px] leading-none text-stone/40">
                            {product.title.charAt(0)}
                          </p>
                        </div>
                      )}
                    </Link>

                    {/* Info */}
                    <div className="flex flex-1 flex-col p-6 border-t border-stone/20">
                      {product.subtitle && (
                        <p className="text-label uppercase tracking-[0.1em] text-stone">
                          {product.subtitle}
                        </p>
                      )}
                      <Link href={`/signature/${product.handle}`}>
                        <h3 className="mt-1 font-brand text-[22px] leading-snug text-bone hover:text-accent transition-colors">
                          {product.title}
                        </h3>
                      </Link>

                      <div className="mt-auto pt-5 flex items-center justify-between gap-4">
                        <span className="text-body font-medium text-bone">
                          {priceInfo.amount > 0
                            ? formatPrice(priceInfo.amount, priceInfo.currency)
                            : 'Coming soon'}
                        </span>
                        {priceInfo.amount > 0 && (
                          <SignatureAddToCart
                            productId={product.id}
                            variantId={variantId}
                            productName={product.title}
                            priceKobo={priceInfo.amount}
                            currency={priceInfo.currency}
                            imageUrl={imageUrl ?? undefined}
                            className="px-5 shrink-0"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Container>
      </Section>

      {/* CTA */}
      <section className="border-t border-stone/20 bg-ink py-16 text-bone">
        <Container className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-label uppercase tracking-[0.1em] text-stone">
              {SITE_CONFIG.shortName}
            </p>
            <h2 className="mt-2 font-display text-h1 max-w-md">
              Looking for something more personal? We compose bespoke.
            </h2>
          </div>
          <Link
            href="/b2b"
            className="shrink-0 inline-flex items-center justify-center border border-bone/30 px-8 text-label uppercase tracking-[0.1em] text-bone hover:border-accent hover:text-accent transition-colors"
            style={{ height: 48 }}
          >
            Enquire
          </Link>
        </Container>
      </section>
    </>
  )
}
