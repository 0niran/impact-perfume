/**
 * Server-side Google Places API (New) helpers for checkout address
 * autocomplete. The API key stays on the server (same GOOGLE_MAPS_API_KEY the
 * geocoder uses); the browser talks only to our own /api/delivery/address/*
 * proxy routes, so the key is never exposed and calls can be rate-limited.
 *
 * Requires the "Places API (New)" enabled on the key (Geocoding is already on).
 *
 * Session tokens: pass the same token through the autocomplete calls and the
 * final details lookup so Google bills them as one session.
 */

const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete'
const DETAILS_URL = 'https://places.googleapis.com/v1/places'

export interface PlaceSuggestion {
  placeId: string
  /** Primary line, e.g. "15 Bourdillon Road". */
  primary: string
  /** Secondary line, e.g. "Ikoyi, Lagos, Nigeria". */
  secondary: string
}

export interface PlaceDetails {
  lat: number
  lng: number
  formattedAddress: string
  address1: string
  city: string
  state: string
}

function key(): string | null {
  const k = process.env.GOOGLE_MAPS_API_KEY
  if (!k) {
    console.error('[places] GOOGLE_MAPS_API_KEY not set')
    return null
  }
  return k
}

/**
 * Autocomplete predictions for a typed query, biased/restricted to a country.
 * Returns [] on any failure so the caller can degrade to manual entry.
 */
export async function placesAutocomplete(
  input: string,
  opts: { regionCode?: string; sessionToken?: string }
): Promise<PlaceSuggestion[]> {
  const k = key()
  const query = input.trim()
  if (!k || query.length < 3) return []

  try {
    const res = await fetch(AUTOCOMPLETE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': k,
        // Only the fields we render, to keep the response small + cheap.
        'X-Goog-FieldMask':
          'suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat',
      },
      body: JSON.stringify({
        input: query,
        includedRegionCodes: [(opts.regionCode ?? 'ng').toLowerCase()],
        languageCode: 'en',
        ...(opts.sessionToken ? { sessionToken: opts.sessionToken } : {}),
      }),
      cache: 'no-store',
    })
    if (!res.ok) {
      console.error('[places] autocomplete HTTP', res.status)
      return []
    }
    const data = (await res.json()) as {
      suggestions?: Array<{
        placePrediction?: {
          placeId?: string
          structuredFormat?: {
            mainText?: { text?: string }
            secondaryText?: { text?: string }
          }
        }
      }>
    }
    return (data.suggestions ?? [])
      .map((s) => s.placePrediction)
      .filter((p): p is NonNullable<typeof p> => Boolean(p?.placeId))
      .map((p) => ({
        placeId: p.placeId!,
        primary: p.structuredFormat?.mainText?.text ?? '',
        secondary: p.structuredFormat?.secondaryText?.text ?? '',
      }))
  } catch (err) {
    console.error('[places] autocomplete threw', err instanceof Error ? err.message : err)
    return []
  }
}

function component(
  components: Array<{ types?: string[]; longText?: string; shortText?: string }>,
  types: string[],
  short = false
): string {
  for (const t of types) {
    const hit = components.find((c) => c.types?.includes(t))
    if (hit) return (short ? hit.shortText : hit.longText) ?? ''
  }
  return ''
}

/**
 * Resolve a placeId to coordinates + a structured address. Returns null on any
 * failure. The coordinates here are authoritative (from Google for the selected
 * place), so callers can trust them rather than a client-asserted lat/lng.
 */
export async function placeDetails(
  placeId: string,
  opts: { sessionToken?: string } = {}
): Promise<PlaceDetails | null> {
  const k = key()
  if (!k || !placeId) return null

  const url = new URL(`${DETAILS_URL}/${encodeURIComponent(placeId)}`)
  if (opts.sessionToken) url.searchParams.set('sessionToken', opts.sessionToken)

  try {
    const res = await fetch(url.toString(), {
      headers: {
        'X-Goog-Api-Key': k,
        'X-Goog-FieldMask': 'formattedAddress,addressComponents,location',
      },
      cache: 'no-store',
    })
    if (!res.ok) {
      console.error('[places] details HTTP', res.status)
      return null
    }
    const d = (await res.json()) as {
      formattedAddress?: string
      location?: { latitude?: number; longitude?: number }
      addressComponents?: Array<{ types?: string[]; longText?: string; shortText?: string }>
    }
    const lat = d.location?.latitude
    const lng = d.location?.longitude
    if (typeof lat !== 'number' || typeof lng !== 'number') return null

    const comps = d.addressComponents ?? []
    const streetNumber = component(comps, ['street_number'])
    const route = component(comps, ['route'])
    const address1 = [streetNumber, route].filter(Boolean).join(' ').trim()

    return {
      lat,
      lng,
      formattedAddress: d.formattedAddress ?? '',
      address1,
      // NG addresses land the city on locality/sublocality/admin-2; fall through.
      city: component(comps, ['locality', 'sublocality', 'administrative_area_level_2']),
      state: component(comps, ['administrative_area_level_1']),
    }
  } catch (err) {
    console.error('[places] details threw', err instanceof Error ? err.message : err)
    return null
  }
}
