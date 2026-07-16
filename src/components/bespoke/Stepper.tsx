'use client'

import { cn } from '@/lib/cn'

interface StepperProps {
  steps: readonly { id: number; label: string }[]
  current: number
  /** Called when a completed step is clicked (navigation back only). */
  onStepClick?: (id: number) => void
}

/**
 * Minimal progress stepper: numbered nodes connected by a line, with completed
 * steps showing a check and clickable to go back. The active step's label is
 * carried by the section heading, so nodes stay uncluttered.
 */
export default function Stepper({ steps, current, onStepClick }: StepperProps) {
  const total = steps.length
  const active = steps.find((s) => s.id === current)

  return (
    <div>
      {/* Compact progress on small screens */}
      <div className="sm:hidden">
        <div className="flex items-baseline justify-between">
          <p className="text-label uppercase tracking-[0.1em] text-accent">
            Step {current} of {total}
          </p>
          <p className="text-label uppercase tracking-[0.08em] text-stone">{active?.label}</p>
        </div>
        <div className="mt-2 h-px w-full bg-stone/20">
          <div
            className="h-px bg-accent transition-all duration-300"
            style={{ width: `${(current / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Full node stepper from sm up */}
      <div className="hidden items-center sm:flex" role="list" aria-label="Progress">
        {steps.map((step, i) => {
          const done = step.id < current
          const isActive = step.id === current
          const clickable = done && Boolean(onStepClick)
          return (
            <div key={step.id} className={cn('flex items-center', i < total - 1 && 'flex-1')}>
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onStepClick?.(step.id)}
                aria-label={`Step ${step.id}: ${step.label}`}
                aria-current={isActive ? 'step' : undefined}
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-label transition-colors',
                  isActive
                    ? 'border-accent bg-accent text-ink'
                    : done
                      ? 'border-accent text-accent hover:bg-accent/10 cursor-pointer'
                      : 'border-stone/25 text-stone/60'
                )}
              >
                {done ? (
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                    <path d="M2.5 7l2.5 2.5 5.5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  step.id
                )}
              </button>
              {i < total - 1 && (
                <span className={cn('mx-3 h-px flex-1 transition-colors duration-300', done ? 'bg-accent/50' : 'bg-stone/20')} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
