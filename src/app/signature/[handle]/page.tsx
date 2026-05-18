import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Container } from '@/components/layout'
import { getMedusaProduct, getNGNPrice, getProductImage } from '@/lib/medusa'
import { formatNaira } from '@/lib/format'
import NotesPyramid from '@/components/pdp/NotesPyramid'
import StrengthBars from '@/components/pdp/StrengthBars'
import SignatureAddToCart from '@/components/signature/SignatureAddToCart'

export const revalidate = 60

function splitNotes(raw?: string): string[] {
  if (!raw) return []
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
}

export async function generateMetadata({
  params,
}: {
  params: { handle: string }
}): Promise<Metadata> {
  const product = await getMedusaProduct(params.handle)
  if (!product) return { title: 'Signature | Impact Perfumes' }
  return {
    title: `${product.title} | Impact Perfumes`,
    description:
      (product.metadata?.tagline as string) ??
      `${product.title}, a luxury Eau de Parfum from the Impact Signature Collection.`,
  }
}

export default async function SignaturePDPPage({
  params,
}: {
  params: { handle: string }
}) {
  const product = await getMedusaProduct(params.handle)
  if (!product) notFound()

  const m = (product.metadata ?? {}) as Record<string, string>
  const variant = product.variants?.[0]
  const variantId = variant?.id ?? product.handle ?? product.id
  const price = getNGNPrice(product)
  const imageUrl = getProductImage(product)

  const topNotes = splitNotes(m.top_notes)
  const heartNotes = splitNotes(m.heart_notes)
  const baseNotes = splitNotes(m.base_notes)
  const longevity = m.longevity ? parseInt(m.longevity, 10) : undefined
  const sillage = m.sillage ? parseInt(m.sillage, 10) : undefined
  const signatureColor = m.signature_color
  const descriptor = m.descriptor ?? product.subtitle ?? ''
  const tagline = m.tagline

  return (
    <main>
      {/* Breadcrumb */}
      <div className="border-b border-stone/20 bg-ink">
        <Container className="py-4">
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-small text-stone">
              <li>
                <Link href="/signature" className="hover:text-bone transition-colors">
                  Signature Collection
                </Link>
              </li>
              <li aria-hidden="true">·</li>
              <li className="text-bone">{product.title}</li>
            </ol>
          </nav>
        </Container>
      </div>

      {/* PDP grid */}
      <div className="lg:grid lg:grid-cols-2 min-h-screen">

        {/* Left, image panel */}
        <div
          className="relative flex min-h-[60vh] lg:min-h-screen items-center justify-center lg:sticky lg:top-0"
          style={{ backgroundColor: signatureColor ?? '#1D1B16' }}
        >
          {imageUrl ? (
            <div className="relative w-[70%] max-w-[480px] aspect-[3/4]">
              <Image
                src={imageUrl}
                alt={product.title}
                fill
                sizes="(min-width: 1024px) 45vw, 90vw"
                className="object-contain drop-shadow-2xl"
                priority
              />
            </div>
          ) : (
            <p className="font-brand text-[140px] leading-none text-white/10 select-none">
              {product.title.charAt(0)}
            </p>
          )}

          {/* Bottom label */}
          <div className="absolute bottom-8 text-center text-white">
            <p className="text-label uppercase tracking-[0.12em] text-white/60">
              Signature Collection
            </p>
            <p className="mt-1 font-display text-h3 text-white/90">{product.title}</p>
          </div>
        </div>

        {/* Right, info rail */}
        <div className="bg-ink lg:sticky lg:top-0 lg:max-h-screen lg:overflow-y-auto">
          <div className="flex flex-col gap-8 px-6 py-10 md:px-10 lg:px-12 lg:py-14">

            {/* Title */}
            <div>
              {descriptor && (
                <p className="text-label uppercase tracking-[0.1em] text-stone">
                  {descriptor}
                </p>
              )}
              <h1 className="mt-2 font-display text-display-l leading-none text-bone">
                {product.title}
              </h1>
              {tagline && (
                <p className="mt-3 font-display text-h3 italic text-stone">
                  {tagline}
                </p>
              )}
            </div>

            <div className="border-t border-stone/20" />

            {/* Price + CTA */}
            <div className="flex flex-col gap-4">
              <div>
                <p className="font-display text-h1 leading-none text-accent">
                  {price > 0 ? formatNaira(price) : 'Price on request'}
                </p>
                <p className="mt-1.5 text-small text-stone">100 ml · Eau de Parfum</p>
              </div>
              {price > 0 && (
                <SignatureAddToCart
                  productId={product.id}
                  variantId={variantId}
                  productName={product.title}
                  priceKobo={price}
                  imageUrl={imageUrl ?? undefined}
                  className="w-fit px-10"
                />
              )}
            </div>

            <div className="border-t border-stone/20" />

            {/* Notes */}
            <NotesPyramid
              topNotes={topNotes}
              heartNotes={heartNotes}
              baseNotes={baseNotes}
            />

            {/* Wear profile */}
            {(longevity || sillage) && (
              <div className="max-w-xs">
                <StrengthBars longevity={longevity} sillage={sillage} />
              </div>
            )}

            {/* About accordion */}
            <details className="group border-t border-stone/30">
              <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-body font-medium text-bone">
                About this fragrance
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 transition-transform duration-200 group-open:rotate-180" aria-hidden="true">
                  <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <div className="pb-5 text-body text-stone">
                <p>
                  {tagline ? `${tagline} ` : ''}
                  A luxury Eau de Parfum from the Impact Signature Collection, named,
                  not numbered. Composed for those who already know who they are.
                </p>
              </div>
            </details>

            <details className="group border-t border-stone/30">
              <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-body font-medium text-bone">
                Shipping &amp; Returns
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 transition-transform duration-200 group-open:rotate-180" aria-hidden="true">
                  <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <div className="pb-5 text-body text-stone">
                <p>
                  Free delivery on orders over ₦50,000. Standard delivery 3–5 business
                  days within Lagos; 5–10 days nationwide. Returns accepted within 7 days
                  on unopened, sealed products.
                </p>
              </div>
            </details>

            {/* Back to collection */}
            <div className="border-t border-stone/20 pt-6">
              <Link
                href="/signature"
                className="text-small text-stone hover:text-bone transition-colors"
              >
                ← Back to Signature Collection
              </Link>
            </div>

          </div>
        </div>
      </div>
    </main>
  )
}
