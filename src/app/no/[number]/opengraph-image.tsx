import { ImageResponse } from 'next/og'
import { getMedusaProduct, toEnrichment } from '@/lib/medusa'

/**
 * Per-product share card for the Number Series.
 *
 * A shared link is usually a specific bottle, not the shop, so the card names
 * the number and its character. Falls back to the house card's wording if the
 * catalogue is unreachable: a share must never render blank, which is the
 * failure this whole change exists to remove.
 */
export const alt = 'Impact Perfumes — Number Series'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const INK = '#0A0A08'
const BONE = '#F2E6C8'
const ACCENT = '#E4B250'
const STONE = '#8A7A60'

export default async function NumberOpengraphImage({
  params,
}: {
  params: { number: string }
}) {
  const num = parseInt(params.number, 10)

  let descriptor: string | null = null
  let signatureColor = ACCENT
  try {
    const product = await getMedusaProduct(`no-${num}`)
    const enrichment = product ? toEnrichment(product) : null
    if (enrichment) {
      descriptor = enrichment.descriptor
      signatureColor = enrichment.signatureColor || ACCENT
    }
  } catch {
    // Card still renders; a share is never worth failing the request over.
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: INK,
          position: 'relative',
        }}
      >
        {/* The product's own signature colour, so each number's card is
            recognisably its own rather than a template with the text swapped.
            It is used only as light behind the type, never as the type's own
            colour: several signature colours are dark blues and greens that
            all but vanish on this near-black ground. */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            background: `radial-gradient(circle at 50% 45%, ${signatureColor}66 0%, rgba(10,10,8,0) 66%)`,
          }}
        />

        <div style={{ display: 'flex', fontSize: 24, letterSpacing: '0.34em', color: ACCENT }}>
          IMPACT PERFUMES
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 26,
            fontSize: 128,
            color: BONE,
            letterSpacing: '0.02em',
            fontWeight: 600,
          }}
        >
          No. {Number.isNaN(num) ? '' : num}
        </div>

        {descriptor ? (
          <div
            style={{
              display: 'flex',
              marginTop: 20,
              fontSize: 44,
              color: ACCENT,
              letterSpacing: '0.06em',
            }}
          >
            {descriptor}
          </div>
        ) : null}

        <div style={{ display: 'flex', width: 96, height: 1, background: ACCENT, marginTop: 44 }} />

        <div style={{ display: 'flex', marginTop: 36, fontSize: 26, color: STONE }}>
          100ml Eau de Parfum
        </div>
      </div>
    ),
    size
  )
}
