'use client'

import { useRouter } from 'next/navigation'
import { useRegion } from '@/lib/regionContext'
import { cn } from '@/lib/cn'
import type { RegionId } from '@/lib/region'

/**
 * Explicit region / currency control. Picking a region marks the choice as
 * manual (via setRegion → regionContext), so geo auto-detect stops overriding
 * it, and refreshes the route so server-rendered prices re-resolve in the new
 * currency. This is the durable escape hatch when geo gets it wrong.
 */
export default function RegionSwitcher({ className }: { className?: string }) {
  const { regionId, setRegion, availableRegions } = useRegion()
  const router = useRouter()

  const choose = (id: RegionId) => {
    if (id === regionId) return
    setRegion(id)
    router.refresh()
  }

  return (
    <div
      className={cn('inline-flex items-center gap-1', className)}
      role="group"
      aria-label="Choose your region and currency"
    >
      {availableRegions.map((r, i) => {
        const active = r.id === regionId
        return (
          <span key={r.id} className="inline-flex items-center">
            {i > 0 && <span aria-hidden className="mx-1 text-stone/40">/</span>}
            <button
              type="button"
              onClick={() => choose(r.id)}
              aria-pressed={active}
              className={cn(
                'text-label uppercase tracking-[0.08em] transition-colors duration-150',
                active ? 'text-accent' : 'text-stone hover:text-bone'
              )}
              title={`Shop in ${r.name} (${r.currency})`}
            >
              {r.currencyCode === 'ngn' ? '₦ NGN' : 'CA$ CAD'}
            </button>
          </span>
        )
      })}
    </div>
  )
}
