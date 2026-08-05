/**
 * GIG Logistics (Agility) client — Nigerian door-to-door delivery.
 *
 * The full round-trip:
 *   1. login            POST /login                 -> access token (JWT)
 *   2. quote            POST /price/v3              -> delivery fee (checkout)
 *   3. create shipment  POST /capture/preshipment   -> waybill (fulfilment)
 *   4. label            POST /invoice/generate      -> PDF waybill label URL
 *   5. track            GET  /track/mobileShipment  -> tracking events
 *
 * All calls are server-side only (they carry the partner login). Money from
 * GIG arrives in MAJOR units (naira); the storefront works in MINOR units
 * (kobo), so we multiply by 100 at this boundary — mirroring lib/medusa.ts.
 *
 * The GIG account is debited implicitly when a shipment is created, so the
 * business must keep that account funded. No wallet call is needed here
 * (chargeWallet is for utility bills, not shipments).
 *
 * Required env (server-side, set on Vercel):
 *   GIG_EMAIL, GIG_PASSWORD          partner login
 *   GIG_BASE_URL                     defaults to production
 *   GIG_SENDER_LAT, GIG_SENDER_LNG   the HQ pickup coordinates
 *   GIG_SENDER_NAME, GIG_SENDER_PHONE, GIG_SENDER_ADDRESS
 *                                    default to SITE_CONFIG contact details
 * Optional env:
 *   GIG_SENDER_STATION_ID            HQ station id (helps GIG routing)
 *   GIG_VEHICLE_TYPE                 1 Bike (default) | 2 Van | 3 Truck
 *   GIG_ITEM_WEIGHT_KG               per-unit parcel weight, default 0.5
 */

import { SITE_CONFIG } from '@/lib/config'

const DEFAULT_BASE_URL = 'https://thirdpartynode.theagilitysystems.com'

/** GIG PickUpOptions enum. We only do home delivery. */
const PICKUP_HOME_DELIVERY = 0

/** Regular (non-special) shipment. */
const SHIPMENT_TYPE_REGULAR = 1

export interface GigConfig {
  baseUrl: string
  email: string
  password: string
  senderLat: number
  senderLng: number
  senderName: string
  senderPhone: string
  senderAddress: string
  senderStationId?: number
  vehicleType: number
  perItemWeightKg: number
}

/**
 * Read config from env. Returns null (rather than throwing) when the partner
 * login is missing, so callers can degrade gracefully — an un-configured GIG
 * account must never break checkout or an order that was already paid.
 */
export function getGigConfig(): GigConfig | null {
  const email = process.env.GIG_EMAIL
  const password = process.env.GIG_PASSWORD
  if (!email || !password) return null

  const senderLat = Number(process.env.GIG_SENDER_LAT)
  const senderLng = Number(process.env.GIG_SENDER_LNG)
  if (!Number.isFinite(senderLat) || !Number.isFinite(senderLng)) {
    console.error('[gig] GIG_SENDER_LAT / GIG_SENDER_LNG missing or invalid')
    return null
  }

  const stationRaw = process.env.GIG_SENDER_STATION_ID
  const senderStationId = stationRaw ? Number(stationRaw) : undefined

  return {
    baseUrl: (process.env.GIG_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, ''),
    email,
    password,
    senderLat,
    senderLng,
    senderName: process.env.GIG_SENDER_NAME || SITE_CONFIG.shortName,
    senderPhone: process.env.GIG_SENDER_PHONE || SITE_CONFIG.contact.phone,
    senderAddress:
      process.env.GIG_SENDER_ADDRESS ||
      `${SITE_CONFIG.contact.address.line1}, ${SITE_CONFIG.contact.address.line2}`,
    senderStationId: Number.isFinite(senderStationId) ? senderStationId : undefined,
    vehicleType: Number(process.env.GIG_VEHICLE_TYPE) || 1,
    perItemWeightKg: Number(process.env.GIG_ITEM_WEIGHT_KG) || 0.5,
  }
}

/** True when the integration is configured — used to gate features cheaply. */
export function isGigConfigured(): boolean {
  return getGigConfig() !== null
}

// --- Auth (token cache) ---------------------------------------------------

interface CachedToken {
  token: string
  /** Epoch ms when we should stop trusting the cached token. */
  expiresAt: number
}

// Module-scope cache. Serverless instances are reused (Fluid Compute), so this
// avoids logging in on every call while staying safe if the instance recycles.
let tokenCache: CachedToken | null = null

// Log in fresh a little before the assumed JWT lifetime. GIG doesn't document
// expiry, so we re-auth every 50 minutes — cheap insurance against staleness.
const TOKEN_TTL_MS = 50 * 60 * 1000

