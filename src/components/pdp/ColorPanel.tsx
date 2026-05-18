'use client'

import Image from 'next/image'
import { useState } from 'react'

const DEFAULT_FALLBACK = '/images/no_series.png'

interface ColorPanelProps {
  number: number
  descriptor: string
  signatureColor: string
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
  signatureColorName,
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

      {/* Bottom label */}
      <div className="absolute bottom-8 flex flex-col items-center gap-1 text-center text-bone">
        <p className="text-label uppercase tracking-[0.12em] text-stone">
          {titlePrefix} {number}
        </p>
        <p className="font-display text-h3 text-bone">{descriptor}</p>
        {signatureColorName && (
          <p className="flex items-center gap-2 text-small text-stone">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: signatureColor }}
              aria-hidden="true"
            />
            {signatureColorName}
          </p>
        )}
      </div>
    </div>
  )
}
