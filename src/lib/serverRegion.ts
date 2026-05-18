import { cookies } from 'next/headers'
import { DEFAULT_REGION_ID, REGIONS, type Region, type RegionId } from './region'

/**
 * Server-side helper to read the active region from the impact_region cookie.
 * Falls back to DEFAULT_REGION_ID (NG) when no cookie is set.
 *
 * Calling this from a Server Component will opt the route into dynamic
 * rendering — that is intended because prices vary by region.
 */
export function getServerRegion(): Region {
  const value = cookies().get('impact_region')?.value
  const id = value === 'NG' || value === 'CA' ? (value as RegionId) : DEFAULT_REGION_ID
  return REGIONS[id]
}
