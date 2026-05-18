import NumberTile from './NumberTile'
import type { TileEnrichment } from '@/types'

interface NumberWallProps {
  tiles: TileEnrichment[]
}

export default function NumberWall({ tiles }: NumberWallProps) {
  if (!tiles.length) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center py-20 text-stone">
        <p className="font-display text-h2">No fragrances match your filters.</p>
      </div>
    )
  }

  return (
    <div
      className="grid grid-cols-2 gap-px bg-stone/15 lg:grid-cols-3"
      role="list"
      aria-label="Fragrance collection"
    >
      {tiles.map((tile) => (
        <div key={tile.productHandle} role="listitem" className="bg-ink">
          <NumberTile tile={tile} />
        </div>
      ))}
    </div>
  )
}
