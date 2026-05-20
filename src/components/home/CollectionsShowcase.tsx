import Link from 'next/link'
import { Container } from '@/components/layout'

const COLLECTIONS = [
  {
    label: 'The Number Series',
    eyebrow: 'Signature EDPs',
    description:
      '50 numbered Eau de Parfums. One silhouette. An infinite world of difference inside each bottle.',
    cta: 'Shop the Series',
    href: '/no-series',
    accent: 'rgba(107,68,35,0.15)',
    large: true,
  },
  {
    label: 'Signature',
    eyebrow: 'Named Perfumes',
    description:
      'Beyond numbers. Fragrances with a name, a narrative, and a soul of their own.',
    cta: 'Explore Signature',
    href: '/signature',
    accent: 'rgba(60,50,80,0.15)',
    large: false,
  },
  {
    label: 'Fragrance Oils',
    eyebrow: 'Concentrated Oils',
    description:
      'Long-lasting, alcohol-free. A drop on the wrist carries all day.',
    cta: 'Shop Oils',
    href: '/oils',
    accent: 'rgba(30,60,40,0.15)',
    large: false,
  },
  {
    label: 'Home & Gifts',
    eyebrow: 'For Your Space',
    description:
      'Candles, reed diffusers, and curated gift sets. The house extends beyond the skin.',
    cta: 'Shop Home & Gifts',
    href: '/gifts',
    accent: 'rgba(80,60,30,0.12)',
    large: false,
  },
]

export default function CollectionsShowcase() {
  const [feature, ...rest] = COLLECTIONS

  return (
    <section className="section-y bg-ink text-bone">
      <Container>
        {/* Section heading */}
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="text-label uppercase tracking-[0.12em] text-stone">
              The House
            </p>
            <h2 className="mt-2 font-display text-h1 md:text-display-s leading-none">
              Our Collections
            </h2>
          </div>
          <Link
            href="/no-series"
            className="hidden text-small uppercase tracking-[0.1em] text-stone transition-colors hover:text-bone md:block"
          >
            View All
          </Link>
        </div>

        {/* Asymmetric grid: 1 large left + 3 stacked right */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5 md:grid-rows-2">
          {/* Feature tile, spans 3 cols, 2 rows */}
          <CollectionTile
            collection={feature}
            className="md:col-span-3 md:row-span-2 min-h-[420px] md:min-h-0"
          />

          {/* Three smaller tiles */}
          {rest.map((c) => (
            <CollectionTile
              key={c.label}
              collection={c}
              className="md:col-span-2 min-h-[180px]"
            />
          ))}
        </div>

        {/* Mobile CTA */}
        <div className="mt-8 md:hidden">
          <Link
            href="/no-series"
            className="text-small uppercase tracking-[0.1em] text-stone"
          >
            View All Collections
          </Link>
        </div>
      </Container>
    </section>
  )
}

type Collection = (typeof COLLECTIONS)[number]

function CollectionTile({
  collection,
  className = '',
}: {
  collection: Collection
  className?: string
}) {
  return (
    <Link
      href={collection.href}
      className={`group relative flex flex-col justify-end overflow-hidden border border-stone/20 p-6 transition-colors duration-300 hover:border-stone/40 md:p-8 ${className}`}
      style={{ background: collection.accent }}
    >
      {/* Hover shimmer */}
      <span
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(ellipse 60% 60% at 70% 30%, rgba(255,255,255,0.04) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      <div className="relative">
        <p className="text-label uppercase tracking-[0.1em] text-stone">
          {collection.eyebrow}
        </p>
        <h3
          className={`mt-2 font-display leading-none text-bone ${
            collection.large ? 'text-h1 md:text-display-s' : 'text-h2'
          }`}
        >
          {collection.label}
        </h3>
        <p className={`mt-3 max-w-xs text-body text-stone ${!collection.large ? 'md:hidden' : ''}`}>
          {collection.description}
        </p>
        <span className="mt-5 inline-flex items-center text-small uppercase tracking-[0.1em] text-stone transition-transform duration-200 group-hover:translate-x-1">
          {collection.cta}
        </span>
      </div>
    </Link>
  )
}
