import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Script from 'next/script'
import { getMedusaProduct, getNGNPrice, toEnrichment, getProductImage } from '@/lib/medusa'
import { SITE_URL } from '@/lib/constants'
import ColorPanel from '@/components/pdp/ColorPanel'
import InfoRail from '@/components/pdp/InfoRail'
import RelatedProducts from '@/components/pdp/RelatedProducts'

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
      `No. ${num} from the Impact Number Series. A ${enrichment.descriptor.toLowerCase()} Eau de Parfum, crafted in Lagos.`,
    openGraph: {
      title: `Impact No. ${num} | ${enrichment.descriptor}`,
      description: enrichment.tagline ?? `No. ${num} · Impact Perfumes`,
      images: [{ url: '/og-default.jpg', width: 1200, height: 630 }],
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

  const product = await getMedusaProduct(`no-${num}`)

  if (!product) notFound()

  const enrichment = toEnrichment(product)

  if (!enrichment) notFound()

  const variant = product.variants?.[0]
  const priceKobo = getNGNPrice(product)
  const imageUrl = getProductImage(product)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `Impact No. ${enrichment.number}`,
    description:
      enrichment.tagline ??
      `A ${enrichment.descriptor} Eau de Parfum from the Impact Number Series.`,
    url: `${SITE_URL}/no/${enrichment.number}`,
    brand: { '@type': 'Brand', name: 'Impact Perfumes & Oils' },
    category: 'Fragrance',
    ...(priceKobo > 0 && {
      offers: {
        '@type': 'Offer',
        price: (priceKobo / 100).toFixed(2),
        priceCurrency: 'NGN',
        availability: 'https://schema.org/InStock',
        url: `${SITE_URL}/no/${enrichment.number}`,
      },
    }),
  }

  return (
    <>
      <Script
        id={`json-ld-product-${enrichment.number}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
          priceKobo={priceKobo}
        />
      </div>

      <RelatedProducts currentNumber={enrichment.number} />
    </>
  )
}
