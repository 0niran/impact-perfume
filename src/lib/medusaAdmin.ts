/**
 * Shared Medusa admin authentication.
 *
 * Several server paths (bespoke config read, order fulfilment, low-stock alert,
 * order reconciliation cron) need an admin token. Previously each minted its own
 * by logging in on every call, and the login code was copy-pasted. This
 * centralises it with a module-scope token cache — the same pattern gig.ts uses
 * — so a reused serverless instance (Fluid Compute) authenticates once every
 * ~50 minutes instead of on every request, and concurrent callers share a
 * single in-flight login.
 *
 * SECURITY: MEDUSA_ADMIN_EMAIL / MEDUSA_ADMIN_PASSWORD should be a dedicated,
 * rotatable service account — NOT a human super-admin login. This module is the
 * single place those credentials are used, so swapping them is a config-only
 * change with no code impact.
 */

interface CachedToken {
  token: string
  /** Epoch ms after which we re-authenticate. */
  expiresAt: number
}

// Serverless instances are reused, so this avoids logging in on every call while
// staying safe if the instance recycles (the cache just starts empty again).
let tokenCache: CachedToken | null = null
// Dedupe concurrent logins so a burst of requests triggers one auth round-trip.
let inflight: Promise<string | null> | null = null

// Medusa JWTs default to ~24h; re-auth well inside that as cheap staleness
// insurance. A 401 on any admin call should call clearMedusaAdminToken().
const TOKEN_TTL_MS = 50 * 60 * 1000

async function login(): Promise<string | null> {
  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
  const email = process.env.MEDUSA_ADMIN_EMAIL
  const password = process.env.MEDUSA_ADMIN_PASSWORD
  if (!backendUrl || !email || !password) {
    console.error('[medusaAdmin] missing admin env vars', {
      hasBackend: Boolean(backendUrl),
      hasEmail: Boolean(email),
      hasPassword: Boolean(password),
    })
    return null
  }
  try {
    const res = await fetch(`${backendUrl}/auth/user/emailpass`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('[medusaAdmin] auth failed', { status: res.status, body: body.slice(0, 300) })
      return null
    }
    const { token } = await res.json()
    return token ?? null
  } catch (err) {
    console.error('[medusaAdmin] auth threw', err instanceof Error ? err.message : err)
    return null
  }
}

/**
 * Returns a cached Medusa admin JWT, authenticating only when the cache is empty
 * or expired. Returns null when credentials are missing or auth fails — callers
 * already handle a null token (degrade / skip).
 */
export async function getMedusaAdminToken(): Promise<string | null> {
  if (tokenCache && tokenCache.expiresAt > Date.now()) return tokenCache.token
  if (!inflight) {
    inflight = login().then((token) => {
      tokenCache = token ? { token, expiresAt: Date.now() + TOKEN_TTL_MS } : null
      inflight = null
      return token
    })
  }
  return inflight
}

/** Drop the cached token so the next call re-authenticates (use after a 401). */
export function clearMedusaAdminToken(): void {
  tokenCache = null
}
