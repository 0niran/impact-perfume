import type { Enrichment } from '@/types'
export type { Enrichment }

export interface QuizQuestion {
  id: string
  question: string
  subtext?: string
  options: { label: string; value: string }[]
}

export const QUESTIONS: QuizQuestion[] = [
  {
    id: 'moment',
    question: "What's the occasion?",
    subtext: 'When do you see yourself reaching for this fragrance most?',
    options: [
      { label: 'Day out', value: 'day' },
      { label: 'Evening event', value: 'evening' },
      { label: 'Office', value: 'office' },
      { label: 'Date night', value: 'date' },
      { label: 'Celebration', value: 'celebration' },
      { label: 'Travel', value: 'travel' },
    ],
  },
  {
    id: 'pull',
    question: 'What pulls you in first?',
    subtext: 'Go with your gut — first instinct only.',
    options: [
      { label: 'Citrus & freshness', value: 'citrus' },
      { label: 'Fruits & sweetness', value: 'fruity' },
      { label: 'Flowers', value: 'floral' },
      { label: 'Spice & warmth', value: 'spice' },
      { label: 'Wood & smoke', value: 'wood' },
      { label: 'Sweet & creamy', value: 'sweet' },
    ],
  },
  {
    id: 'loudness',
    question: 'How loud is your signature?',
    subtext: 'Some fragrances whisper. Some announce.',
    options: [
      { label: 'A whisper — close-up only', value: 'whisper' },
      { label: 'Just noticed — intimate trail', value: 'soft' },
      { label: 'A presence — felt in the room', value: 'medium' },
      { label: 'Unforgettable — they knew you were there', value: 'bold' },
    ],
  },
  {
    id: 'feeling',
    question: 'Pick a feeling.',
    subtext: 'What do you want your fragrance to say about you?',
    options: [
      { label: 'Calm', value: 'calm' },
      { label: 'Magnetic', value: 'magnetic' },
      { label: 'Joyful', value: 'joyful' },
      { label: 'Mysterious', value: 'mysterious' },
      { label: 'Polished', value: 'polished' },
      { label: 'Free', value: 'free' },
    ],
  },
  {
    id: 'taste',
    question: 'Sweet or savoury at heart?',
    subtext: 'Not food — fragrance. But the instinct is the same.',
    options: [
      { label: 'Sweet', value: 'sweet' },
      { label: 'Balanced', value: 'balanced' },
      { label: 'Savoury', value: 'savoury' },
    ],
  },
]

// Preferred descriptors per answer, ordered from most to least preferred
const MOMENT_MAP: Record<string, string[]> = {
  day:         ['Citrus', 'Fresh Spicy', 'Aromatic', 'Floral', 'Fruity', 'Tropical'],
  evening:     ['Oud', 'Amber', 'Warm Spicy', 'Woody', 'Rose', 'Sweet Oud'],
  office:      ['Citrus', 'Aromatic', 'Floral', 'Powdery', 'Fresh Spicy', 'Woody'],
  date:        ['Sweet Oud', 'Rose', 'Amber', 'Vanilla', 'Oud', 'Warm Spicy'],
  celebration: ['Fruity', 'Tropical', 'Floral', 'Citrus', 'Sweet', 'Rose'],
  travel:      ['Citrus', 'Tropical', 'Coconut', 'Fresh Spicy', 'Fruity', 'Aromatic'],
}

const PULL_MAP: Record<string, string[]> = {
  citrus: ['Citrus', 'Fresh Spicy', 'Aromatic'],
  fruity: ['Fruity', 'Tropical', 'Coconut', 'Sweet'],
  floral: ['Floral', 'Rose', 'Powdery'],
  spice:  ['Warm Spicy', 'Oud', 'Amber', 'Leather'],
  wood:   ['Woody', 'Leather', 'Oud', 'Aromatic'],
  sweet:  ['Sweet', 'Vanilla', 'Sweet Oud', 'Amber', 'Coconut'],
}

const FEELING_MAP: Record<string, string[]> = {
  calm:       ['Citrus', 'Floral', 'Aromatic', 'Powdery', 'Fresh Spicy'],
  magnetic:   ['Oud', 'Amber', 'Woody', 'Leather', 'Sweet Oud'],
  joyful:     ['Fruity', 'Tropical', 'Citrus', 'Floral', 'Sweet'],
  mysterious: ['Oud', 'Amber', 'Warm Spicy', 'Leather', 'Sweet Oud'],
  polished:   ['Floral', 'Rose', 'Powdery', 'Woody', 'Citrus'],
  free:       ['Fresh Spicy', 'Citrus', 'Tropical', 'Coconut', 'Aromatic'],
}

const TASTE_MAP: Record<string, string[]> = {
  sweet:    ['Sweet', 'Vanilla', 'Sweet Oud', 'Fruity', 'Coconut', 'Amber'],
  balanced: ['Woody', 'Floral', 'Aromatic', 'Rose', 'Citrus'],
  savoury:  ['Oud', 'Leather', 'Warm Spicy', 'Citrus', 'Aromatic', 'Woody'],
}

function scoreDescriptor(descriptor: string, preferredList: string[]): number {
  const idx = preferredList.indexOf(descriptor)
  if (idx === -1) return 0
  if (idx <= 1) return 3
  if (idx <= 3) return 2
  return 1
}


export type Answers = {
  moment?: string
  pull?: string
  loudness?: string
  feeling?: string
  taste?: string
}

export function computeResult(
  enrichments: Enrichment[],
  answers: Answers
): { result: Enrichment; alsoTry: Enrichment[] } {
  const scored = enrichments.map((e) => {
    let score = 0
    if (answers.moment) score += scoreDescriptor(e.descriptor, MOMENT_MAP[answers.moment] ?? [])
    if (answers.pull)   score += scoreDescriptor(e.descriptor, PULL_MAP[answers.pull] ?? [])
    if (answers.feeling) score += scoreDescriptor(e.descriptor, FEELING_MAP[answers.feeling] ?? [])
    if (answers.taste)  score += scoreDescriptor(e.descriptor, TASTE_MAP[answers.taste] ?? [])
    return { enrichment: e, score }
  })

  scored.sort((a, b) => b.score - a.score || a.enrichment.number - b.enrichment.number)

  const [top, ...rest] = scored
  return {
    result: top.enrichment,
    alsoTry: rest.slice(0, 3).map((s) => s.enrichment),
  }
}
