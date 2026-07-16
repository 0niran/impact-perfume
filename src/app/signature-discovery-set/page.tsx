import type { Metadata } from 'next'
import { Container } from '@/components/layout'
import { getServerRegion } from '@/lib/serverRegion'
import { getSignatureProducts, getMedusaProduct, getPrice, toCategoryProduct, type CategoryProduct } from '@/lib/medusa'
import { SIGNATURE_PLACEHOLDERS } from '@/data/products'
import { FALLBACK_COLOR } from '@/lib/constants'
import CategoryProductTile from '@/components/shop/CategoryProductTile'
import AddDiscoverySetButton from '@/components/shop/AddDiscoverySetButton'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Signature Discovery Set',
  description: 'A curated set of Signature Scents in sample sizes. Named, not numbered.',
  openGraph: {
    title: 'Signature Discovery Set · Impact Perfumes',
    description: 'A curated discovery set of Impact Signature Scents.',
    images: [{ url: '/og-default.jpg', width: 1200, height: 630 }],
  },
}

export default async function SignatureDiscoverySetPage() {
  const region = getServerRegion()
  const [sigProducts, setProduct] = await Promise.all([
    getSignatureProducts(region.medusaRegionId),
    getMedusaProduct('signature-discovery-set', region.medusaRegionId),
  ])

  // Display-only tiles: the set is one price, so individual prices/add are
  // hidden (priceMinor 0). Each links to its Signature product page.
  const tiles: CategoryProduct[] =
    sigProducts.length > 0
      ? sigProducts.map((p) => ({ ...toCategoryProduct(p, region.currency), priceMinor: 0, priceKobo: 0 }))
      : SIGNATURE_PLACEHOLDERS.map((s) => ({
          handle: s.handle,
          title: s.title,
          descriptor: s.descriptor ?? '',
          signatureColor: s.signatureColor ?? FALLBACK_COLOR,
          tagline: '',
          priceMinor: 0,
          currency: region.currency,
          priceKobo: 0,
          imageUrl: s.imageUrl ?? null,
          productId: s.handle,
          variantId: s.handle,
        }))

  const variant = setProduct?.variants?.[0]
  const price = setProduct ? getPrice(setProduct, region.currency) : null
  const canBuy = Boolean(variant?.id && setProduct?.id && price && price.amount > 0)

  return (
    <>
      {/* Hero */}
      <section className="border-b border-stone/20 bg-ink py-14 md:py-20">
        <Container>
          <p className="text-label uppercase tracking-[0.12em] text-accent">Discovery Set</p>
          <h1 className="mt-3 font-display text-display-l leading-none text-bone">
            Signature Discovery.
          </h1>
          <p className="mt-4 max-w-lg text-body text-stone">
            A curated set of our Signature Scents in sample sizes. Named, not
            numbered. Bolder compositions, ready to explore.
          </p>
          {canBuy && price && variant && setProduct && (
            <div className="mt-7 flex flex-wrap items-center gap-5">
              <AddDiscoverySetButton
                variantId={variant.id}
                productId={setProduct.id}
                name="Signature Discovery Set"
                variantLabel="Curated Signature sample set"
                priceMinor={price.amount}
                currency={price.currency}
                handle="signature-discovery-set"
                href="/signature-discovery-set"
              />
              <p className="text-small text-stone">Ships in signature packaging.</p>
            </div>
          )}
        </Container>
      </section>

      {/* Product grid */}
      <section className="bg-ink py-10 md:py-14">
        <Container>
          <p className="mb-6 text-label uppercase tracking-[0.1em] text-stone">Inside the set</p>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3" role="list" aria-label="Signature scents in the set">
            {tiles.map((p) => (
              <div key={p.handle} role="listitem">
                <CategoryProductTile product={p} href={`/signature/${p.handle}`} />
              </div>
            ))}
          </div>
        </Container>
      </section>
    </>
  )
}
