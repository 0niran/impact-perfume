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
  const existingRegion = request.cookies.get('impact_region')?.value
  const existingCountry = request.cookies.get('impact_country')?.value

  const country = (
    request.headers.get('x-vercel-ip-country') ??
    request.geo?.country ??
    ''
  ).toUpperCase()

  const response = NextResponse.next()
  const cookieOpts = {
    maxAge: 60 * 60 * 24 * 180, // 180 days
    path: '/',
    sameSite: 'lax' as const,
  }

  // Always record the visitor's physical country. The checkout page uses it to
  // gate geographies we don't ship to (NG/CA only). Kept independent of the
  // manual region lock, since the lock changes the *currency* the visitor
  // browses in, not where they physically are.
  if (country && existingCountry !== country) {
    response.cookies.set('impact_country', country, cookieOpts)
  }

  // Honour an explicit manual region choice — don't second-guess the visitor.
  if (manual) return response

  // No country info (local dev, anonymizing proxy): leave the region cookie
  // alone. With no cookie at all, getServerRegion already defaults to NG.
  if (!country) return response

  const regionId = country === 'NG' ? 'NG' : 'CA'
  if (existingRegion !== regionId) {
    response.cookies.set('impact_region', regionId, cookieOpts)
  }
  return response
}

export const config = {
  // Skip static assets, API routes, and Next internals to keep middleware cheap.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images|sitemap.xml|robots.txt|studio).*)'],
}
