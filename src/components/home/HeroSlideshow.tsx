'use client'

import { useEffect, useState, useCallback } from 'react'

const SLIDES = [
  {
    category: 'The Number Series',
    tagline: 'Crafted in Lagos. Composed for character.',
    image: '/hero/no-series.png',
    gradient: 'radial-gradient(ellipse 70% 70% at 65% 35%, rgba(107,68,35,0.22) 0%, rgba(40,20,10,0.10) 50%, transparent 80%)',
  },
  {
    category: 'Signature Collection',
    tagline: 'Beyond numbers. A name, a narrative, a soul.',
    image: '/hero/signature.png',
    gradient: 'radial-gradient(ellipse 70% 70% at 35% 50%, rgba(60,50,80,0.22) 0%, rgba(20,15,30,0.10) 50%, transparent 80%)',
  },
  {
    category: 'Fragrance Oils',
    tagline: 'One drop. All day. Built for the heat.',
    image: '/hero/Oil.png',
    gradient: 'radial-gradient(ellipse 70% 70% at 60% 40%, rgba(30,60,40,0.22) 0%, rgba(10,25,15,0.10) 50%, transparent 80%)',
  },
  {
    category: 'Home & Gifts',
    tagline: 'The house extends beyond the skin.',
    image: '/hero/home.png',
    gradient: 'radial-gradient(ellipse 70% 70% at 50% 30%, rgba(80,60,30,0.22) 0%, rgba(30,20,10,0.10) 50%, transparent 80%)',
  },
]

const INTERVAL = 5000

interface HeroSlideshowProps {
  className?: string
}

export default function HeroSlideshow({ className = '' }: HeroSlideshowProps) {
  const [current, setCurrent] = useState(0)
  const [transitioning, setTransitioning] = useState(false)

  const goTo = useCallback((index: number) => {
    if (index === current) return
    setTransitioning(true)
    setTimeout(() => {
      setCurrent(index)
      setTransitioning(false)
    }, 600)
  }, [current])

  const next = useCallback(() => {
    goTo((current + 1) % SLIDES.length)
  }, [current, goTo])

  useEffect(() => {
    const id = setInterval(next, INTERVAL)
    return () => clearInterval(id)
  }, [next])

  const slide = SLIDES[current]

  return (
    <div className={`absolute inset-0 ${className}`} aria-hidden="true">
      {/* Background image layer */}
      {SLIDES.map((s, i) => (
        <div
          key={s.category}
          className="absolute inset-0 bg-center bg-cover transition-opacity duration-700"
          style={{
            backgroundImage: `url(${s.image})`,
            opacity: i === current ? (transitioning ? 0 : 0.55) : 0,
          }}
        />
      ))}

      {/* Gradient overlay */}
      <div
        className="absolute inset-0 transition-all duration-700"
        style={{ background: slide.gradient }}
      />

      {/* Permanent dark vignette so text is always readable */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to top, rgba(10,10,8,0.85) 0%, rgba(10,10,8,0.30) 50%, rgba(10,10,8,0.20) 100%)',
        }}
      />

      {/* Slide indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {SLIDES.map((s, i) => (
          <button
            key={s.category}
            aria-label={`Go to ${s.category}`}
            onClick={() => goTo(i)}
            className="relative h-px overflow-hidden transition-all duration-300"
            style={{ width: i === current ? 40 : 20 }}
          >
            <span className="absolute inset-0 bg-bone/30" />
            <span
              className="absolute inset-y-0 left-0 bg-accent transition-[width] duration-[5000ms] ease-linear"
              style={{ width: i === current ? '100%' : '0%' }}
            />
          </button>
        ))}
      </div>

      {/* Active category label — top right corner */}
      <div className="absolute top-8 right-8 text-right">
        <p
          className="text-label uppercase tracking-[0.14em] text-accent transition-opacity duration-500"
          style={{ opacity: transitioning ? 0 : 1 }}
        >
          {slide.category}
        </p>
      </div>
    </div>
  )
}

export { SLIDES }
