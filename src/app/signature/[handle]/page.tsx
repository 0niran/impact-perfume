import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getMedusaProduct, getPrice, getProductImage, variantInStock } from '@/lib/medusa'
import { getServerRegion } from '@/lib/serverRegion'
import { shippingCopyFor } from '@/lib/shippingCopy'
import { RecentlyViewedTracker, RecentlyViewedRail } from '@/components/pdp/RecentlyViewed'
import ColorPanel from '@/components/pdp/ColorPanel'
import InfoRail from '@/components/pdp/InfoRail'
import { jsonLdScript, buildProductJsonLd, buildBreadcrumbJsonLd } from '@/lib/jsonLd'
import { DEFAULT_OG_IMAGES } from '@/lib/seo'

export const revalidate = 60

function splitNotes(raw?: string): string[] {
  if (!raw) return []
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
}

export async function generateMetadata(
  props: {
    params: Promise<{ handle: string }>
  }
): Promise<Metadata> {
  const params = await props.params;
  const product = await getMedusaProduct(params.handle)
  if (!product) return { title: 'Signature | Impact Perfumes' }
  return {
    title: `${product.title} | Impact Perfumes`,
    description:
      (product.metadata?.tagline as string) ??
      `${product.title}, a luxury Eau de Parfum from the Impact Signature Scents.`,
    alternates: { canonical: `/signature/${params.handle}` },
    openGraph: {
      images: DEFAULT_OG_IMAGES,
      title: `${product.title} · Impact Perfumes`,
      description: (product.metadata?.tagline as string) ?? undefined,
    },
  }
}

export default async function SignaturePDPPage(
  props: {
    params: Promise<{ handle: string }>
  }
) {
  const params = await props.params;
  const region = await getServerRegion()
  const product = await getMedusaProduct(params.handle, region.medusaRegionId)
  if (!product) notFound()

  const m = (product.metadata ?? {}) as Record<string, string>
  const variant = product.variants?.[0]
  const variantId = variant?.id ?? product.handle ?? product.id
  const priceInfo = getPrice(product, region.currency)
  const imageUrl = getProductImage(product)
  const inStock = variantInStock(variant)
  // The variant's own label, rather than the hardcoded "100ml EDP" that every
  // signature product used to carry into the cart and the confirmation email.
  const variantLabel = (variant as { title?: string } | undefined)?.title ?? '100ml EDP'

  const topNotes = splitNotes(m.top_notes)
  const heartNotes = splitNotes(m.heart_notes)
  const baseNotes = splitNotes(m.base_notes)
  const longevity = m.longevity ? parseInt(m.longevity, 10) : undefined
  const sillage = m.sillage ? parseInt(m.sillage, 10) : undefined
  const signatureColor = m.signature_color
  const descriptor = m.descriptor ?? product.subtitle ?? ''
  const tagline = m.tagline

  const jsonLd = buildProductJsonLd({
    name: product.title,
    description:
      tagline ?? `${product.title}, a luxury Eau de Parfum from the Impact Signature Scents.`,
    path: `/signature/${product.handle}`,
    category: 'Fragrance',
    imageUrl,
    sku: variant?.sku,
    priceMinor: priceInfo.amount,
    currency: priceInfo.currency,
    inStock,
  })

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Signature Scents', path: '/signature' },
    { name: product.title, path: `/signature/${product.handle}` },
  ])

  return (
    <main>
      {/* Plain script tags, not next/script: that defaults to afterInteractive
          and injects from the client, leaving the markup out of the server
          response where a crawler needs it. */}
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
          label="Signature Scents"
          descriptor={product.title}
          signatureColor={signatureColor ?? '#E4B250'}
          imageUrl={imageUrl}
          alt={product.title}
        />

        <InfoRail
          title={product.title}
          eyebrow={descriptor || undefined}
          breadcrumbLabel={product.title}
          descriptor={descriptor}
          signatureColor={signatureColor}
          scentFamily={m.scent_family}
          tagline={tagline}
          topNotes={topNotes}
          heartNotes={heartNotes}
          baseNotes={baseNotes}
          longevity={longevity}
          sillage={sillage}
          productId={product.id}
          variantId={variantId}
          priceMinor={priceInfo.amount}
          currency={priceInfo.currency}
          imageUrl={imageUrl ?? undefined}
          variantLabel={variantLabel}
          collectionLabel="Signature Scents"
          collectionHref="/signature"
          shippingCopy={shippingCopyFor(region)}
          handle={product.handle}
          href={`/signature/${product.handle}`}
          inStock={inStock}
        />
      </div>

      <RecentlyViewedTracker
        handle={product.handle}
        href={`/signature/${product.handle}`}
        title={product.title}
        subtitle={descriptor}
        imageUrl={imageUrl ?? undefined}
        signatureColor={signatureColor}
      />
      <RecentlyViewedRail excludeHandle={product.handle} />
    </main>
  )
}
