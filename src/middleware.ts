import { NextResponse, type NextRequest } from 'next/server'

/**
 * Region resolution. The market drives currency, pricing and checkout, so it
 * has to be both auto-detected AND user-correctable.
 *
 * Cookies:
 *   - impact_region        : NG | CA   the ACTIVE region (what the site renders)
 *   - impact_region_manual : "1"       set when the visitor picks a region by
 *                                       hand; an explicit choice always wins
 *   - impact_geo           : NG | CA   the region geo-IP detected on THIS
 *                                       request. Not authoritative — it exists
 *                                       so the client can offer to switch when
 *                                       the detected location disagrees with the
 *                                       active region (a traveller who came back
 *                                       home, or a stale manual choice).
 *
 * On every request:
 *   - Detect the region from x-vercel-ip-country (Vercel injects this in prod).
 *   - Publish it as impact_geo so the mismatch banner can compare, ALWAYS —
 *     even when a manual choice is in force, so a wrong choice stays recoverable.
 *   - If there is NO manual choice, keep the active region in sync with geo
 *     (this is what flips a returning Canadian's NG cookie back to CA).
 *   - If there IS a manual choice, leave the active region alone.
 *
 * Local dev has no geo header, so nothing changes there and getServerRegion
 * falls back to NG.
 */
export function middleware(request: NextRequest) {
  const manual = request.cookies.get('impact_region_manual')?.value === '1'
  const existingRegion = request.cookies.get('impact_region')?.value
  const existingGeo = request.cookies.get('impact_geo')?.value

  const country = (
    request.headers.get('x-vercel-ip-country') ??
    request.geo?.country ??
    ''
  ).toUpperCase()
  const detected: 'NG' | 'CA' | null = country ? (country === 'NG' ? 'NG' : 'CA') : null

  const cookieUpdates: { name: string; value: string }[] = []

  // Keep the active region in sync with geo — auto mode only. Writing it onto
  // the incoming request too means THIS render is already correct (no one-nav
  // lag), and onto the response persists it in the browser.
  if (!manual && detected && existingRegion !== detected) {
    request.cookies.set('impact_region', detected)
    cookieUpdates.push({ name: 'impact_region', value: detected })
  }

  // Publish the detected region for the client-side mismatch banner, regardless
  // of manual choice. Only write when it changed, to avoid response churn.
  if (detected && existingGeo !== detected) {
    cookieUpdates.push({ name: 'impact_geo', value: detected })
  }

  if (cookieUpdates.length === 0) return NextResponse.next()

  const response = NextResponse.next({ request: { headers: request.headers } })
  for (const c of cookieUpdates) {
    response.cookies.set(c.name, c.value, {
      maxAge: 60 * 60 * 24 * 180, // 180 days
      path: '/',
      sameSite: 'lax',
    })
  }
  return response
}

export const config = {
  // Skip static assets, API routes, and Next internals to keep middleware cheap.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images|sitemap.xml|robots.txt|studio).*)'],
}
