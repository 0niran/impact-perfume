import { NextResponse, type NextRequest } from 'next/server'

/**
 * Geo auto-detect: on first visit, infer the region from the user's IP country
 * and set the impact_region cookie. Nigeria gets NG (NGN/Paystack); everyone
 * else gets CA (CAD/Stripe).
 *
 * The cookie persists for 180 days. If it's already set we skip — manual
 * picks via the header switcher always win.
 *
 * Vercel exposes the geo info via the `x-vercel-ip-country` request header
 * (also `request.geo` in Edge/Node middleware). In local dev neither is
 * available, so the default falls through and the storefront uses NG.
 */
export function middleware(request: NextRequest) {
  const existing = request.cookies.get('impact_region')
  if (existing) return NextResponse.next()

  const country = (
    request.headers.get('x-vercel-ip-country') ??
    request.geo?.country ??
    ''
  ).toUpperCase()

  // No country info (local dev, anonymizing proxy, etc.) — let the client default to NG.
  if (!country) return NextResponse.next()

  const regionId = country === 'NG' ? 'NG' : 'CA'

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
