/**
 * Next.js instrumentation hook — runs once when the server process starts.
 *
 * Used here to surface environment misconfiguration at boot rather than at the
 * moment a request happens to need a missing secret. It logs (does not throw):
 * a live store should not be taken down over one absent key, but a deploy that
 * is missing required config should say so loudly in the startup logs.
 */

export async function register(): Promise<void> {
  // Only the Node.js server runtime needs the server-side env check.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const { validateEnv } = await import('@/lib/env')
  const { ok, missing } = validateEnv()
  if (!ok) {
    console.error(
      `[env] missing required environment variables: ${missing.join(', ')} — dependent features will not work`
    )
  }
}
