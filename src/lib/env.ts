/**
 * Typed, validated access to server-side environment variables.
 *
 * Secrets and infrastructure config were previously read as bare
 * `process.env.X` from ~30 call sites, each re-deriving the same key name and
 * fallback. This module is the single registry for the server-only variables:
 * one place to see what the app needs, and one `validateEnv()` that fails fast
 * with the full list of what is missing instead of surfacing an `undefined`
 * deep inside a request.
 *
 * Reads are LIVE getters (not captured at import) so anything that flips an env
 * var at runtime — tests, feature flags — sees the current value. Values keep
 * their existing semantics exactly: a variable that was optional stays
 * optional; callers that already guard a missing value keep doing so.
 *
 * SCOPE: server-only variables. The `NEXT_PUBLIC_*` variables are statically
 * inlined into the client bundle by Next.js and must be referenced directly at
 * their use sites, so they are intentionally not routed through here. Referring
 * to a server secret from client code yields `undefined` (Next.js only inlines
 * `NEXT_PUBLIC_*`), so no secret is ever bundled to the browser.
 */

/** Read a boolean flag: true only for the exact string "true". */
function flag(name: string): boolean {
  return process.env[name] === 'true'
}

/**
 * Server-only environment variables. Each getter reads `process.env` live and
 * returns the raw value (or undefined) so existing presence checks are
 * unchanged.
 */
export const serverEnv = {
  // --- Payments ---
  get stripeSecretKey(): string | undefined {
    return process.env.STRIPE_SECRET_KEY
  },
  get stripeWebhookSecret(): string | undefined {
    return process.env.STRIPE_WEBHOOK_SECRET
  },
  get stripeTaxEnabled(): boolean {
    return flag('STRIPE_TAX_ENABLED')
  },
  get paystackSecretKey(): string | undefined {
    return process.env.PAYSTACK_SECRET_KEY
  },

  // --- Scheduled jobs / webhooks ---
  get cronSecret(): string | undefined {
    return process.env.CRON_SECRET
  },
  get medusaWebhookSecret(): string | undefined {
    return process.env.MEDUSA_WEBHOOK_SECRET
  },

  // --- Email ---
  get resendApiKey(): string | undefined {
    return process.env.RESEND_API_KEY
  },

  // --- Delivery ---
  get googleMapsApiKey(): string | undefined {
    return process.env.GOOGLE_MAPS_API_KEY
  },
  get gigQuoteSecret(): string | undefined {
    return process.env.GIG_QUOTE_SECRET
  },
} as const

/**
 * Variables that must be present for the corresponding feature to work in
 * production. These are the ones whose absence is a genuine misconfiguration
 * rather than an intentionally-off feature, so `validateEnv()` reports them.
 */
const REQUIRED_SERVER_VARS = [
  'STRIPE_SECRET_KEY',
  'PAYSTACK_SECRET_KEY',
  'CRON_SECRET',
  'RESEND_API_KEY',
] as const

export interface EnvValidation {
  ok: boolean
  missing: string[]
}

/**
 * Reports which required server variables are absent. Non-throwing so a caller
 * can decide the posture (log at boot, fail a health check, etc.). Call from a
 * server startup boundary; safe to call anywhere — it only reads env.
 */
export function validateEnv(): EnvValidation {
  const missing = REQUIRED_SERVER_VARS.filter((name) => !process.env[name])
  return { ok: missing.length === 0, missing }
}

/**
 * Throws with the aggregated list when any required server variable is missing.
 * Use where the app genuinely cannot proceed without them.
 */
export function assertEnv(): void {
  const { ok, missing } = validateEnv()
  if (!ok) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}
