import type { TileEnrichment } from '@/types'

export type SortKey = 'featured' | 'number-asc' | 'number-desc' | 'family-az'

export function sortTiles(tiles: TileEnrichment[], sort: SortKey): TileEnrichment[] {
  const copy = [...tiles]
  switch (sort) {
    case 'number-desc':
      return copy.sort((a, b) => b.number - a.number)
    case 'family-az':
      return copy.sort((a, b) => a.descriptor.localeCompare(b.descriptor))
    case 'number-asc':
    case 'featured':
    default:
      return copy.sort((a, b) => a.number - b.number)
  }
}

/** Shared CSS classes for form inputs and labels — light (cream) checkout context */
export const FORM_STYLES = {
  input:
    'w-full border border-ink/20 bg-white/60 px-4 py-3 text-body text-ink placeholder:text-ink/35 focus:border-ink focus:outline-none transition-colors',
  label: 'block text-small text-ink/55 mb-1.5',
} as const
