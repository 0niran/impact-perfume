import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Script from 'next/script'
import { getMedusaProduct, getNGNPrice, toEnrichment, getProductImage } from '@/lib/medusa'
import { SITE_URL } from '@/lib/constants'
import ColorPanel from '@/components/pdp/ColorPanel'
import InfoRail from '@/components/pdp/InfoRail'

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

  const product = await getMedusaProduct(`oil-no-${num}`)
  if (!product) notFound()

  const enrichment = toEnrichment(product)
  if (!enrichment) notFound()

  const variant = product.variants?.[0]
  const priceKobo = getNGNPrice(product)
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
    ...(priceKobo > 0 && {
      offers: {
        '@type': 'Offer',
        price: (priceKobo / 100).toFixed(2),
        priceCurrency: 'NGN',
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
          imageUrl={imageUrl ?? undefined}
          collectionLabel="Impact Oils"
          collectionHref="/oils"
          titlePrefix="Impact Oil No."
          variantLabel="12ml · Concentrated Oil"
          prevHref={(n) => `/oil/${n}`}
          nextHref={(n) => `/oil/${n}`}
          maxNumber={50}
        />
      </div>

      {/* Oil-specific layering note */}
      <section className="border-t border-stone/20 bg-mist/40 py-10">
        <div className="container-px mx-auto max-w-container">
          <p className="text-label uppercase tracking-[0.1em] text-accent">Layering Tip</p>
          <p className="mt-2 max-w-2xl text-body text-bone">
            Apply Oil No. {enrichment.number} to pulse points before your Eau de
            Parfum from the Number Series for a deeper, longer-wearing signature.
            Pure concentration, no alcohol — perfect for travel and dry skin.
          </p>
        </div>
      </section>
    </>
  )
}
