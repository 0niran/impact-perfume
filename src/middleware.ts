import { NextResponse, type NextRequest } from 'next/server'

/**
 * Geo auto-detect with manual override.
 *
 * Two cookies coordinate this:
 *   - impact_region        : NG | CA          (active region)
 *   - impact_region_manual : "1"              (set by the header switcher
 *                                              to lock the choice across visits)
 *
 * On every request:
 *   - If impact_region_manual is set, do nothing — the visitor picked.
 *   - Otherwise read x-vercel-ip-country. NG → NG, anything else → CA.
 *     If the geo result differs from the existing cookie, update it.
 *
 * That way:
 *   - First visit gets the geo-correct region.
 *   - A VPN switch from US to NG flips the cookie on the next request.
 *   - Clicking the header switcher locks the choice in (manual cookie set
 *     by RegionSwitcher.tsx) and geo will stop overriding.
 *
 * Vercel exposes the geo info via the `x-vercel-ip-country` request header
 * (also `request.geo` in Edge/Node middleware). Local dev has neither, so
 * the cookie stays at whatever it was.
 */
export function middleware(request: NextRequest) {
  const manual = request.cookies.get('impact_region_manual')?.value === '1'
  const existing = request.cookies.get('impact_region')?.value

  // Honour an explicit manual choice — don't second-guess the visitor.
  if (manual) return NextResponse.next()

  const country = (
    request.headers.get('x-vercel-ip-country') ??
    request.geo?.country ??
    ''
  ).toUpperCase()

  // No country info available (local dev, anonymizing proxy). Leave any
  // existing cookie alone; otherwise default to NG.
  if (!country) {
    if (existing) return NextResponse.next()
    return NextResponse.next()
  }

  const regionId = country === 'NG' ? 'NG' : 'CA'

  // If the cookie already matches the geo result, no-op to avoid churn.
  if (existing === regionId) return NextResponse.next()

  const response = NextResponse.next()
  response.cookies.set('impact_region', regionId, {
    maxAge: 60 * 60 * 24 * 180, // 180 days
    path: '/',
    sameSite: 'lax',
  })
  return response
}

export const config = {
  // Skip static assets, API routes, and Next internals to keep middleware cheap.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images|sitemap.xml|robots.txt|studio).*)'],
}
