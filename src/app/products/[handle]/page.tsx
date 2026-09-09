import type { Metadata } from 'next'
import { DEFAULT_OG_IMAGES } from '@/lib/seo'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { Container } from '@/components/layout'
import { getServerRegion } from '@/lib/serverRegion'
import { getMedusaProduct, getPrice, getProductImage, variantInStock } from '@/lib/medusa'
import { formatPrice } from '@/lib/format'
import AddToCartButton from '@/components/shop/AddToCartButton'
import NotesPyramid from '@/components/pdp/NotesPyramid'
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
    <section className="bg-ink py-12 md:py-20">
      <Container>
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          {/* Image */}
          <div className="relative aspect-[4/5] overflow-hidden border border-stone/15 bg-ink">
            <span
              className="pointer-events-none absolute inset-0 opacity-50"
              style={{ background: `radial-gradient(ellipse at center, ${color}2b 0%, transparent 70%)` }}
              aria-hidden="true"
            />
            {image ? (
              <Image src={image} alt={product.title} fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-contain p-4" priority />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center font-display text-[5rem] text-stone/30">
                {product.title.charAt(0)}
              </span>
            )}
          </div>

          {/* Details */}
          <div>
            <h1 className="font-display text-display-s leading-none text-bone">{product.title}</h1>
            {price.amount > 0 && (
              <p className="mt-4 font-display text-h1 text-bone">{formatPrice(price.amount, region.currency)}</p>
            )}
            {description && (
              <p className="mt-5 max-w-lg text-body text-stone">{description}</p>
            )}

            {canBuy && variant ? (
              <div className="mt-7">
                <AddToCartButton
                  variantId={variant.id}
                  productId={product.id}
                  name={product.title}
                  variantLabel={variantLabel}
                  priceMinor={price.amount}
                  currency={price.currency}
                  handle={product.handle}
                  href={`/products/${product.handle}`}
                  thumbnail={image}
                  color={color}
                />
              </div>
            ) : (
              <p className="mt-7 text-body text-error">Out of stock</p>
            )}

            {/* The shared pyramid, so notes read identically here and on the
                Number, Oil and Signature pages. This used to be its own markup. */}
            <div className="mt-10 border-t border-stone/15 pt-8">
              <NotesPyramid topNotes={topNotes} heartNotes={heartNotes} baseNotes={baseNotes} />
            </div>

            {/* Delivery terms, region-aware. Absent here while every other PDP
                showed them, so these categories told a customer nothing about
                shipping or returns. */}
            <details className="group mt-6 border-t border-stone/20">
              <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-body font-medium text-bone">
                Shipping &amp; Returns
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 transition-transform duration-200 group-open:rotate-180" aria-hidden="true">
                  <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <div className="pb-5 text-body text-stone">
                <p>{shippingCopyFor(region)}</p>
              </div>
            </details>
          </div>
        </div>
      </Container>

      <RecentlyViewedTracker
        handle={product.handle}
        href={`/products/${product.handle}`}
        title={product.title}
        imageUrl={image ?? undefined}
        signatureColor={color}
      />
      <RecentlyViewedRail excludeHandle={product.handle} />
    </section>
    </>
  )
}

