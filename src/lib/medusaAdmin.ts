/**
 * Shared Medusa admin authentication.
 *
 * The server paths that need admin access (bespoke config read, order
 * fulfilment, low-stock alert, order reconciliation cron) authenticate with a
 * Medusa v2 SECRET API KEY rather than a human user's email + password.
 *
 * A secret key is a machine credential: it is not tied to a person, it is
 * independently revocable, and it rotates without changing anyone's password.
 * Medusa v2 accepts it on the Admin API via HTTP Basic auth — the key is the
 * Basic-auth username with an empty password — so there is no login round-trip
 * and no token to cache or expire.
 *
 * SECURITY: MEDUSA_ADMIN_API_KEY is a full-admin-scope secret. Keep it in
 * server env only (never NEXT_PUBLIC_*). Rotate by creating a new secret key in
 * the Medusa admin, updating the env var, then deleting the old key.
 */

/**
 * Returns the Authorization header value for Medusa admin requests, or null
 * when the key is unset. Callers already degrade or skip on a null, so a
 * missing key never throws — it just disables the admin-backed feature and logs
 * once.
 *
 * Medusa v2 takes the secret key as the Basic-auth username with an empty
 * password, i.e. base64("<key>:").
 */
export function getMedusaAdminAuthHeader(): string | null {
  const key = process.env.MEDUSA_ADMIN_API_KEY
  if (!key) {
    console.error('[medusaAdmin] MEDUSA_ADMIN_API_KEY not set')
    return null
  }
  const encoded = Buffer.from(`${key}:`).toString('base64')
  return `Basic ${encoded}`
}
