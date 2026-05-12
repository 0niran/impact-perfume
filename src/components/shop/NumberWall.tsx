import NumberTile from './NumberTile'
import type { TileEnrichment } from '@/types'

interface NumberWallProps {
  tiles: TileEnrichment[]
}

export default function NumberWall({ tiles }: NumberWallProps) {
  if (!tiles.length) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center py-20 text-slate">
        <p className="font-display text-h2">No fragrances match your filters.</p>
      </div>
    )
  }

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
      role="list"
      aria-label="Fragrance collection"
    >
      {tiles.map((tile) => (
        <div key={tile.productHandle} role="listitem">
          <NumberTile tile={tile} />
        </div>
      ))}
    </div>
  )
}
