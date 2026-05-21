'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRecentlyViewed, type RecentlyViewedItem } from '@/hooks/useRecentlyViewed'

interface TrackerProps extends RecentlyViewedItem {}

/**
 * Side-effect-only client component. Drop into a PDP to record the visit.
 */
export function RecentlyViewedTracker(props: TrackerProps) {
  const { track } = useRecentlyViewed()
  useEffect(() => {
    track(props)
    // intentionally narrow deps: only re-track when the handle changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.handle])
  return null
}

interface RailProps {
  excludeHandle?: string
  excludeHandles?: string[]
  title?: string
  /** Visual variant — "drawer" is compact for the cart drawer, "wide" for PDP. */
  variant?: 'wide' | 'drawer'
}

export function RecentlyViewedRail({
  excludeHandle,
  excludeHandles,
  title = 'Recently viewed',
  variant = 'wide',
}: RailProps) {
  const { items } = useRecentlyViewed()
  const excludeSet = new Set<string>(excludeHandles ?? [])
  if (excludeHandle) excludeSet.add(excludeHandle)
  const filtered = items.filter((i) => !excludeSet.has(i.handle))
  if (filtered.length === 0) return null

  if (variant === 'drawer') {
    return (
      <div className="border-t border-stone/10 bg-ink/40 px-6 py-4">
        <p className="text-label uppercase tracking-[0.08em] text-stone mb-3">{title}</p>
        <ul className="flex gap-3 overflow-x-auto">
          {filtered.slice(0, 4).map((item) => (
            <li key={item.handle} className="shrink-0 w-16">
              <Link href={item.href} className="block group">
                <div
                  className="relative aspect-square overflow-hidden bg-ink"
                  style={{
                    background: item.signatureColor
                      ? `radial-gradient(ellipse at center, ${item.signatureColor}33 0%, #0a0a08 65%)`
                      : '#1D1B16',
                  }}
                >
                  {item.imageUrl && (
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      sizes="64px"
                      className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                    />
                  )}
                </div>
                <p className="mt-1 text-label text-stone truncate">{item.title}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <section className="border-t border-stone/20 bg-ink px-6 py-12 md:px-10 lg:px-16">
      <p className="text-label uppercase tracking-[0.1em] text-accent mb-6">{title}</p>
      <ul className="grid grid-cols-2 gap-4 sm:gap-6 sm:grid-cols-4">
        {filtered.slice(0, 4).map((item) => (
          <li key={item.handle}>
            <Link href={item.href} className="group relative block overflow-hidden border border-stone/15 bg-ink focus:outline-none focus:ring-2 focus:ring-accent">
              <div
                className="relative"
                style={{ aspectRatio: '4 / 5' }}
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-60 transition-opacity duration-500 group-hover:opacity-80"
                  style={{
                    background: item.signatureColor
                      ? `radial-gradient(ellipse at center, ${item.signatureColor}33 0%, transparent 65%)`
                      : undefined,
                  }}
                  aria-hidden="true"
                />
                {item.imageUrl && (
                  <div className="absolute inset-0 flex items-center justify-center p-6">
                    <div className="relative h-[88%] w-[80%]">
                      <Image
                        src={item.imageUrl}
                        alt={item.title}
                        fill
                        sizes="(min-width: 640px) 25vw, 50vw"
                        className="object-contain transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="border-t border-stone/15 bg-ink px-4 py-3">
                <p className="text-body font-medium text-bone truncate">{item.title}</p>
                {item.subtitle && (
                  <p className="text-small text-stone truncate">{item.subtitle}</p>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