async function login(cfg: GigConfig): Promise<string | null> {
  try {
    const res = await fetch(`${cfg.baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cfg.email, password: cfg.password }),
      cache: 'no-store',
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('[gig] login failed', { status: res.status, body: body.slice(0, 300) })
      return null
    }
    const json = await res.json().catch(() => ({}))
    // The token is returned as `access-token`, possibly nested under `data`.
    const token: string | undefined =
      json?.['access-token'] ??
      json?.data?.['access-token'] ??
      json?.data?.data?.['access-token']
    if (!token) {
      console.error('[gig] login response missing access-token')
      return null
    }
    return token
  } catch (err) {
    console.error('[gig] login threw', err instanceof Error ? err.message : err)
    return null
  }
}

async function getToken(cfg: GigConfig): Promise<string | null> {
  if (tokenCache && tokenCache.expiresAt > Date.now()) return tokenCache.token
  const token = await login(cfg)
  if (!token) {
    tokenCache = null
    return null
  }
  tokenCache = { token, expiresAt: Date.now() + TOKEN_TTL_MS }
  return token
}

/**
 * Authenticated GIG request. On a 401 it clears the token cache and retries
 * once with a fresh login, so an expired token self-heals.
 */
async function gigFetch(
  cfg: GigConfig,
  path: string,
  init: { method: string; body?: unknown; query?: Record<string, string> },
  retryOnAuth = true
): Promise<Record<string, unknown> | null> {
  const token = await getToken(cfg)
  if (!token) return null

  const url = new URL(`${cfg.baseUrl}${path}`)
  for (const [k, v] of Object.entries(init.query ?? {})) url.searchParams.set(k, v)

  try {
    const res = await fetch(url.toString(), {
      method: init.method,
      headers: {
        'Content-Type': 'application/json',
        // GIG authenticates via the `access-token` header (not Bearer).
        'access-token': token,
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: 'no-store',
    })

    if (res.status === 401 && retryOnAuth) {
      tokenCache = null
      return gigFetch(cfg, path, init, false)
    }

    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) {
      console.error('[gig] request failed', {
        path,
        status: res.status,
        body: JSON.stringify(json).slice(0, 400),
      })
      return null
    }
    return json
  } catch (err) {
    console.error('[gig] request threw', { path, err: err instanceof Error ? err.message : err })
    return null
  }
}

/**
 * GIG wraps every payload as { success, data: { message, status, data } }.
 * Unwrap to the innermost `data`.
 */
function unwrap(json: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!json) return null
  const outer = (json.data ?? json) as Record<string, unknown>
  const inner = (outer.data ?? outer) as Record<string, unknown>
  return inner ?? null
}

// --- Quote ----------------------------------------------------------------

export interface QuoteParams {
  receiverLat: number
  receiverLng: number
  /** Total number of units in the order (all lines summed). */
  itemCount: number
  /** Order subtotal in MAJOR units (naira) — used by GIG for insurance value. */
  declaredValueMajor: number
}

export interface QuoteResult {
  /** Delivery fee (GrandTotal) in MINOR units (kobo). */
  feeMinor: number
}

/**
 * Fetch a live delivery fee for a home delivery from the HQ to the receiver's
 * coordinates. Returns null on any failure so the caller can decide how to
 * degrade.
 */
export async function quoteDelivery(params: QuoteParams): Promise<QuoteResult | null> {
  const cfg = getGigConfig()
  if (!cfg) return null

  const body = {
    ...(cfg.senderStationId ? { SenderStationId: cfg.senderStationId } : {}),
    VehicleType: cfg.vehicleType,
    SenderLocation: { Latitude: cfg.senderLat, Longitude: cfg.senderLng },
    ReceiverLocation: { Latitude: params.receiverLat, Longitude: params.receiverLng },
    IsPriorityShipment: false,
    PickUpOptions: PICKUP_HOME_DELIVERY,
    ShipmentItems: [
      {
        ItemName: 'Fragrance order',
        Description: `${params.itemCount} item${params.itemCount === 1 ? '' : 's'}`,
        Quantity: Math.max(1, params.itemCount),
        Weight: Math.max(0.1, params.itemCount * cfg.perItemWeightKg),
        IsVolumetric: false,
        ShipmentType: SHIPMENT_TYPE_REGULAR,
        Value: Math.max(0, Math.round(params.declaredValueMajor)),
      },
    ],
  }

  const inner = unwrap(await gigFetch(cfg, '/price/v3', { method: 'POST', body }))
  const grandTotal = inner?.GrandTotal
  if (typeof grandTotal !== 'number' || !Number.isFinite(grandTotal)) {
    console.error('[gig] quote missing GrandTotal')
    return null
  }
  // GrandTotal is naira (major); the storefront contract is kobo (minor).
  return { feeMinor: Math.round(grandTotal * 100) }
}

// --- Create shipment ------------------------------------------------------

export interface CreateShipmentParams {
  receiverName: string
  receiverPhone: string
  receiverLat: number
  receiverLng: number
  /** Full destination address as one line. */
  receiverAddress: string
  itemCount: number
  declaredValueMajor: number
}

export interface ShipmentResult {
  waybill: string
  /** PDF label URL, when invoice generation succeeded. */
  labelUrl?: string
}

/**
 * Book a home-delivery shipment and return its waybill. Best-effort label
 * generation is attempted but a label failure does not fail the shipment.
 */
export async function createShipment(
  params: CreateShipmentParams
): Promise<ShipmentResult | null> {
  const cfg = getGigConfig()
  if (!cfg) return null

  const body = {
    SenderDetails: {
      SenderName: cfg.senderName,
      SenderPhoneNumber: cfg.senderPhone,
      ...(cfg.senderStationId ? { SenderStationId: cfg.senderStationId } : {}),
      SenderAddress: cfg.senderAddress.slice(0, 500),
      InputtedSenderAddress: cfg.senderAddress.slice(0, 500),
      SenderLocality: SITE_CONFIG.contact.address.line2,
      SenderLocation: {
        Latitude: cfg.senderLat,
        Longitude: cfg.senderLng,
        FormattedAddress: cfg.senderAddress,
        Name: cfg.senderName,
      },
    },
    ReceiverDetails: {
      ReceiverName: params.receiverName,
      ReceiverPhoneNumber: params.receiverPhone,
      ReceiverAddress: params.receiverAddress.slice(0, 500),
      InputtedReceiverAddress: params.receiverAddress.slice(0, 500),
      ReceiverLocation: {
        Latitude: params.receiverLat,
        Longitude: params.receiverLng,
        FormattedAddress: params.receiverAddress,
        Name: params.receiverName,
      },
    },
    ShipmentDetails: {
      VehicleType: cfg.vehicleType,
      IsPriorityShipment: false,
      IsCashOnDelivery: false,
    },
    ShipmentItems: [
      {
        ItemName: 'Fragrance order',
        Description: `${params.itemCount} item${params.itemCount === 1 ? '' : 's'}`,
        ShipmentType: SHIPMENT_TYPE_REGULAR,
        Quantity: Math.max(1, params.itemCount),
        Weight: Math.max(0.1, params.itemCount * cfg.perItemWeightKg),
        IsVolumetric: false,
        Value: Math.max(0, Math.round(params.declaredValueMajor)),
      },
    ],
  }

  const inner = unwrap(await gigFetch(cfg, '/capture/preshipment', { method: 'POST', body }))
  const waybill = inner?.Waybill
  if (typeof waybill !== 'string' || !waybill) {
    console.error('[gig] createShipment missing Waybill')
    return null
  }

  const labelUrl = await generateLabel(cfg, waybill)
  return { waybill, labelUrl }
}

async function generateLabel(cfg: GigConfig, waybill: string): Promise<string | undefined> {
  const inner = unwrap(
    await gigFetch(cfg, '/invoice/generate', { method: 'POST', body: { Waybill: waybill } })
  )
  const label = inner?.WaybillLabel ?? inner?.waybillLabel
  return typeof label === 'string' ? label : undefined
}

// --- Track ----------------------------------------------------------------

export interface TrackingEvent {
  dateTime: string
  status: string
  description: string
}

export interface TrackingResult {
  waybill: string
  events: TrackingEvent[]
}

/** Fetch tracking events for a waybill. Returns null on failure. */
export async function trackShipment(waybill: string): Promise<TrackingResult | null> {
  const cfg = getGigConfig()
  if (!cfg) return null

  const json = await gigFetch(cfg, '/track/mobileShipment', {
    method: 'GET',
    query: { Waybill: waybill },
  })
  const inner = unwrap(json)
  // The tracked shipment array can sit at the unwrapped level or one deeper.
  const shipments = (Array.isArray(inner) ? inner : (inner as Record<string, unknown>)?.data) as
    | Array<Record<string, unknown>>
    | undefined
  const first = Array.isArray(shipments) ? shipments[0] : (inner as Record<string, unknown>)
  if (!first) return null

  const rawEvents = (first.MobileShipmentTrackings ?? []) as Array<Record<string, unknown>>
  const events: TrackingEvent[] = rawEvents.map((e) => ({
    dateTime: String(e.DateTime ?? e.DateTimeUtc ?? ''),
    status: String(e.Status ?? ''),
    description: String(e.ScanStatusReason ?? e.ScanStatusIncident ?? e.ScanStatusComment ?? ''),
  }))

  return { waybill, events }
}

/** Public tracking URL a customer can open on GIG's site. */
export function gigTrackingUrl(waybill: string): string {
  return `https://giglogistics.com/track?waybill=${encodeURIComponent(waybill)}`
}
