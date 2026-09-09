import type { Metadata } from 'next'
import { DEFAULT_OG_IMAGES } from '@/lib/seo'
import { notFound } from 'next/navigation'
import { getServerRegion } from '@/lib/serverRegion'
import { getMedusaProduct, getPrice, getProductImage, variantInStock } from '@/lib/medusa'
import ColorPanel from '@/components/pdp/ColorPanel'
import InfoRail from '@/components/pdp/InfoRail'
import { RecentlyViewedTracker, RecentlyViewedRail } from '@/components/pdp/RecentlyViewed'
import { shippingCopyFor } from '@/lib/shippingCopy'
import { jsonLdScript, buildProductJsonLd, buildBreadcrumbJsonLd } from '@/lib/jsonLd'

export const revalidate = 60

function splitNotes(raw?: string): string[] {
  if (!raw) return []
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
}

export async function generateMetadata(props: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const params = await props.params;
  const region = await getServerRegion()
  const product = await getMedusaProduct(params.handle, region.medusaRegionId)
  if (!product) return { title: 'Product' }
  return {
    title: product.title,
    description: (product as { description?: string }).description ?? undefined,
    alternates: { canonical: `/products/${params.handle}` },
    openGraph: { images: DEFAULT_OG_IMAGES, title: `${product.title} · Impact Perfumes` },
  }
}

export default async function ProductPage(props: { params: Promise<{ handle: string }> }) {
  const params = await props.params;
  const region = await getServerRegion()
  const product = await getMedusaProduct(params.handle, region.medusaRegionId)
  if (!product) notFound()

  const variant = product.variants?.[0]
  const price = getPrice(product, region.currency)
  const image = getProductImage(product)
  const description = (product as { description?: string }).description ?? ''
  const variantLabel = (variant as { title?: string } | undefined)?.title ?? ''
  const m = product.metadata ?? {}
  const color = m.signature_color ?? '#E4B250'
  const canBuy = Boolean(variant?.id && price.amount > 0 && variantInStock(variant))

  const topNotes = splitNotes(m.top_notes)
  const heartNotes = splitNotes(m.heart_notes)
  const baseNotes = splitNotes(m.base_notes)

  // This route is the PDP for scent candles, home diffusers, car diffusers and
  // scenting machines — four categories reachable from search and the category
  // pages — so it needs the same structured data as the other product pages.
  const jsonLd = buildProductJsonLd({
    name: product.title,
    description: description || `${product.title} from Impact Perfumes & Oils.`,
    path: `/products/${product.handle}`,
    category: 'Home Fragrance',
    imageUrl: image,
    sku: variant?.sku,
    priceMinor: price.amount,
    currency: price.currency,
    inStock: variantInStock(variant),
  })
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Home & Gifts', path: '/home' },
    { name: product.title, path: `/products/${product.handle}` },
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
    <main>
      <div className="lg:grid lg:grid-cols-2">
        <ColorPanel
          label="Home & Gifts"
          descriptor={product.title}
          signatureColor={color}
          imageUrl={image}
          alt={product.title}
        />

        <InfoRail
          title={product.title}
          breadcrumbLabel={product.title}
          descriptor={description}
          signatureColor={color}
          topNotes={topNotes}
          heartNotes={heartNotes}
          baseNotes={baseNotes}
          productId={product.id}
          variantId={variant?.id ?? product.handle}
          priceMinor={price.amount}
          currency={price.currency}
          imageUrl={image ?? undefined}
          variantLabel={variantLabel}
          collectionLabel="Home & Gifts"
          collectionHref="/home"
          shippingCopy={shippingCopyFor(region)}
          handle={product.handle}
          href={`/products/${product.handle}`}
          inStock={variantInStock(variant)}
        />
      </div>

      <RecentlyViewedTracker
        handle={product.handle}
        href={`/products/${product.handle}`}
        title={product.title}
        imageUrl={image ?? undefined}
        signatureColor={color}
      />
      <RecentlyViewedRail excludeHandle={product.handle} />
    </main>
    </>
  )
}

