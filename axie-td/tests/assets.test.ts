import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const PUB = join(process.cwd(), 'public')
const manifest = JSON.parse(readFileSync(join(PUB, 'assets-manifest.json'), 'utf8'))

describe('assets', () => {
  it('reste sous le budget de 15 Mo', () => {
    expect(manifest.bytes).toBeLessThan(15 * 1024 * 1024)
  })

  it('fournit les trois fichiers Spine de Buba', () => {
    for (const f of ['skeleton.json', 'skeleton.atlas', 'skeleton.webp']) {
      expect(existsSync(join(PUB, 'spine', 'axies', 'buba', f))).toBe(true)
    }
  })

  it("nomme l'image WebP dans l'atlas de Buba", () => {
    const atlas = readFileSync(join(PUB, 'spine', 'axies', 'buba', 'skeleton.atlas'), 'utf8')
    expect(atlas).toContain('skeleton.webp')
    expect(atlas).not.toContain('buba.png')
  })

  it('fournit les 20 chimères', () => {
    for (const type of ['slime', 'wolf-gray', 'treant', 'bear-dad', 'dryad-mage']) {
      expect(existsSync(join(PUB, 'spine', 'chimeras', type, 'skeleton.json'))).toBe(true)
    }
  })
})
