/**
 * Local image overrides for Signature products.
 *
 * The Medusa-hosted Signature images point at `localhost:9000/static/...`
 * URLs that don't resolve in production. Until the owner uploads them to
 * the Railway Medusa instance (or a dedicated CDN), serve the bottle
 * photo from /public/images so the PDP actually renders something.
 *
 * Update this map whenever new Signature artwork lands in /public/images.
 */
const SIGNATURE_LOCAL_IMAGE: Record<string, string> = {
  'enigma': '/images/Enigma.png',
  'oud-osmosis-unlimited': '/images/OUD Osmosis Unlimited.png',
  'royale-silver': '/images/Royale_Product.png',
  'solid-oud': '/images/Solid Oud.png',
  'mystikal': '/images/Mystikal.png',
}

export function signatureImageFor(handle: string): string | undefined {
  return SIGNATURE_LOCAL_IMAGE[handle]
}
