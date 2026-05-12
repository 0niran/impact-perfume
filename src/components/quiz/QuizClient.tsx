'use client'

import { useState } from 'react'
import {
  QUESTIONS,
  computeResult,
  type Answers,
  type Enrichment,
} from './quizData'
import QuizQuestionView from './QuizQuestion'
import QuizResult from './QuizResult'

interface QuizClientProps {
  enrichments: Enrichment[]
  compact?: boolean
}

type Phase = 'quiz' | 'result'

export default function QuizClient({ enrichments, compact = false }: QuizClientProps) {
  const [phase, setPhase] = useState<Phase>('quiz')
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Answers>({})
  const [result, setResult] = useState<ReturnType<typeof computeResult> | null>(null)

  const questionKeys: (keyof Answers)[] = ['moment', 'pull', 'loudness', 'feeling', 'taste']

  function handleAnswer(value: string) {
    const key = questionKeys[step]
    const newAnswers = { ...answers, [key]: value }
    setAnswers(newAnswers)

    if (step < QUESTIONS.length - 1) {
      setStep((s) => s + 1)
    } else {
      const computed = computeResult(enrichments, newAnswers)
      setResult(computed)
      setPhase('result')
    }
  }

  function handleBack() {
    if (step > 0) {
      setStep((s) => s - 1)
      const key = questionKeys[step]
      setAnswers((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  function handleRetake() {
    setPhase('quiz')
    setStep(0)
    setAnswers({})
    setResult(null)
  }

  if (phase === 'result' && result) {
    return (
      <QuizResult
        result={result.result}
        alsoTry={result.alsoTry}
        onRetake={handleRetake}
        compact={compact}
      />
    )
  }

  return (
    <QuizQuestionView
      question={QUESTIONS[step]}
      stepIndex={step}
      totalSteps={QUESTIONS.length}
      onAnswer={handleAnswer}
      onBack={handleBack}
      compact={compact}
    />
  )
}
