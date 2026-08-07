/**
 * GIG (Agility) sandbox smoke test — validate the delivery round-trip and
 * surface the account ID GIG needs to enable live access.
 *
 *   npx tsx scripts/gig-smoke.ts            # login + quote (safe, read-only)
 *   npx tsx scripts/gig-smoke.ts --create   # also create a test shipment + track
 *
 * Reads GIG credentials from .env.local via dotenv (values never printed).
 * Point GIG_BASE_URL at the sandbox while testing:
 *   GIG_BASE_URL=https://dev-thirdpartynode.theagilitysystems.com
 *
 * Fixed Lagos coordinates are used so this needs no Google Maps key — that only
 * matters for turning a typed storefront address into coordinates.
 */
import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const BASE = (process.env.GIG_BASE_URL || 'https://dev-thirdpartynode.theagilitysystems.com').replace(/\/$/, '')
const EMAIL = process.env.GIG_EMAIL
const PASSWORD = process.env.GIG_PASSWORD

// HQ pickup (Anthony Village HQ). Override via env; defaults are approximate.
const SENDER_LAT = Number(process.env.GIG_SENDER_LAT) || 6.576
const SENDER_LNG = Number(process.env.GIG_SENDER_LNG) || 3.361
// Test receiver: Lekki Phase 1, Lagos.
const RECEIVER_LAT = 6.4478
const RECEIVER_LNG = 3.4723
const VEHICLE_TYPE = Number(process.env.GIG_VEHICLE_TYPE) || 1

function box(title: string) {
  console.log(`\n${'─'.repeat(60)}\n${title}\n${'─'.repeat(60)}`)
}

/** Recursively find the first key that looks like an account/user id. */
function findAccountId(obj: unknown, depth = 0): string | null {
  if (!obj || typeof obj !== 'object' || depth > 4) return null
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (/^(userid|user_id|id|customercode|customerid|accountid)$/i.test(k) && (typeof v === 'string' || typeof v === 'number')) {
      return `${k} = ${v}`
    }
  }
  for (const v of Object.values(obj as Record<string, unknown>)) {
    const found = findAccountId(v, depth + 1)
    if (found) return found
  }
  return null
}

async function login(): Promise<string> {
  box('1. LOGIN')
  const res = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  const json = await res.json().catch(() => ({}))
  console.log('HTTP', res.status)

  const token: string | undefined =
    json?.['access-token'] ?? json?.data?.['access-token'] ?? json?.data?.data?.['access-token']

  // Print the account/user details (without the token) so we can read the ID.
  const redacted = JSON.parse(JSON.stringify(json))
  const strip = (o: Record<string, unknown>) => {
    for (const k of Object.keys(o)) {
      if (k === 'access-token') o[k] = '***'
      else if (o[k] && typeof o[k] === 'object') strip(o[k] as Record<string, unknown>)
    }
  }
  if (redacted && typeof redacted === 'object') strip(redacted)
  console.dir(redacted, { depth: 6 })

  if (!token) throw new Error('No access-token in login response — check credentials / GIG_BASE_URL')

  const accountId = findAccountId(json)
  box('>>> ACCOUNT ID TO SHARE WITH GIG')
  console.log(accountId ?? '(could not auto-detect — read it from the login output above)')
  return token
}

async function gig(token: string, path: string, method: string, body?: unknown, query?: Record<string, string>) {
  const url = new URL(`${BASE}${path}`)
  for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, v)
  const res = await fetch(url.toString(), {
    method,
    headers: { 'Content-Type': 'application/json', 'access-token': token },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  console.log('HTTP', res.status)
  console.dir(json, { depth: 6 })
  return json
}

async function quote(token: string) {
  box('2. QUOTE  (POST /price/v3)')
  const json = await gig(token, '/price/v3', 'POST', {
    VehicleType: VEHICLE_TYPE,
    SenderLocation: { Latitude: SENDER_LAT, Longitude: SENDER_LNG },
    ReceiverLocation: { Latitude: RECEIVER_LAT, Longitude: RECEIVER_LNG },
    IsPriorityShipment: false,
    PickUpOptions: 0,
    ShipmentItems: [
      { ItemName: 'Fragrance order', Description: '2 items', Quantity: 2, Weight: 1, IsVolumetric: false, ShipmentType: 1, Value: 60000 },
    ],
  })
  const grand = json?.data?.data?.GrandTotal ?? json?.data?.GrandTotal
  console.log('\nGrandTotal (naira):', grand)
}

async function create(token: string) {
  box('3. CREATE SHIPMENT  (POST /capture/preshipment)')
  const json = await gig(token, '/capture/preshipment', 'POST', {
    SenderDetails: {
      SenderName: process.env.GIG_SENDER_NAME || 'Impact Perfumes',
      SenderPhoneNumber: process.env.GIG_SENDER_PHONE || '+2349015900134',
      SenderAddress: process.env.GIG_SENDER_ADDRESS || '1st Floor, 18 Oseni Street, Anthony Village, Lagos',
      InputtedSenderAddress: process.env.GIG_SENDER_ADDRESS || '1st Floor, 18 Oseni Street, Anthony Village, Lagos',
      SenderLocality: 'Anthony Village, Lagos',
      SenderLocation: { Latitude: SENDER_LAT, Longitude: SENDER_LNG, Name: 'Impact Perfumes HQ' },
    },
    ReceiverDetails: {
      ReceiverName: 'Test Receiver',
      ReceiverPhoneNumber: '+2348000000000',
      ReceiverAddress: 'Lekki Phase 1, Lagos',
      InputtedReceiverAddress: 'Lekki Phase 1, Lagos',
      ReceiverLocation: { Latitude: RECEIVER_LAT, Longitude: RECEIVER_LNG, Name: 'Test Receiver' },
    },
    ShipmentDetails: { VehicleType: VEHICLE_TYPE, IsPriorityShipment: false, IsCashOnDelivery: false },
    ShipmentItems: [
      { ItemName: 'Fragrance order', Description: '2 items', ShipmentType: 1, Quantity: 2, Weight: 1, IsVolumetric: false, Value: 60000 },
    ],
  })
  const waybill = json?.data?.data?.Waybill ?? json?.data?.Waybill
  console.log('\nWaybill:', waybill)
  if (!waybill) return

  box('4. LABEL  (POST /invoice/generate)')
  await gig(token, '/invoice/generate', 'POST', { Waybill: waybill })

  box('5. TRACK  (GET /track/mobileShipment)')
  await gig(token, '/track/mobileShipment', 'GET', undefined, { Waybill: String(waybill) })
}

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.error('Missing GIG_EMAIL / GIG_PASSWORD in .env.local')
    process.exit(1)
  }
  console.log('Base URL:', BASE)
  const token = await login()
  await quote(token)
  if (process.argv.includes('--create')) await create(token)
  box('DONE')
}

main().catch((err) => {
  console.error('\nSmoke test failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
