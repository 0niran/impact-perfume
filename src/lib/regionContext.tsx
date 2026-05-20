'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import {
  DEFAULT_REGION_ID,
  REGIONS,
  type Region,
  type RegionId,
  getRegion,
} from './region'

const COOKIE_NAME = 'impact_region'
const MANUAL_COOKIE_NAME = 'impact_region_manual'
const COOKIE_MAX_AGE_DAYS = 180

interface RegionContextValue {
  region: Region
  regionId: RegionId
  setRegion: (id: RegionId) => void
  availableRegions: Region[]
}

const RegionContext = createContext<RegionContextValue | null>(null)

function readCookie(): RegionId | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`))
  if (!match) return null
  const value = decodeURIComponent(match[1])
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

  // Hydrate from cookie after mount (cookie wins over SSR default)
  useEffect(() => {
    const fromCookie = readCookie()
    if (fromCookie && fromCookie !== regionId) {
      setRegionIdState(fromCookie)
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setRegion = useCallback((id: RegionId) => {
    setRegionIdState(id)
    writeCookie(id)
  }, [])

  const value: RegionContextValue = {
    region: getRegion(regionId),
    regionId,
    setRegion,
    availableRegions: Object.values(REGIONS),
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
    }
  }
  return ctx
}
