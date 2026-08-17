/**
 * Static option catalogue for the bespoke configurator: the fixed choice sets
 * and the wizard steps. Prices and business rates are NOT here — those are
 * Medusa-driven (see @/lib/bespokeConfig). This module holds only the
 * presentation-side options that never change at runtime, kept out of the
 * component so the configurator file is logic and markup rather than data.
 */

export interface ColorOption {
  hex: string
  name: string
}

export interface TimelineOption {
  id: string
  label: string
  description: string
}

export const INSPIRATIONS = [
  { id: 'no-1', label: 'No. 1 · Fruity' },
  { id: 'no-5', label: 'No. 5 · Sweet Oud' },
  { id: 'no-14', label: 'No. 14 · Citrus' },
  { id: 'no-25', label: 'No. 25 · Vanilla' },
  { id: 'no-33', label: 'No. 33 · Woody' },
  { id: 'compose', label: 'Compose from scratch with our perfumer' },
] as const

export const COLORS: ColorOption[] = [
  { hex: '#1E64A4', name: 'Cobalt' },
  { hex: '#A8137C', name: 'Magenta' },
  { hex: '#C18A1F', name: 'Saffron' },
  { hex: '#1FA84F', name: 'Verdant' },
  { hex: '#1A1612', name: 'Onyx' },
  { hex: '#C25719', name: 'Ember' },
  { hex: '#7414B0', name: 'Plum' },
  { hex: '#0E5F58', name: 'Teal' },
]

export const TIMELINES: TimelineOption[] = [
  { id: 'asap', label: 'ASAP', description: 'Within 2 weeks if possible.' },
  { id: '2-weeks', label: '2 Weeks', description: 'A standard turnaround.' },
  { id: '1-month', label: '1 Month', description: 'Plenty of time to perfect.' },
  { id: 'flexible', label: 'Flexible', description: 'No firm deadline.' },
]

export const STEPS = [
  { id: 1, label: 'Inspiration' },
  { id: 2, label: 'Bottle' },
  { id: 3, label: 'Inscription' },
  { id: 4, label: 'Quantity' },
  { id: 5, label: 'Your Details' },
] as const
