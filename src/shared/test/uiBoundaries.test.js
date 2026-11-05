import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

// Each UI version (src/v1..v4) may import only its own files and src/shared — never another version.
// shared/ must not import any UI version.
const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const VERSIONS = ['v1', 'v2', 'v3', 'v4']
const SPEC = /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]|vi\.mock\(\s*['"]([^'"]+)['"]/g

const walk = (dir) => readdirSync(dir).flatMap(n => {
  const p = join(dir, n)
  return statSync(p).isDirectory() ? walk(p) : /\.(jsx?|css)$/.test(n) ? [p] : []
})

function targets(file) {
  const text = readFileSync(file, 'utf8')
  return [...text.matchAll(SPEC)].map(m => m[1] || m[2])
    .map(spec => (spec.startsWith('.') ? resolve(dirname(file), spec) : spec.startsWith('@/') ? join(SRC, spec.slice(2)) : null))
    .filter(Boolean)
    .map(abs => relative(SRC, abs).split(sep)[0])
}

describe('UI folder boundaries', () => {
  it.each(VERSIONS)('%s imports only itself and shared/', (v) => {
    const bad = walk(join(SRC, v)).flatMap(f => targets(f).filter(t => VERSIONS.includes(t) && t !== v).map(t => `${relative(SRC, f)} → ${t}/`))
    expect(bad).toEqual([])
  })

  it('shared/ does not import any UI version', () => {
    const bad = walk(join(SRC, 'shared')).flatMap(f => targets(f).filter(t => VERSIONS.includes(t)).map(t => `${relative(SRC, f)} → ${t}/`))
    expect(bad).toEqual([])
  })
})
