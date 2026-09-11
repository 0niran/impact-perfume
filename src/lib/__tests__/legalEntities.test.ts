import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { LEGAL_ENTITIES } from '@/lib/config'

/**
 * The registered names are what a customer contracts with and what controls
 * their data. They must match the registration certificates exactly, so these
 * pin them: a stray edit to a legal name should fail loudly rather than ship.
 */
describe('LEGAL_ENTITIES', () => {
  it('names the Nigerian company as registered', () => {
    expect(LEGAL_ENTITIES.NG.name).toBe('Impact Arabian Perfumes and Oil Ltd')
  })

  it('names the Canadian company as registered', () => {
    expect(LEGAL_ENTITIES.CA.name).toBe('Impact Arabian Perfumes and Oils')
  })
})

describe.each(['src/app/terms/page.tsx', 'src/app/privacy/page.tsx'])('%s', (rel) => {
  const src = fs.readFileSync(path.join(process.cwd(), rel), 'utf8')

  it('reads the entities from config rather than typing them', () => {
    // Both documents must name the same seller; one definition keeps them agreed.
    expect(src).toContain('LEGAL_ENTITIES.NG.name')
    expect(src).toContain('LEGAL_ENTITIES.CA.name')
  })

  it('has no leftover entity or registration-number placeholders', () => {
    expect(src).not.toMatch(/\[(NG|CA) ENTITY\]|NUMBER PENDING|\[NUMBER\]/)
  })
})
