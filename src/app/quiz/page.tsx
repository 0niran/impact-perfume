import type { Metadata } from 'next'
import { DEFAULT_OG_IMAGES } from '@/lib/seo'
import { getAllEnrichments } from '@/sanity/queries/shop'
import { getServerRegion } from '@/lib/serverRegion'
import QuizClient from '@/components/quiz/QuizClient'
import { type Enrichment } from '@/components/quiz/quizData'

export const metadata: Metadata = {
  title: 'Find Your Fragrance',
  description:
    'Five questions, ninety seconds. We match you to the Impact fragrance composed for you.',
  openGraph: {
    images: DEFAULT_OG_IMAGES,
    title: 'Find Your Fragrance · Impact Perfumes',
    description: 'Five questions, ninety seconds. We match you to the fragrance for you.',
  },
}

export default async function QuizPage() {
  const region = await getServerRegion()
  const enrichments = (await getAllEnrichments(region.medusaRegionId, region.currency)) as Enrichment[]

  return <QuizClient enrichments={enrichments} />
}
