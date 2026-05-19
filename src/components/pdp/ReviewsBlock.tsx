import { getProductReviews } from '@/sanity/queries/reviews'

interface ReviewsBlockProps {
  productHandle: string
  /** Showroom title — "Impact No. 5" or "Impact Oil No. 5" etc. */
  productName: string
  /** Show inside InfoRail (compact) or as a full bottom block (default) */
  variant?: 'inline' | 'block'
}

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span aria-label={`${rating} out of 5 stars`} className="inline-flex items-center gap-0.5 text-accent">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 14 14"
          fill={i <= Math.round(rating) ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.2"
          aria-hidden="true"
        >
          <path d="M7 1.5l1.7 3.4 3.8.55-2.75 2.68.65 3.78L7 9.99l-3.4 1.92.65-3.78L1.5 5.45l3.8-.55L7 1.5z" />
        </svg>
      ))}
    </span>
  )
}

function relativeTime(iso: string): string {
  const d = new Date(iso)
  const now = Date.now()
  const diff = now - d.getTime()
  const day = 86400000
  if (diff < day) return 'Today'
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`
  if (diff < 30 * day) return `${Math.floor(diff / (7 * day))}w ago`
  if (diff < 365 * day) return `${Math.floor(diff / (30 * day))}mo ago`
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short' })
}

export default async function ReviewsBlock({ productHandle, productName, variant = 'block' }: ReviewsBlockProps) {
  const { count, averageRating, reviews } = await getProductReviews(productHandle)

  // No reviews yet — render nothing on the PDP so it doesn't look bare.
  // The owner can add reviews via Sanity Studio and they'll appear here.
  if (count === 0) return null

  const visible = reviews.slice(0, variant === 'inline' ? 2 : 3)

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-3 text-small text-stone">
        <StarRow rating={averageRating} size={12} />
        <span>{averageRating.toFixed(1)} · {count} {count === 1 ? 'review' : 'reviews'}</span>
      </div>
    )
  }

  return (
    <section className="border-t border-stone/20 bg-ink px-6 py-14 md:px-10 lg:px-16">
      <div className="mb-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-label uppercase tracking-[0.1em] text-accent">Customer Reviews</p>
          <h2 className="mt-2 font-display text-h1 text-bone">
            {productName}
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <StarRow rating={averageRating} size={20} />
          <span className="text-body text-bone">
            {averageRating.toFixed(1)} <span className="text-stone">({count} {count === 1 ? 'review' : 'reviews'})</span>
          </span>
        </div>
      </div>

      <ul className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((r) => (
          <li key={r._id} className="border border-stone/15 bg-ink p-6 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <StarRow rating={r.rating} size={14} />
              <span className="text-label uppercase tracking-[0.06em] text-stone">{relativeTime(r.submittedAt)}</span>
            </div>
            {r.title && (
              <p className="font-display text-h3 text-bone leading-snug">{r.title}</p>
            )}
            <p className="text-body text-stone whitespace-pre-line">{r.body}</p>
            <p className="mt-auto text-small text-bone">
              {r.customerName}
              {r.verified && (
                <span className="ml-2 text-label uppercase tracking-[0.08em] text-accent">Verified</span>
              )}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
