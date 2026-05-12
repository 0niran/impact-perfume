import Link from 'next/link'
import { type Enrichment } from './quizData'

interface AlsoTryCardProps {
  enrichment: Enrichment
}

function AlsoTryCard({ enrichment }: AlsoTryCardProps) {
  return (
    <Link
      href={`/no/${enrichment.number}`}
      className="group flex flex-col gap-3"
    >
      <div
        className="flex items-center justify-center"
        style={{ backgroundColor: enrichment.signatureColor, aspectRatio: '1/1' }}
      >
        <span className="font-display text-5xl text-white/20 transition-transform duration-300 group-hover:scale-110">
          {enrichment.number}
        </span>
      </div>
      <div>
        <p className="text-label uppercase tracking-[0.1em] text-white/60">
          No. {enrichment.number}
        </p>
        <p className="font-display text-h3 text-white">{enrichment.descriptor}</p>
      </div>
    </Link>
  )
}

interface QuizResultProps {
  result: Enrichment
  alsoTry: Enrichment[]
  onRetake: () => void
  compact?: boolean
}

export default function QuizResult({ result, alsoTry, onRetake, compact = false }: QuizResultProps) {
  const previewNotes = result.topNotes?.slice(0, 3).join(' · ')

  return (
    <div
      className={compact ? 'text-white' : 'min-h-screen text-white'}
      style={{ backgroundColor: result.signatureColor }}
    >
      {/* Result hero */}
      <div className={compact ? 'flex flex-col items-center px-6 py-16 text-center' : 'flex min-h-[70vh] flex-col items-center justify-center px-6 py-20 text-center'}>
        <p className="text-label uppercase tracking-[0.16em] text-white/70">
          Your Number is
        </p>

        <div className="mt-6 font-display leading-none" style={{ fontSize: 'clamp(80px, 20vw, 180px)' }}>
          {result.number}
        </div>

        <p className="mt-2 font-display text-h1 italic text-white/80">
          {result.descriptor}
        </p>

        {result.tagline && (
          <p className="mt-4 max-w-md text-body-l text-white/70 italic">
            &ldquo;{result.tagline}&rdquo;
          </p>
        )}

        {previewNotes && (
          <p className="mt-6 text-label uppercase tracking-[0.1em] text-white/50">
            {previewNotes}
          </p>
        )}

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href={`/no/${result.number}`}
            className="inline-flex items-center bg-white px-10 text-label uppercase tracking-[0.1em] text-ink hover:opacity-90 transition-opacity"
            style={{ height: 52 }}
          >
            Explore No. {result.number}
          </Link>
          <button
            onClick={onRetake}
            className="text-label uppercase tracking-[0.1em] text-white/70 underline-offset-2 hover:text-white hover:underline transition-colors"
          >
            Retake the quiz
          </button>
        </div>
      </div>

      {/* Also try */}
      {alsoTry.length > 0 && (
        <div className="border-t border-white/10 px-6 py-16">
          <div className="mx-auto max-w-container">
            <p className="text-label uppercase tracking-[0.12em] text-white/60">
              Also worth exploring
            </p>
            <div className="mt-8 grid grid-cols-3 gap-6 sm:gap-10">
              {alsoTry.map((e) => (
                <AlsoTryCard key={e.productHandle} enrichment={e} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
