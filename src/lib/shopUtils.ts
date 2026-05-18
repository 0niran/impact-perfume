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

/** Shared CSS classes for form inputs and labels, dark checkout context */
export const FORM_STYLES = {
  input:
    'w-full border border-stone/30 bg-white/5 px-4 py-3 text-body text-bone placeholder:text-bone/30 focus:border-accent focus:outline-none transition-colors',
  label: 'block text-small text-bone/60 mb-1.5',
} as const
