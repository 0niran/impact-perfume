'use client'

import Image from 'next/image'
import { useState } from 'react'

const DEFAULT_FALLBACK = '/images/no_series.png'

interface ColorPanelProps {
  number: number
  descriptor: string
  signatureColor: string
  /** Retained for backwards compatibility with callers; no longer rendered. */
  signatureColorName?: string
  imageUrl?: string | null
  /** Override the default Number Series bottle fallback (e.g. for Oils) */
  fallbackImage?: string
  /** Title prefix shown beneath the bottle */
  titlePrefix?: string
}

export default function ColorPanel({
  number,
  descriptor,
  signatureColor,
  imageUrl,
  fallbackImage = DEFAULT_FALLBACK,
  titlePrefix = 'No.',
}: ColorPanelProps) {
  const [src, setSrc] = useState(imageUrl ?? fallbackImage)

  return (
    <div className="relative flex min-h-[50vh] flex-col items-center justify-center overflow-hidden bg-ink lg:sticky lg:top-0 lg:min-h-screen md:min-h-[60vh]">
      {/* Subtle signature-color glow for product identity */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center, ${signatureColor}33 0%, transparent 60%)`,
        }}
        aria-hidden="true"
      />

      {/* Bottle image */}
      <div className="relative z-10 h-[280px] w-[280px] md:h-[360px] md:w-[360px] lg:h-[560px] lg:w-[560px]">
        <Image
          src={src}
          alt={`Impact ${titlePrefix} ${number}`}
          fill
          sizes="(min-width: 1024px) 560px, (min-width: 768px) 360px, 280px"
          className="object-contain drop-shadow-2xl"
          priority
          onError={() => setSrc(fallbackImage)}
        />
      </div>

      {/* Bottom label.
          It used to be `absolute bottom-8` at every size with no z-index, while
          the bottle sits at z-10. On a phone the panel is only min-h-[50vh], so
          the 280px bottle and the bottom-pinned label overlapped — and the
          image won the stack, painting straight over the descriptor. Desktop
          never showed it because the panel is min-h-screen there.

          So it stays in normal flow (the parent is a centred flex column, which
          places it under the bottle with real spacing) and is only pinned to the
          bottom from lg up, where there is room. z-20 keeps the text above the
          bottle whatever the height. */}
      <div className="relative z-20 mt-6 flex flex-col items-center gap-1 px-6 text-center text-bone lg:absolute lg:bottom-8 lg:mt-0">
        <p className="text-label uppercase tracking-[0.12em] text-stone">
          {titlePrefix} {number}
        </p>
        <p className="font-display text-h3 text-bone">{descriptor}</p>
      </div>
    </div>
  )
}
