'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import type { TileEnrichment } from '@/types'
import { sortTiles, type SortKey } from '@/lib/shopUtils'
import FilterRail from './FilterRail'
import FilterBottomSheet from './FilterBottomSheet'
import ResultsHeader from './ResultsHeader'
import NumberWall from './NumberWall'
import { Container } from '@/components/layout'

interface ShopClientProps {
  enrichments: TileEnrichment[]
}

export default function ShopClient({ enrichments }: ShopClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [sheetOpen, setSheetOpen] = useState(false)

  const activeFamily = searchParams.get('family')
  const activeSort = (searchParams.get('sort') ?? 'featured') as SortKey

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [searchParams, router, pathname]
  )

  const filtered = useMemo(() => {
    let result = enrichments
    if (activeFamily) {
      result = result.filter((e) => e.scentFamily === activeFamily)
    }
    return sortTiles(result, activeSort)
  }, [enrichments, activeFamily, activeSort])

  return (
    <Container as="div" className="flex gap-0 py-0 lg:gap-8">
      <FilterRail
        activeFamily={activeFamily}
        onFamily={(f) => updateParam('family', f)}
      />

      <div className="min-w-0 flex-1">
        <ResultsHeader
          count={filtered.length}
          total={enrichments.length}
          sort={activeSort}
          onSort={(s) => updateParam('sort', s === 'featured' ? null : s)}
          onOpenSheet={() => setSheetOpen(true)}
          activeFamily={activeFamily}
          onClearFamily={() => updateParam('family', null)}
        />

        <NumberWall tiles={filtered} />
      </div>

      <FilterBottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        activeFamily={activeFamily}
        onApply={(f) => {
          updateParam('family', f)
          setSheetOpen(false)
        }}
      />
    </Container>
  )
}
