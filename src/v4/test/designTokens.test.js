import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// Design review: v4 uses semantic tokens only (v4.css), one radius scale (field/card/sheet), two elevations (e1/e2)
// and a type scale with a 12px minimum. This test fails when raw palette colours or one-off values creep back in.
const ROOT = join(__dirname, '..')
const ALLOW = new Set(['v4.css', 'lib/receipt.js']) // receipt.js draws on a canvas, which needs literal colours
const PALETTE = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black'
const RULES = [
  ['raw palette colour', new RegExp(`\\b(?:bg|text|border|from|via|to|ring|shadow|fill|stroke|outline|divide)-(?:${PALETTE})(?:-\\d+)?(?:/\\d+)?\\b`)],
  ['hex colour', /#[0-9a-fA-F]{6}\b|['"]#[0-9a-fA-F]{3}['"]/],
  ['type below 12px or off-scale', /\btext-\[\d+px\]/],
  ['off-scale radius', /\brounded-(?:xl|2xl|3xl|lg|md)\b|\brounded-\[\d+(?:\.\d+)?rem\]/],
  ['off-scale shadow', /\bshadow-(?:\[[^\]]*\]|(?:sm|md|lg|xl|2xl)\b)/],
]

const files = (dir) => readdirSync(dir).flatMap(n => {
  const p = join(dir, n)
  if (statSync(p).isDirectory()) return files(p)
  return /\.(jsx?|css)$/.test(n) && !/\.test\./.test(n) ? [p] : []
})

describe('v4 design tokens', () => {
  it('uses semantic tokens and the shared scales only', () => {
    const problems = []
    for (const file of files(ROOT)) {
      const rel = relative(ROOT, file)
      if (ALLOW.has(rel) || file.endsWith('.css')) continue
      readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
        for (const [what, re] of RULES) {
          const m = line.match(re)
          if (m) problems.push(`${rel}:${i + 1} ${what}: ${m[0]}`)
        }
      })
    }
    expect(problems).toEqual([])
  })
})
