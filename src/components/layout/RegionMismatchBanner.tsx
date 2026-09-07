'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRegion } from '@/lib/regionContext'
import { getRegion, type RegionId } from '@/lib/region'

const DISMISS_KEY = 'impact_region_suggest_dismissed'

function readGeoCookie(): RegionId | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|; )impact_geo=([^;]*)/)
  if (!match) return null
  const value = decodeURIComponent(match[1])
  return value === 'NG' || value === 'CA' ? value : null
}

/**
 * When geo-IP (published by middleware as impact_geo) disagrees with the active
 * region, offer a one-tap switch. This is what recovers a returning traveller
 * whose cookie is stuck on the wrong market, including a stale manual choice —
 * geo alone can't override a manual pick, but the visitor can, right here.
 * Dismissal is remembered per detected region for the session so it never nags.
 */
export default function RegionMismatchBanner() {
  const { regionId, setRegion } = useRegion()
  const router = useRouter()
  const [suggested, setSuggested] = useState<RegionId | null>(null)

  useEffect(() => {
    const geo = readGeoCookie()
    if (!geo || geo === regionId) {
      setSuggested(null)
      return
    }
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === geo) return
    } catch {
      // sessionStorage unavailable (private mode); still show the suggestion.
    }
    setSuggested(geo)
  }, [regionId])

  if (!suggested) return null

  const suggestedRegion = getRegion(suggested)
  const currentRegion = getRegion(regionId)

  const accept = () => {
    setRegion(suggested)
    setSuggested(null)
    router.refresh()
  }
  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, suggested)
    } catch {
      // ignore
    }
    setSuggested(null)
  }

  return (
    <div
      role="region"
      aria-label="Region suggestion"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-accent/30 bg-ink/95 backdrop-blur-sm"
    >
      <div className="container-px mx-auto max-w-container flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3">
        <p className="text-sm text-bone">
          It looks like you are in {suggestedRegion.name}. Shop in{' '}
          {suggestedRegion.currency} ({suggestedRegion.currencyCode.toUpperCase()})?
        </p>
        <div className="flex items-center gap-4 shrink-0">
          <button
            type="button"
            onClick={accept}
            className="text-label uppercase tracking-[0.08em] bg-accent text-ink px-4 py-2 hover:opacity-90 transition-opacity duration-150"
          >
            Switch to {suggestedRegion.currency}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="text-label uppercase tracking-[0.08em] text-stone hover:text-bone transition-colors duration-150"
          >
            Keep {currentRegion.currency}
          </button>
        </div>
      </div>
    </div>
  )
}
