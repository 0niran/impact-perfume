import { ImageResponse } from 'next/og'
import { SITE_CONFIG } from '@/lib/config'

/**
 * Site-wide share card.
 *
 * Every page previously pointed og:image at /og-default.jpg, which does not
 * exist in public/ — so every share on WhatsApp, Instagram, iMessage, X and
 * LinkedIn rendered a blank card. WhatsApp is a primary channel for this
 * business, so that was a commercial bug, not a cosmetic one.
 *
 * Generating the card instead of shipping a JPEG means it cannot silently go
 * missing again, it costs no binary in the repo, and it stays in step with the
 * brand tokens. Next serves this at /opengraph-image and injects the meta tags
 * itself; the convention cascades to every route that does not define its own,
 * so pages no longer hand-roll an images array.
 */
export const alt = `${SITE_CONFIG.name} — composed for character.`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Brand tokens, mirrored from tailwind.config.ts. ImageResponse resolves no
// stylesheet, so these are inline by necessity.
const INK = '#0A0A08'
const BONE = '#F2E6C8'
const ACCENT = '#E4B250'
const STONE = '#8A7A60'

export default function OpengraphImage() {
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
        {/* Warm centre glow, the same device the header medallion uses so the
            card reads as lit rather than flat. */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            background:
              'radial-gradient(circle at 50% 45%, rgba(228,178,80,0.20) 0%, rgba(10,10,8,0) 62%)',
          }}
        />

        <div
          style={{
            display: 'flex',
            fontSize: 104,
            letterSpacing: '0.14em',
            color: BONE,
            fontWeight: 600,
          }}
        >
          IMPACT
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 18,
            fontSize: 26,
            letterSpacing: '0.34em',
            color: ACCENT,
          }}
        >
          PERFUMES &amp; OILS
        </div>

        <div style={{ display: 'flex', width: 96, height: 1, background: ACCENT, marginTop: 40 }} />

        <div
          style={{
            display: 'flex',
            marginTop: 40,
            fontSize: 30,
            color: STONE,
            letterSpacing: '0.04em',
          }}
        >
          Composed for character.
        </div>
      </div>
    ),
    size
  )
}
