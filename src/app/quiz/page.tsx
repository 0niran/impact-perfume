import type { Metadata } from 'next'
import { getAllEnrichments } from '@/sanity/queries/shop'
import QuizClient from '@/components/quiz/QuizClient'
import { type Enrichment } from '@/components/quiz/quizData'

export const metadata: Metadata = {
  title: 'Find Your Number',
  description:
    'Answer 5 questions and discover the Impact fragrance made for you.',
  openGraph: {
    title: 'Find Your Number · Impact Perfumes',
    description: 'Answer 5 questions. We match you to your Number.',
  },
}

export default async function QuizPage() {
  const enrichments = (await getAllEnrichments()) as Enrichment[]

  return <QuizClient enrichments={enrichments} />
}
