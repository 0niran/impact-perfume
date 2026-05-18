import { Suspense } from 'react'
import type { Metadata } from 'next'
import HeroSection from '@/components/home/HeroSection'
import HousePositioningStrip from '@/components/home/HousePositioningStrip'
import FeaturedNumbers from '@/components/home/FeaturedNumbers'
import HomepageQuizSection from '@/components/home/HomepageQuizSection'
import TestimonialStrip from '@/components/home/TestimonialStrip'

export const metadata: Metadata = {
  title: 'Impact Perfumes | Crafted in Lagos. Composed for character.',
  description:
    'A Lagos house of fragrance. EDPs, Signature perfumes, concentrated oils, and home scents, built for those who make an impression.',
  openGraph: {
    title: 'Impact Perfumes | Crafted in Lagos. Composed for character.',
    description:
      'A Lagos house of fragrance. EDPs, Signature perfumes, concentrated oils, and home scents, built for those who make an impression.',
    images: [
      {
        url: '/og-default.jpg',
        width: 1200,
        height: 630,
        alt: 'Impact Perfumes & Oils',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Impact Perfumes | Crafted in Lagos.',
    description: 'Fragrances that leave a mark. A house built for those who make an impression.',
    images: ['/og-default.jpg'],
  },
}

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <HousePositioningStrip />

      <Suspense fallback={null}>
        <FeaturedNumbers />
      </Suspense>

      <HomepageQuizSection />
      <TestimonialStrip />
    </>
  )
}
