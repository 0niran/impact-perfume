import type { Metadata } from 'next'
import { Container } from '@/components/layout'
import { getProductsByCategory, toTileEnrichment } from '@/lib/medusa'
import { getServerRegion } from '@/lib/serverRegion'
import NumberTile from '@/components/shop/NumberTile'
import type { TileEnrichment } from '@/types'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Impact Oils',
  description:
    '50 alcohol-free perfume oils. Concentrated. 12ml roll-on.',
  openGraph: {
    title: 'Impact Oils · Impact Perfumes',
    description: '50 concentrated perfume oils crafted in Lagos.',
    images: [{ url: '/og-default.jpg', width: 1200, height: 630 }],
  },
}

export default async function OilsPage() {
  const region = getServerRegion()
  const products = await getProductsByCategory('oils', 100, region.medusaRegionId)
  const tiles = products
    .map((p) => toTileEnrichment(p, region.currency))
    .filter((t): t is TileEnrichment => t !== null)
    .sort((a, b) => a.number - b.number)

  return (
    <>
      {/* Hero, minimal */}
      <section className="border-b border-stone/20 bg-ink py-14 md:py-20">
        <Container>
          <p className="text-label uppercase tracking-[0.12em] text-accent">Impact Oils</p>
          <h1 className="mt-3 font-display text-display-l leading-none text-bone">
            Pure Scent.
          </h1>
          <p className="mt-4 max-w-md text-body text-stone">
            Alcohol-free. 12ml roll-on. A few drops last up to 48 hours.
          </p>
        </Container>
      </section>

      {/* Grid */}
      <section className="bg-ink py-10 md:py-14">
        <Container>
          {tiles.length === 0 ? (
            <p className="py-16 text-center text-stone">
              Oils are loading from the catalogue…
            </p>
          ) : (
            <div
              className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3"
              role="list"
              aria-label="Impact Oils collection"
            >
              {tiles.map((tile) => (
                <div key={tile.productHandle} role="listitem">
                  <NumberTile
                    tile={tile}
                    hrefBase="/oil"
                    titlePrefix="Oil No."
                    variantLabel="12ml Concentrated Oil"
                    fallbackImage="/images/Oil_perfume.png"
                  />
                </div>
              ))}
            </div>
          )}
        </Container>
      </section>
    </>
  )
}
