import Image from 'next/image'
import Link from 'next/link'
import { FALLBACK_COLOR } from '@/lib/constants'
import { formatNaira } from '@/lib/format'

const BOTTLE_FALLBACK = '/images/no_series.png'

interface ProductCardProps {
  handle: string
  title: string
  subtitle?: string
  price?: number
  number?: number
  descriptor?: string
  signatureColor?: string
  signatureColorName?: string
  tagline?: string
  imageUrl?: string | null
}

export default function ProductCard({
  handle,
  title,
  subtitle,
  price,
  number,
  descriptor,
  signatureColor = FALLBACK_COLOR,
  tagline,
  imageUrl,
}: ProductCardProps) {
  const href = number ? `/no/${number}` : '/shop'
  const src = imageUrl ?? (number ? BOTTLE_FALLBACK : null)

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden bg-ink transition-transform duration-300 ease-soft hover:-translate-y-1"
    >
      {/* Product image on colour background */}
      <div
        className="relative flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: signatureColor, aspectRatio: '3/4' }}
      >
        {src ? (
          <div className="relative w-[75%] h-[85%]">
            <Image
              src={src}
              alt={title}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              className="object-contain transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        ) : (
          number && (
            <span className="font-display text-[80px] leading-none text-white/20 select-none">
              {number}
            </span>
          )
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col border border-t-0 border-stone/30 p-5">
        {number && (
          <p className="text-label uppercase tracking-[0.1em] text-stone">
            No. {number}
            {descriptor ? ` · ${descriptor}` : ''}
          </p>
        )}
        <h3 className="mt-1 font-display text-h3 text-bone">{title}</h3>
        {(tagline || subtitle) && (
          <p className="mt-1 text-small text-stone">{tagline ?? subtitle}</p>
        )}
        <div className="mt-4 flex items-center justify-between">
          {price !== undefined ? (
            <span className="text-body font-medium text-bone">{formatNaira(price)}</span>
          ) : (
            <span className="text-small text-stone">Price on request</span>
          )}
          <span className="text-label uppercase tracking-[0.1em] text-accent transition-transform duration-200 group-hover:translate-x-1">
            Explore
          </span>
        </div>
      </div>
    </Link>
  )
}
