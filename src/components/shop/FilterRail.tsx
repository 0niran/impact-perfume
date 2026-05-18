'use client'

import { cn } from '@/lib/cn'
import { SCENT_FAMILIES } from '@/lib/constants'

interface FilterRailProps {
  activeFamily: string | null
  onFamily: (family: string | null) => void
}

export default function FilterRail({ activeFamily, onFamily }: FilterRailProps) {
  return (
    <aside className="hidden lg:block w-56 shrink-0">
      <div className="sticky top-20 py-8 pr-8">
        <div>
          <p className="text-label uppercase tracking-[0.1em] text-bone">
            Scent Family
          </p>
          <ul className="mt-3 space-y-1">
            <li>
              <button
                onClick={() => onFamily(null)}
                className={cn(
                  'w-full text-left text-small transition-colors duration-150',
                  !activeFamily ? 'font-medium text-accent' : 'text-stone hover:text-bone'
                )}
              >
                All families
              </button>
            </li>
            {SCENT_FAMILIES.map((family) => (
              <li key={family}>
                <button
                  onClick={() => onFamily(activeFamily === family ? null : family)}
                  className={cn(
                    'w-full text-left text-small transition-colors duration-150',
                    activeFamily === family
                      ? 'font-medium text-accent'
                      : 'text-stone hover:text-bone'
                  )}
                >
                  {family}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {(['Occasion', 'Size'] as const).map((label) => (
          <div key={label} className="mt-8">
            <p className="text-label uppercase tracking-[0.1em] text-stone">
              {label}
            </p>
            <p className="mt-2 text-small text-stone/60 italic">Coming soon</p>
          </div>
        ))}
      </div>
    </aside>
  )
}
