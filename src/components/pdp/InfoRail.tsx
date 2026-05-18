import Link from 'next/link'
import NotesPyramid from './NotesPyramid'
import StrengthBars from './StrengthBars'
import PDPAccordion from './PDPAccordion'
import AddToCart from './AddToCart'

interface InfoRailProps {
  number: number
  descriptor: string
  signatureColor?: string
  scentFamily?: string
  tagline?: string
  topNotes?: string[]
  heartNotes?: string[]
  baseNotes?: string[]
  longevity?: number
  sillage?: number
  productId: string
  variantId: string
  priceKobo: number
  imageUrl?: string
  /** Configurable per product line (Numbers vs Oils etc.) */
  collectionLabel?: string
  collectionHref?: string
  titlePrefix?: string
  variantLabel?: string
  prevHref?: (n: number) => string
  nextHref?: (n: number) => string
  maxNumber?: number
}

export default function InfoRail({
  number,
  descriptor,
  signatureColor,
  scentFamily,
  tagline,
  topNotes,
  heartNotes,
  baseNotes,
  longevity,
  sillage,
  productId,
  variantId,
  priceKobo,
  imageUrl,
  collectionLabel = 'The Number Series',
  collectionHref = '/shop',
  titlePrefix = 'Impact No.',
  variantLabel,
  prevHref = (n) => `/no/${n}`,
  nextHref = (n) => `/no/${n}`,
  maxNumber = 50,
}: InfoRailProps) {
  return (
    <div className="lg:sticky lg:top-0 lg:max-h-screen lg:overflow-y-auto bg-ink text-bone">
      <div className="flex flex-col gap-8 px-6 py-10 md:px-10 lg:px-12 lg:py-14">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-small text-stone">
            <li>
              <Link href={collectionHref} className="hover:text-bone transition-colors">
                {collectionLabel}
              </Link>
            </li>
            <li aria-hidden="true">·</li>
            <li aria-current="page" className="text-bone">
              No. {number}
            </li>
          </ol>
        </nav>

        {/* Scent family badge */}
        {scentFamily && (
          <span className="inline-flex self-start items-center border border-accent/40 px-3 py-1 text-label uppercase tracking-[0.08em] text-accent">
            {scentFamily}
          </span>
        )}

        {/* Title block */}
        <div>
          <p className="text-label uppercase tracking-[0.1em] text-stone">
            No. {number} · {descriptor}
          </p>
          <h1 className="mt-2 font-display text-[32px] leading-[1.1] md:text-display-l text-bone">
            {titlePrefix} {number}
          </h1>
          {tagline && (
            <p className="mt-3 font-display text-h3 italic text-stone">
              {tagline}
            </p>
          )}
        </div>

        {/* Divider before purchase block */}
        <div className="border-t border-stone/20" />

        {/* Add to cart */}
        <AddToCart
          productId={productId}
          variantId={variantId}
          productName={`${titlePrefix} ${number}`}
          priceKobo={priceKobo}
          signatureColor={signatureColor}
          imageUrl={imageUrl}
          variantLabel={variantLabel}
        />

        {/* Divider before notes */}
        <div className="border-t border-stone/20" />

        {/* Notes pyramid */}
        <NotesPyramid
          topNotes={topNotes}
          heartNotes={heartNotes}
          baseNotes={baseNotes}
        />

        {/* Wear profile — constrained width */}
        <div className="max-w-xs">
          <StrengthBars longevity={longevity} sillage={sillage} />
        </div>

        {/* Accordion */}
        <PDPAccordion descriptor={descriptor} tagline={tagline} />

        {/* Navigate between numbers — compact inline links */}
        <div className="flex items-center justify-between border-t border-stone/20 pt-6">
          {number > 1 ? (
            <Link
              href={prevHref(number - 1)}
              className="group flex flex-col gap-0.5 hover:opacity-70 transition-opacity duration-200"
            >
              <span className="text-label text-stone">← Previous</span>
              <span className="font-display text-h3 leading-none text-bone">No. {number - 1}</span>
            </Link>
          ) : (
            <div />
          )}
          {number < maxNumber ? (
            <Link
              href={nextHref(number + 1)}
              className="group flex flex-col gap-0.5 text-right hover:opacity-70 transition-opacity duration-200"
            >
              <span className="text-label text-stone">Next →</span>
              <span className="font-display text-h3 leading-none text-bone">No. {number + 1}</span>
            </Link>
          ) : (
            <div />
          )}
        </div>

      </div>
    </div>
  )
}
