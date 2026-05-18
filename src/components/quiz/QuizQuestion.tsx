import { cn } from '@/lib/cn'
import { type QuizQuestion } from './quizData'

interface QuizQuestionProps {
  question: QuizQuestion
  stepIndex: number
  totalSteps: number
  onAnswer: (value: string) => void
  onBack: () => void
  compact?: boolean
}

export default function QuizQuestionView({
  question,
  stepIndex,
  totalSteps,
  onAnswer,
  onBack,
  compact = false,
}: QuizQuestionProps) {
  const progress = ((stepIndex) / totalSteps) * 100

  return (
    <div className={compact ? 'flex flex-col bg-ink text-bone' : 'flex min-h-screen flex-col bg-ink text-bone'}>
      {/* Progress bar */}
      <div className="h-0.5 bg-stone/30">
        <div
          className="h-full bg-accent transition-[width] duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className={compact ? 'flex flex-col items-center px-6 py-12' : 'flex flex-1 flex-col items-center justify-center px-6 py-16'}>
        <div className="w-full max-w-2xl">
          {/* Step count */}
          <p className="text-label uppercase tracking-[0.12em] text-stone">
            {stepIndex + 1} of {totalSteps}
          </p>

          {/* Question */}
          <h2 className="mt-4 font-display text-display-l leading-tight text-balance">
            {question.question}
          </h2>
          {question.subtext && (
            <p className="mt-3 text-body text-stone">{question.subtext}</p>
          )}

          {/* Options */}
          <div
            className={cn(
              'mt-10 grid gap-3',
              question.options.length <= 4 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'
            )}
          >
            {question.options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onAnswer(opt.value)}
                className="group flex items-center justify-between border border-stone/30 px-6 py-4 text-left text-bone transition-all duration-150 hover:border-accent hover:bg-accent hover:text-ink"
              >
                <span className="text-body">{opt.label}</span>
                <span className="opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  →
                </span>
              </button>
            ))}
          </div>

          {/* Back */}
          {stepIndex > 0 && (
            <button
              onClick={onBack}
              className="mt-10 text-small text-stone underline-offset-2 hover:underline"
            >
              ← Back
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
