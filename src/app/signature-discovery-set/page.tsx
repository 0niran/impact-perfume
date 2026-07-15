import type { Metadata } from 'next'
import { Container } from '@/components/layout'
import { getServerRegion } from '@/lib/serverRegion'
import { getSignatureProducts, getMedusaProduct, getPrice } from '@/lib/medusa'
import { SIGNATURE_PLACEHOLDERS } from '@/data/products'
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

  const contents =
    sigProducts.length > 0
      ? sigProducts.map((p) => p.title)
      : SIGNATURE_PLACEHOLDERS.map((s) => s.title)

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
        </Container>
      </section>

      {/* Contents + add */}
      <section className="bg-ink py-10 md:py-14">
        <Container className="grid gap-10 lg:grid-cols-[1fr_360px]">
          <div>
            <p className="text-label uppercase tracking-[0.1em] text-stone">Inside the set</p>
            <ul className="mt-5 divide-y divide-stone/15 border-y border-stone/15">
              {contents.map((title) => (
                <li key={title} className="flex items-center gap-3 py-4">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                  <span className="text-body text-bone">{title}</span>
                </li>
              ))}
            </ul>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="border border-stone/20 bg-white/[0.02] p-6">
              <p className="text-label uppercase tracking-[0.1em] text-stone">Signature Discovery Set</p>
              {canBuy && price && variant && setProduct ? (
                <>
                  <p className="mt-2 font-display text-h1 text-bone">
                    {new Intl.NumberFormat(region.locale, {
                      style: 'currency',
                      currency: region.currency,
                      maximumFractionDigits: region.currency === 'NGN' ? 0 : 2,
                    }).format(price.amount / 100)}
                  </p>
                  <p className="mt-1 text-small text-stone">Curated sample set. Ships in signature packaging.</p>
                  <div className="mt-6">
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
                  </div>
                </>
              ) : (
                <p className="mt-2 text-body text-stone">Coming soon.</p>
              )}
            </div>
          </aside>
        </Container>
      </section>
    </>
  )
}
