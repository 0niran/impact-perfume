import { NextResponse, type NextRequest } from 'next/server'

/**
 * Geo auto-detect. The market is derived entirely from the visitor's location:
 * there is no manual market switcher in the UI anymore, so geo governs.
 *
 * Cookies:
 *   - impact_region        : NG | CA          (active region)
 *   - impact_region_manual : "1"              (honoured if ever present, but
 *                                              nothing sets it today — kept so a
 *                                              future explicit override still
 *                                              wins over geo)
 *
 * On every request:
 *   - If impact_region_manual is set, do nothing — an explicit choice wins.
 *   - Otherwise read x-vercel-ip-country. NG → NG, anything else → CA.
 *     If the geo result differs from the existing cookie, update it.
 *
 * That way:
 *   - First visit gets the geo-correct region.
 *   - A VPN switch from US to NG flips the cookie on the next request.
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

  // No country info (local dev, anonymizing proxy): leave any existing cookie
  // alone. With no cookie at all, getServerRegion already defaults to NG, so
  // there's nothing to set here.
  if (!country) return NextResponse.next()

  const regionId = country === 'NG' ? 'NG' : 'CA'

  // If the cookie already matches the geo result, no-op to avoid churn.
  if (existing === regionId) return NextResponse.next()

  // Write the region onto the *incoming* request too, then forward those
  // headers. Without this, getServerRegion() reads the pre-existing (or absent)
  // cookie on the very first visit and renders the wrong currency — e.g. a UK
  // visitor with no cookie yet defaults to NG/NGN, and only flips to CA/CAD on
  // the next navigation. Setting it on the request makes the first render use
  // the geo-correct region; setting it on the response persists it in the browser.
  request.cookies.set('impact_region', regionId)
  const response = NextResponse.next({ request: { headers: request.headers } })
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
