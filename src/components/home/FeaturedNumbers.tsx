import Link from 'next/link'
import Image from 'next/image'
import Container from '@/components/layout/Container'
import FeaturedNumberAddToCart from './FeaturedNumberAddToCart'
import { getAllNumberSeriesProducts, toEnrichment, getNGNPrice, getProductImage } from '@/lib/medusa'
import { formatNaira } from '@/lib/format'
import { FALLBACK_COLOR } from '@/lib/constants'

const BOTTLE_FALLBACK = '/images/no-series-bottle.png'

export default async function FeaturedNumbers() {
  const raw = await getAllNumberSeriesProducts(4)

  const products = raw
    .map((p) => {
      const enrichment = toEnrichment(p)
      if (!enrichment) return null
      const variant = p.variants?.[0]
      return {
        productId: p.id,
        variantId: variant?.id ?? p.handle ?? '',
        number: enrichment.number,
        descriptor: enrichment.descriptor,
        signatureColor: enrichment.signatureColor ?? FALLBACK_COLOR,
        tagline: enrichment.tagline,
        priceKobo: getNGNPrice(p),
        imageUrl: getProductImage(p),
      }
    })
    .filter(Boolean)
    .slice(0, 4)

  if (products.length === 0) return null

  return (
    <section className="border-t border-stone/20 bg-mist py-20 md:py-24">
      <Container>
        {/* Section header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-label uppercase tracking-[0.12em] text-stone mb-2">
              The Number Series
            </p>
            <h2 className="font-display text-h1 md:text-display-s leading-none text-bone">
              Find your number.
            </h2>
          </div>
          <Link
            href="/shop"
            className="hidden md:inline-flex items-center border border-stone/30 px-6 text-label uppercase tracking-[0.08em] text-bone/70 hover:border-bone hover:text-bone transition-colors duration-200 shrink-0"
            style={{ height: 40 }}
          >
            View all 50
          </Link>
        </div>

        {/* Product grid */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {products.map((product) => {
            if (!product) return null
            return (
              <Link
                key={product.number}
                href={`/no/${product.number}`}
                className="group flex flex-col"
              >
                {/* Colour swatch with bottle */}
                <div
                  className="relative flex items-center justify-center overflow-hidden"
                  style={{
                    backgroundColor: product.signatureColor,
                    aspectRatio: '3 / 4',
                  }}
                >
                  {/* Number watermark */}
                  <span
                    className="pointer-events-none absolute select-none font-display text-[30vw] leading-none text-white/10 lg:text-[10vw] transition-opacity duration-300 group-hover:text-white/[0.06]"
                    aria-hidden="true"
                  >
                    {product.number}
                  </span>

                  {/* Bottle image */}
                  <div className="relative z-10 w-[65%] h-[75%]">
                    <Image
                      src={product.imageUrl ?? BOTTLE_FALLBACK}
                      alt={`Impact No. ${product.number}`}
                      fill
                      sizes="(min-width: 1024px) 20vw, 45vw"
                      className="object-contain drop-shadow-xl transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                </div>

                {/* Info */}
                <div className="flex flex-col pt-4 pb-1">
                  <p className="text-label uppercase tracking-[0.08em] text-stone">
                    No. {product.number}
                  </p>
                  <p className="font-display text-h3 leading-none text-bone mt-1">
                    {product.descriptor}
                  </p>
                  {product.tagline && (
                    <p className="text-small text-slate mt-1 line-clamp-1">
                      {product.tagline}
                    </p>
                  )}
                  <p className="text-small text-accent mt-2">
                    {product.priceKobo > 0
                      ? formatNaira(product.priceKobo)
                      : 'Price on request'}
                  </p>

                  <FeaturedNumberAddToCart
                    productId={product.productId}
                    variantId={product.variantId}
                    productName={`Impact No. ${product.number}`}
                    priceKobo={product.priceKobo}
                    signatureColor={product.signatureColor}
                  />
                </div>
              </Link>
            )
          })}
        </div>

        {/* Mobile "View all" CTA */}
        <div className="mt-10 flex justify-center md:hidden">
          <Link
            href="/shop"
            className="inline-flex items-center border border-stone/30 px-8 text-label uppercase tracking-[0.08em] text-bone/70 hover:border-bone hover:text-bone transition-colors duration-200"
            style={{ height: 44 }}
          >
            View all 50
          </Link>
        </div>
      </Container>
    </section>
  )
}
