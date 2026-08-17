/**
 * Server-side address geocoding via the Google Maps Geocoding API.
 *
 * GIG prices and books deliveries by coordinates, but the checkout collects a
 * text address. This turns the typed Nigerian address into latitude/longitude,
 * restricted to Nigeria so partial addresses resolve to the right country.
 *
 * Required env (server-side):
 *   GOOGLE_MAPS_API_KEY   a key with the Geocoding API enabled + billing on
 */

import { serverEnv } from '@/lib/env'

export interface GeocodeResult {
  lat: number
  lng: number
  /** Google's normalised address string, handy for the shipment record. */
  formattedAddress: string
}

/**
 * Geocode a free-text Nigerian address. Returns null when the key is missing,
 * the request fails, or Google can't resolve the address — callers decide how
 * to degrade (checkout blocks the quote and asks the customer to check it).
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const key = serverEnv.googleMapsApiKey
  if (!key) {
    console.error('[geocode] GOOGLE_MAPS_API_KEY not set')
    return null
  }
  const query = address.trim()
  if (!query) return null

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  url.searchParams.set('address', query)
  // Bias + restrict to Nigeria so "Ikoyi, Lagos" doesn't resolve abroad.
  url.searchParams.set('region', 'ng')
  url.searchParams.set('components', 'country:NG')
  url.searchParams.set('key', key)

  try {
    const res = await fetch(url.toString(), { cache: 'no-store' })
    if (!res.ok) {
      console.error('[geocode] HTTP error', res.status)
      return null
    }
    const data = (await res.json()) as {
      status: string
      results?: Array<{
        formatted_address?: string
        geometry?: { location?: { lat?: number; lng?: number } }
      }>
    }
    if (data.status !== 'OK' || !data.results?.length) {
      // ZERO_RESULTS is an expected "bad address" outcome, not an error.
      if (data.status !== 'ZERO_RESULTS') {
        console.error('[geocode] non-OK status', data.status)
      }
      return null
    }
    const top = data.results[0]
    const loc = top.geometry?.location
    if (typeof loc?.lat !== 'number' || typeof loc?.lng !== 'number') return null
    return {
      lat: loc.lat,
      lng: loc.lng,
      formattedAddress: top.formatted_address ?? query,
    }
  } catch (err) {
    console.error('[geocode] threw', err instanceof Error ? err.message : err)
    return null
  }
}
