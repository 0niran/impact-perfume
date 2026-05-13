'use client'

import Image from 'next/image'
import { useState } from 'react'

const BOTTLE_FALLBACK = '/images/no-series-bottle.png'

interface ColorPanelProps {
  number: number
  descriptor: string
  signatureColor: string
  signatureColorName?: string
  imageUrl?: string | null
}

export default function ColorPanel({
  number,
  descriptor,
  signatureColor,
  signatureColorName,
  imageUrl,
}: ColorPanelProps) {
  const [src, setSrc] = useState(imageUrl ?? BOTTLE_FALLBACK)

  return (
    <div
      className="relative flex min-h-[50vh] md:min-h-[60vh] flex-col items-center justify-center overflow-hidden lg:sticky lg:top-0 lg:min-h-screen"
      style={{ backgroundColor: signatureColor }}
    >
      {/* Number watermark — faded behind the bottle */}
      <span
        className="pointer-events-none absolute select-none font-display text-[28vw] leading-none text-white/10 lg:text-[18vw]"
        aria-hidden="true"
      >
        {number}
      </span>

      {/* Bottle image */}
      <div className="relative z-10 w-[280px] h-[280px] md:w-[360px] md:h-[360px] lg:w-[560px] lg:h-[560px]">
        <Image
          src={src}
          alt={`Impact No. ${number}`}
          fill
          sizes="(min-width: 1024px) 560px, (min-width: 768px) 360px, 280px"
          className="object-contain drop-shadow-2xl"
          priority
          onError={() => setSrc(BOTTLE_FALLBACK)}
        />
      </div>

      {/* Bottom label */}
      <div className="absolute bottom-8 flex flex-col items-center gap-1 text-center text-white">
        <p className="text-label uppercase tracking-[0.12em] text-white/70">
          No. {number}
        </p>
        <p className="font-display text-h3 text-white/90">{descriptor}</p>
        {signatureColorName && (
          <p className="text-small text-white/50">{signatureColorName}</p>
        )}
      </div>
    </div>
  )
}
