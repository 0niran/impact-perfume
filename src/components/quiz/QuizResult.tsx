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
        className="relative flex items-center justify-center overflow-hidden bg-ink"
        style={{ aspectRatio: '1/1' }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-60 transition-opacity duration-500 group-hover:opacity-80"
          style={{
            background: `radial-gradient(ellipse at center, ${enrichment.signatureColor}33 0%, transparent 65%)`,
          }}
          aria-hidden="true"
        />
        <span className="relative z-10 font-display text-5xl text-stone/40 transition-transform duration-300 group-hover:scale-110">
          {enrichment.number}
        </span>
      </div>
      <div>
        <p className="text-label uppercase tracking-[0.1em] text-stone">
          No. {enrichment.number}
        </p>
        <p className="font-display text-h3 text-bone">{enrichment.descriptor}</p>
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
    <div className={`relative overflow-hidden bg-ink text-bone ${compact ? '' : 'min-h-screen'}`}>
      {/* Subtle signature-color glow as identity */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[70vh]"
        style={{
          background: `radial-gradient(ellipse at center top, ${result.signatureColor}33 0%, transparent 60%)`,
        }}
        aria-hidden="true"
      />

      {/* Result hero */}
      <div className={`relative ${compact ? 'flex flex-col items-center px-6 py-16 text-center' : 'flex min-h-[70vh] flex-col items-center justify-center px-6 py-20 text-center'}`}>
        <p className="text-label uppercase tracking-[0.16em] text-stone">
          Your Number is
        </p>

        <div className="mt-6 font-display leading-none text-bone" style={{ fontSize: 'clamp(80px, 20vw, 180px)' }}>
          {result.number}
        </div>

        <p className="mt-2 font-display text-h1 italic text-bone">
          {result.descriptor}
        </p>

        {result.tagline && (
          <p className="mt-4 max-w-md text-body-l text-stone italic">
            &ldquo;{result.tagline}&rdquo;
          </p>
        )}

        {previewNotes && (
          <p className="mt-6 text-label uppercase tracking-[0.1em] text-stone">
            {previewNotes}
          </p>
        )}

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href={`/no/${result.number}`}
            className="inline-flex items-center bg-accent px-10 text-label uppercase tracking-[0.1em] text-ink hover:opacity-90 transition-opacity"
            style={{ height: 52 }}
          >
            Explore No. {result.number}
          </Link>
          <button
            onClick={onRetake}
            className="text-label uppercase tracking-[0.1em] text-stone underline-offset-2 hover:text-bone hover:underline transition-colors"
          >
            Retake the quiz
          </button>
        </div>
      </div>

      {/* Also try */}
      {alsoTry.length > 0 && (
        <div className="relative border-t border-stone/20 px-6 py-16">
          <div className="mx-auto max-w-container">
            <p className="text-label uppercase tracking-[0.12em] text-accent">
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
