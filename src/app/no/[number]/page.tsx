import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getMedusaProduct, getPrice, toEnrichment, getProductImage, variantInStock } from '@/lib/medusa'
import { getServerRegion } from '@/lib/serverRegion'
import { shippingCopyFor } from '@/lib/shippingCopy'
import { jsonLdScript, buildProductJsonLd, buildBreadcrumbJsonLd } from '@/lib/jsonLd'
import ColorPanel from '@/components/pdp/ColorPanel'
import InfoRail from '@/components/pdp/InfoRail'
import RelatedProducts from '@/components/pdp/RelatedProducts'
import ReviewsBlock from '@/components/pdp/ReviewsBlock'
import { RecentlyViewedTracker, RecentlyViewedRail } from '@/components/pdp/RecentlyViewed'

export const revalidate = 3600

export async function generateStaticParams() {
  return Array.from({ length: 100 }, (_, i) => ({ number: String(i + 1) }))
}

export async function generateMetadata({
  params,
}: {
  params: { number: string }
}): Promise<Metadata> {
  const num = parseInt(params.number, 10)
  const product = await getMedusaProduct(`no-${num}`)
  const enrichment = product ? toEnrichment(product) : null

  if (!enrichment) return { title: `No. ${num} · Impact Perfumes` }

  return {
    title: `Impact No. ${num} | ${enrichment.descriptor}`,
    description:
      enrichment.tagline ??
      `No. ${num} from the Impact Number Series. A ${enrichment.descriptor.toLowerCase()} Eau de Parfum.`,
    // The page is one product at one URL. Declaring it stops any query-string
    // variant (a campaign tag, a referrer param) being treated as a separate
    // page competing with this one.
    alternates: { canonical: `/no/${num}` },
    openGraph: {
      title: `Impact No. ${num} | ${enrichment.descriptor}`,
      description: enrichment.tagline ?? `No. ${num} · Impact Perfumes`,
    },
  }
}

export default async function PDPPage({
  params,
}: {
  params: { number: string }
}) {
  const num = parseInt(params.number, 10)

  if (isNaN(num) || num < 1 || num > 100) notFound()

  const region = getServerRegion()
  const product = await getMedusaProduct(`no-${num}`, region.medusaRegionId)

  if (!product) notFound()

  const enrichment = toEnrichment(product, region.currency)

  if (!enrichment) notFound()

  const variant = product.variants?.[0]
  const price = getPrice(product, region.currency)
  const imageUrl = getProductImage(product)

  const jsonLd = buildProductJsonLd({
    name: `Impact No. ${enrichment.number}`,
    description:
      enrichment.tagline ??
      `A ${enrichment.descriptor} Eau de Parfum from the Impact Number Series.`,
    path: `/no/${enrichment.number}`,
    category: 'Fragrance',
    imageUrl,
    sku: variant?.sku,
    priceMinor: price.amount,
    currency: price.currency,
    inStock: variantInStock(variant),
  })

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Number Series', path: '/no-series' },
    { name: `No. ${enrichment.number}`, path: `/no/${enrichment.number}` },
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd) }}
      />
      <div className="lg:grid lg:grid-cols-2">
        <ColorPanel
          number={enrichment.number}
          descriptor={enrichment.descriptor}
          signatureColor={enrichment.signatureColor}
          signatureColorName={enrichment.signatureColorName}
          imageUrl={imageUrl}
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
          priceMinor={price.amount}
          currency={price.currency}
          imageUrl={imageUrl ?? '/images/no_series.png'}
          shippingCopy={shippingCopyFor(region)}
          handle={`no-${enrichment.number}`}
          href={`/no/${enrichment.number}`}
          inStock={variantInStock(variant)}
        />
      </div>

      <RecentlyViewedTracker
        handle={`no-${enrichment.number}`}
        href={`/no/${enrichment.number}`}
        title={`Impact No. ${enrichment.number}`}
        subtitle={enrichment.descriptor}
        imageUrl={imageUrl ?? undefined}
        signatureColor={enrichment.signatureColor}
      />
      <ReviewsBlock productHandle={`no-${enrichment.number}`} productName={`Impact No. ${enrichment.number}`} />
      <RelatedProducts currentNumber={enrichment.number} />
      <RecentlyViewedRail excludeHandle={`no-${enrichment.number}`} />
    </>
  )
}
