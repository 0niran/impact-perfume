interface StrengthBarsProps {
  longevity?: number
  sillage?: number
}

const LABELS: Record<number, string> = {
  1: 'Subtle',
  2: 'Light',
  3: 'Moderate',
  4: 'Strong',
  5: 'Intense',
}

function Bar({ label, value }: { label: string; value: number }) {
  const descriptor = LABELS[Math.round(value)] ?? 'Moderate'
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-small text-slate">{label}</p>
        <p className="text-small text-accent">{descriptor}</p>
      </div>
      <div className="h-px bg-stone/30">
        <div
          className="h-full bg-ink transition-all duration-700"
          style={{ width: `${(value / 5) * 100}%` }}
        />
      </div>
    </div>
  )
}

export default function StrengthBars({ longevity, sillage }: StrengthBarsProps) {
  if (!longevity && !sillage) return null

  return (
    <div>
      <p className="text-label uppercase tracking-[0.1em] text-ink mb-4">
        Wear Profile
      </p>
      <div className="flex flex-col gap-4">
        {longevity !== undefined && longevity > 0 && (
          <Bar label="Longevity" value={longevity} />
        )}
        {sillage !== undefined && sillage > 0 && (
          <Bar label="Projection" value={sillage} />
        )}
      </div>
    </div>
  )
}
