import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'

/**
 * Content-Security-Policy violation sink.
 *
 * The CSP was shipped in report-only mode "to tighten after a week or two of
 * real traffic" — but it carried no report-uri/report-to, so violations only
 * ever reached each visitor's own devtools console and nobody has seen one.
 * Report-only without a collector is a no-op. This endpoint is the missing
 * half: it gives us the evidence needed to enforce the policy safely.
 *
 * Browsers post here unauthenticated and without credentials, so it has to be
 * public. That makes it abusable as a log-flooding vector, hence the rate limit.
 *
 * PRIVACY: violation payloads can carry full URLs, and a document-uri may hold
 * query params (order refs, emails). We log only the fields needed to fix a
 * directive — the violated directive, the *origin* of the blocked resource, and
 * the document *pathname* — never raw query strings, never the sample/script
 * snippet.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** The subset of the CSP report shapes we care about (legacy + Reporting API). */
interface CspReportBody {
  'csp-report'?: Record<string, unknown>
  body?: Record<string, unknown>
}

/** Reduce a URL to its origin, so we never log query strings or paths. */
function toOrigin(value: unknown): string {
  if (typeof value !== 'string' || !value) return 'unknown'
  // Non-URL keywords the spec emits verbatim, e.g. "inline", "eval", "data".
  if (!value.includes('://')) return value
  try {
    return new URL(value).origin
  } catch {
    return 'unparseable'
  }
}

/** Reduce a document URL to its pathname, dropping any query/fragment. */
function toPathname(value: unknown): string {
  if (typeof value !== 'string' || !value) return 'unknown'
  try {
    return new URL(value).pathname
  } catch {
    return 'unparseable'
  }
}

export async function POST(req: NextRequest) {
  // Violations can fire many times per page; keep a lid on log volume. Browser
  // extensions are a common source of noise from a single client.
  const limit = await rateLimit(req, 'csp-report', { limit: 20, window: '1 m' })
  if (!limit.ok) return new NextResponse(null, { status: 429 })

  try {
    const raw = (await req.json()) as CspReportBody | CspReportBody[]

    // Legacy `report-uri` sends { "csp-report": {...} }; the Reporting API
    // (`report-to`) sends an array of { type, body: {...} }.
    const reports = Array.isArray(raw) ? raw : [raw]

    for (const entry of reports) {
      const r = entry?.['csp-report'] ?? entry?.body ?? entry
      if (!r || typeof r !== 'object') continue

      const directive =
        (r as Record<string, unknown>)['effective-directive'] ??
        (r as Record<string, unknown>)['violated-directive'] ??
        (r as Record<string, unknown>).effectiveDirective ??
        'unknown'

      const blocked =
        (r as Record<string, unknown>)['blocked-uri'] ??
        (r as Record<string, unknown>).blockedURL

      const document =
        (r as Record<string, unknown>)['document-uri'] ??
        (r as Record<string, unknown>).documentURL

      console.warn(
        `[csp] directive=${String(directive)} blocked=${toOrigin(blocked)} on=${toPathname(document)}`
      )
    }
  } catch {
    // Malformed body — nothing useful to log, and we must not 500 at a browser.
  }

  // 204 regardless: the browser ignores the response, and a non-2xx would only
  // invite retries.
  return new NextResponse(null, { status: 204 })
}
