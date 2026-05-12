import Image from 'next/image'
import Link from 'next/link'
import type { TileEnrichment } from '@/types'

const BOTTLE_FALLBACK = '/images/no-series-bottle.png'

interface NumberTileProps {
  tile: TileEnrichment
}

export default function NumberTile({ tile }: NumberTileProps) {
  const { number, descriptor, signatureColor, tagline, topNotes } = tile
  const previewNotes = topNotes?.slice(0, 3).join(' · ')

  return (
    <Link
      href={`/no/${number}`}
      className="group relative block overflow-hidden"
      style={{ backgroundColor: signatureColor, aspectRatio: '1 / 1' }}
      aria-label={`Impact No. ${number} — ${descriptor}`}
    >
      {/* Number watermark — faded behind the bottle */}
      <span
        className="pointer-events-none absolute inset-0 flex items-center justify-center select-none font-display text-[5rem] leading-none text-white/10 transition-all duration-500 group-hover:text-white/5"
        aria-hidden="true"
      >
        {number}
      </span>

      {/* Bottle image — centred, contained within the tile */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative w-[70%] h-[85%]">
          <Image
            src={BOTTLE_FALLBACK}
            alt={`Impact No. ${number}`}
            fill
            sizes="(min-width: 1280px) 256px, (min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
            className="object-contain transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      </div>

      {/* Always-visible label at bottom */}
      <div className="absolute bottom-0 inset-x-0 p-3 transition-opacity duration-300 group-hover:opacity-0">
        <p className="text-label text-white/80">No. {number}</p>
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 p-4 text-center text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <p className="text-label uppercase tracking-[0.12em] text-white/70">
          No. {number}
        </p>
        <p className="mt-1 font-display text-h3">{descriptor}</p>
        {tagline && (
          <p className="mt-1 text-small italic text-white/80">{tagline}</p>
        )}
        {previewNotes && (
          <p className="mt-3 text-label text-white/60">{previewNotes}</p>
        )}
        <span className="mt-4 text-label uppercase tracking-[0.1em] text-white/90">
          Explore
        </span>
      </div>
    </Link>
  )
}
