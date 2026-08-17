import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { Container } from '@/components/layout'
import { getServerRegion } from '@/lib/serverRegion'
import { getMedusaProduct, getPrice, getProductImage, variantInStock } from '@/lib/medusa'
import { formatPrice } from '@/lib/format'
import AddToCartButton from '@/components/shop/AddToCartButton'

export const revalidate = 60

function splitNotes(raw?: string): string[] {
  if (!raw) return []
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
}

export async function generateMetadata({ params }: { params: { handle: string } }): Promise<Metadata> {
  const region = getServerRegion()
  const product = await getMedusaProduct(params.handle, region.medusaRegionId)
  if (!product) return { title: 'Product' }
  return {
    title: product.title,
    description: (product as { description?: string }).description ?? undefined,
    openGraph: { title: `${product.title} · Impact Perfumes`, images: [{ url: '/og-default.jpg', width: 1200, height: 630 }] },
  }
}

export default async function ProductPage({ params }: { params: { handle: string } }) {
  const region = getServerRegion()
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

  const pyramid = [
    { label: 'Top', notes: splitNotes(m.top_notes) },
    { label: 'Heart', notes: splitNotes(m.heart_notes) },
    { label: 'Base', notes: splitNotes(m.base_notes) },
  ].filter((p) => p.notes.length > 0)

  return (
    <section className="bg-ink py-12 md:py-20">
      <Container>
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          {/* Image */}
          <div className="relative aspect-square overflow-hidden border border-stone/15 bg-ink">
            <span
              className="pointer-events-none absolute inset-0 opacity-50"
              style={{ background: `radial-gradient(ellipse at center, ${color}2b 0%, transparent 70%)` }}
              aria-hidden="true"
            />
            {image ? (
              <Image src={image} alt={product.title} fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-contain p-8" priority />
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
              <p className="mt-7 text-body text-stone">Currently unavailable.</p>
            )}

            {/* Note pyramid */}
            {pyramid.length > 0 && (
              <div className="mt-10 border-t border-stone/15 pt-8">
                <p className="text-label uppercase tracking-[0.1em] text-accent">Scent notes</p>
                <dl className="mt-5 flex flex-col gap-5">
                  {pyramid.map((tier) => (
                    <div key={tier.label} className="grid grid-cols-[64px_1fr] gap-4">
                      <dt className="text-label uppercase tracking-[0.08em] text-stone">{tier.label}</dt>
                      <dd className="flex flex-wrap gap-2">
                        {tier.notes.map((n) => (
                          <span key={n} className="border border-stone/20 px-3 py-1 text-small text-bone/80">{n}</span>
                        ))}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>
      </Container>
    </section>
  )
}

