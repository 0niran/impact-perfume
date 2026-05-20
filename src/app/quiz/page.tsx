import type { Metadata } from 'next'
import { getAllEnrichments } from '@/sanity/queries/shop'
import { getServerRegion } from '@/lib/serverRegion'
import QuizClient from '@/components/quiz/QuizClient'
import { type Enrichment } from '@/components/quiz/quizData'

export const metadata: Metadata = {
  title: 'Find Your Fragrance',
  description:
    'Five questions, ninety seconds. We match you to the Impact fragrance composed for you.',
  openGraph: {
    title: 'Find Your Fragrance · Impact Perfumes',
    description: 'Five questions, ninety seconds. We match you to the fragrance for you.',
  },
}

export default async function QuizPage() {
  const region = getServerRegion()
  const enrichments = (await getAllEnrichments(region.medusaRegionId, region.currency)) as Enrichment[]

  return <QuizClient enrichments={enrichments} />
}
