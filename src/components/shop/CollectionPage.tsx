import { Container } from '@/components/layout'
import CategoryProductTile from '@/components/shop/CategoryProductTile'
import type { CategoryProduct } from '@/lib/medusa'

interface CollectionPageProps {
  eyebrow: string
  title: string
  subtitle: string
  products: CategoryProduct[]
  /** Shown when there are no products to display. */
  emptyMessage?: string
  /** Base path for a tile's link. Tiles link to `${tileHrefBase}/${handle}`. */
  tileHrefBase?: string
  /** Optional per-tile variant label used when adding to cart. */
  variantLabel?: string
}

/**
 * Single-collection page layout, matching the Perfume Oils page: a minimal dark
 * hero followed by a responsive product grid. Used by the Home & Car category
 * pages so they read consistently with /oils.
 */
export default function CollectionPage({
  eyebrow,
  title,
  subtitle,
  products,
  emptyMessage = 'This collection is coming soon.',
  tileHrefBase = '/products',
  variantLabel = '',
}: CollectionPageProps) {
  return (
    <>
      {/* Hero, minimal */}
      <section className="border-b border-stone/20 bg-ink py-14 md:py-20">
        <Container>
          <p className="text-label uppercase tracking-[0.12em] text-accent">{eyebrow}</p>
          <h1 className="mt-3 font-display text-display-l leading-none text-bone">{title}</h1>
          <p className="mt-4 max-w-md text-body text-stone">{subtitle}</p>
        </Container>
      </section>

      {/* Grid */}
      <section className="bg-ink py-10 md:py-14">
        <Container>
          {products.length === 0 ? (
            <p className="py-16 text-center text-stone">{emptyMessage}</p>
          ) : (
            <div
              className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3"
              role="list"
              aria-label={`${title} collection`}
            >
              {products.map((p) => (
                <div key={p.handle} role="listitem">
                  <CategoryProductTile
                    product={p}
                    href={`${tileHrefBase}/${p.handle}`}
                    variantLabel={variantLabel}
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
