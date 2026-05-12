import Image from 'next/image'
import Link from 'next/link'

interface JournalCardProps {
  title: string
  slug: string
  category?: string
  publishedAt?: string
  heroUrl?: string
}

export default function JournalCard({
  title,
  slug,
  category,
  publishedAt,
  heroUrl,
}: JournalCardProps) {
  const date = publishedAt
    ? new Date(publishedAt).toLocaleDateString('en-NG', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <Link href={`/journal/${slug}`} className="group flex flex-col">
      <div className="relative overflow-hidden bg-mist" style={{ aspectRatio: '4/3' }}>
        {heroUrl ? (
          <Image
            src={heroUrl}
            alt={title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 ease-soft group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-stone/30" />
        )}
      </div>

      <div className="mt-4 flex flex-col gap-1">
        {category && (
          <p className="text-label uppercase tracking-[0.1em] text-accent">
            {category}
          </p>
        )}
        <h3 className="font-display text-h3 transition-colors duration-200 group-hover:text-accent">
          {title}
        </h3>
        {date && <p className="text-small text-slate">{date}</p>}
      </div>
    </Link>
  )
}
