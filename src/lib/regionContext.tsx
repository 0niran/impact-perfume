'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import {
  DEFAULT_REGION_ID,
  REGIONS,
  type Region,
  type RegionId,
  getRegion,
  isSupportedShippingCountry,
} from './region'

const COOKIE_NAME = 'impact_region'
const MANUAL_COOKIE_NAME = 'impact_region_manual'
const COUNTRY_COOKIE_NAME = 'impact_country'
const COOKIE_MAX_AGE_DAYS = 180

interface RegionContextValue {
  region: Region
  regionId: RegionId
  setRegion: (id: RegionId) => void
  availableRegions: Region[]
  /** Physical country (ISO code) detected by the geo middleware, if any. */
  detectedCountry: string | null
  /**
   * Whether the visitor can actually complete checkout. False only when we
   * know they're physically in a country we don't ship to and they haven't
   * manually picked a region. Fails open (true) when the country is unknown.
   */
  checkoutSupported: boolean
}

const RegionContext = createContext<RegionContextValue | null>(null)

function readRawCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function readCookie(): RegionId | null {
  const value = readRawCookie(COOKIE_NAME)
  return value === 'NG' || value === 'CA' ? value : null
}

function writeCookie(id: RegionId) {
  if (typeof document === 'undefined') return
  const expires = new Date()
  expires.setDate(expires.getDate() + COOKIE_MAX_AGE_DAYS)
  document.cookie = `${COOKIE_NAME}=${id}; expires=${expires.toUTCString()}; path=/; samesite=lax`
  // Mark the choice as manual so the geo middleware stops overriding it
  // on future requests (e.g. when the visitor uses a VPN).
  document.cookie = `${MANUAL_COOKIE_NAME}=1; expires=${expires.toUTCString()}; path=/; samesite=lax`
}

interface RegionProviderProps {
  initialRegionId?: RegionId
  children: React.ReactNode
}

export function RegionProvider({ initialRegionId, children }: RegionProviderProps) {
  const [regionId, setRegionIdState] = useState<RegionId>(initialRegionId ?? DEFAULT_REGION_ID)
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null)
  const [manual, setManual] = useState(false)

  // Hydrate from cookies after mount (cookie wins over SSR default)
  useEffect(() => {
    const fromCookie = readCookie()
    if (fromCookie && fromCookie !== regionId) {
      setRegionIdState(fromCookie)
    }
    setDetectedCountry(readRawCookie(COUNTRY_COOKIE_NAME))
    setManual(readRawCookie(MANUAL_COOKIE_NAME) === '1')
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setRegion = useCallback((id: RegionId) => {
    setRegionIdState(id)
    writeCookie(id)
    // The visitor just made an explicit choice; stop gating their checkout.
    setManual(true)
  }, [])

  // Fail open: only block when we positively know the country is unsupported
  // and the visitor hasn't overridden the region themselves.
  const checkoutSupported =
    manual || !detectedCountry || isSupportedShippingCountry(detectedCountry)

  const value: RegionContextValue = {
    region: getRegion(regionId),
    regionId,
    setRegion,
    availableRegions: Object.values(REGIONS),
    detectedCountry,
    checkoutSupported,
  }

  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>
}

export function useRegion(): RegionContextValue {
  const ctx = useContext(RegionContext)
  if (!ctx) {
    // Allow non-provider usage (server components) to fall back to the default.
    // This is only hit during hydration timing edge cases.
    return {
      region: getRegion(DEFAULT_REGION_ID),
      regionId: DEFAULT_REGION_ID,
      setRegion: () => undefined,
      availableRegions: Object.values(REGIONS),
      detectedCountry: null,
      checkoutSupported: true,
    }
  }
  return ctx
}
