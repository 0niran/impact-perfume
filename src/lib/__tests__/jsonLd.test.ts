import { describe, it, expect } from 'vitest'
import { jsonLdScript } from '../jsonLd'

describe('jsonLdScript', () => {
  it('escapes < > & so a value cannot break out of the script tag', () => {
    const out = jsonLdScript({ name: '</script><script>alert(1)</script>' })
    expect(out).not.toContain('</script>')
    expect(out).not.toContain('<script>')
    expect(out).toContain('\\u003c')
    expect(out).toContain('\\u003e')
  })

  it('escapes ampersands', () => {
    expect(jsonLdScript({ x: 'a&b' })).toContain('\\u0026')
    expect(jsonLdScript({ x: 'a&b' })).not.toContain('a&b')
  })

  it('parses back to the identical object (escapes are lossless)', () => {
    const data = {
      name: 'Impact <No. 5> & Co.',
      note: 'plain note',
      nested: { price: '65.00' },
    }
    expect(JSON.parse(jsonLdScript(data))).toEqual(data)
  })

  it('escapes the U+2028 / U+2029 line terminators', () => {
    const out = jsonLdScript({ x: 'a\u2028b\u2029c' })
    expect(out).toContain('\\u2028')
    expect(out).toContain('\\u2029')
    expect(out).not.toContain('\u2028')
    expect(out).not.toContain('\u2029')
  })
})
