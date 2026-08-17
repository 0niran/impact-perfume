import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Script from 'next/script'
import { getMedusaProduct, getPrice, toEnrichment, getProductImage, variantInStock } from '@/lib/medusa'
import { getServerRegion } from '@/lib/serverRegion'
import { shippingCopyFor } from '@/lib/shippingCopy'
import { SITE_URL } from '@/lib/constants'
import { jsonLdScript } from '@/lib/jsonLd'
import ColorPanel from '@/components/pdp/ColorPanel'
import InfoRail from '@/components/pdp/InfoRail'
import ReviewsBlock from '@/components/pdp/ReviewsBlock'
import { RecentlyViewedTracker, RecentlyViewedRail } from '@/components/pdp/RecentlyViewed'

export const revalidate = 3600

export async function generateStaticParams() {
  return Array.from({ length: 50 }, (_, i) => ({ number: String(i + 1) }))
}

export async function generateMetadata({
  params,
}: {
  params: { number: string }
}): Promise<Metadata> {
  const num = parseInt(params.number, 10)
  const product = await getMedusaProduct(`oil-no-${num}`)
  const enrichment = product ? toEnrichment(product) : null

  if (!enrichment) return { title: `Oil No. ${num} · Impact Perfumes` }

  return {
    title: `Impact Oil No. ${num} | ${enrichment.descriptor}`,
    description:
      enrichment.tagline ??
      `Oil No. ${num} from Impact Perfumes. A ${enrichment.descriptor.toLowerCase()} concentrated fragrance oil, alcohol-free, in a 12ml roll-on.`,
    openGraph: {
      title: `Impact Oil No. ${num} | ${enrichment.descriptor}`,
      description: enrichment.tagline ?? `Oil No. ${num} · Impact Perfumes`,
      images: [{ url: '/og-default.jpg', width: 1200, height: 630 }],
    },
  }
}

export default async function OilPDPPage({
  params,
}: {
  params: { number: string }
}) {
  const num = parseInt(params.number, 10)
  if (isNaN(num) || num < 1 || num > 50) notFound()

  const region = getServerRegion()
  const product = await getMedusaProduct(`oil-no-${num}`, region.medusaRegionId)
  if (!product) notFound()

  const enrichment = toEnrichment(product, region.currency)
  if (!enrichment) notFound()

  const variant = product.variants?.[0]
  const price = getPrice(product, region.currency)
  const imageUrl = getProductImage(product)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `Impact Oil No. ${enrichment.number}`,
    description:
      enrichment.tagline ??
      `A ${enrichment.descriptor} concentrated fragrance oil from Impact Perfumes.`,
    url: `${SITE_URL}/oil/${enrichment.number}`,
    brand: { '@type': 'Brand', name: 'Impact Perfumes & Oils' },
    category: 'Fragrance Oil',
    ...(price.amount > 0 && {
      offers: {
        '@type': 'Offer',
        price: (price.amount / 100).toFixed(2),
        priceCurrency: price.currency,
        availability: 'https://schema.org/InStock',
        url: `${SITE_URL}/oil/${enrichment.number}`,
      },
    }),
  }

  return (
    <>
      <Script
        id={`json-ld-oil-${enrichment.number}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />
      <div className="lg:grid lg:grid-cols-2">
        <ColorPanel
          number={enrichment.number}
          descriptor={enrichment.descriptor}
          signatureColor={enrichment.signatureColor}
          signatureColorName={enrichment.signatureColorName}
          imageUrl={imageUrl}
          fallbackImage="/images/Oil_perfume.png"
          titlePrefix="Oil No."
        />

        <InfoRail
          number={enrichment.number}
          descriptor={enrichment.descriptor}
          signatureColor={enrichment.signatureColor}
          scentFamily={enrichment.scentFamily}
          tagline={enrichment.tagline}
          topNotes={enrichment.topNotes}
          heartNotes={enrichment.heartNotes}
          baseNotes={enrichment.baseNotes}
          longevity={enrichment.longevity}
          sillage={enrichment.sillage}
          productId={product.id}
          variantId={variant?.id ?? product.handle}
          priceKobo={price.amount}
          currency={price.currency}
          imageUrl={imageUrl ?? '/images/Oil_perfume.png'}
          shippingCopy={shippingCopyFor(region)}
          collectionLabel="Perfume Oils"
          collectionHref="/oils"
          titlePrefix="Impact Oil No."
          variantLabel="12ml · Concentrated Oil"
          prevHref={(n) => `/oil/${n}`}
          nextHref={(n) => `/oil/${n}`}
          maxNumber={50}
          handle={`oil-no-${enrichment.number}`}
          href={`/oil/${enrichment.number}`}
          inStock={variantInStock(variant)}
        />
      </div>

      {/* Oil-specific layering note */}
      <section className="border-t border-stone/20 bg-mist/40 py-10">
        <div className="container-px mx-auto max-w-container">
          <p className="text-label uppercase tracking-[0.1em] text-accent">Layering Tip</p>
          <p className="mt-2 max-w-2xl text-body text-bone">
            Apply Oil No. {enrichment.number} to pulse points before your Eau de
            Parfum from the Number Series for a deeper, longer-wearing signature.
            Pure concentration, no alcohol, perfect for travel and dry skin.
          </p>
        </div>
      </section>

      <RecentlyViewedTracker
        handle={`oil-no-${enrichment.number}`}
        href={`/oil/${enrichment.number}`}
        title={`Impact Oil No. ${enrichment.number}`}
        subtitle={enrichment.descriptor}
        imageUrl={imageUrl ?? undefined}
        signatureColor={enrichment.signatureColor}
      />
      <ReviewsBlock productHandle={`oil-no-${enrichment.number}`} productName={`Impact Oil No. ${enrichment.number}`} />
      <RecentlyViewedRail excludeHandle={`oil-no-${enrichment.number}`} />
    </>
  )
}
