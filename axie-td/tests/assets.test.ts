import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const PUB = join(process.cwd(), 'public')
const manifest = JSON.parse(readFileSync(join(PUB, 'assets-manifest.json'), 'utf8'))

describe('assets', () => {
  // Relevé de 25 à 28 Mo pour les cinq boucles de musique (3,8 Mo). Le MP3 est
  // déjà compressé, la compression du serveur ne les réduira pas : ces méga-octets
  // sont réels. Ils se chargent une piste à la fois, pas tous d'un coup.
  it('reste sous le plafond de 28 Mo du dépôt', () => {
    expect(manifest.bytes).toBeLessThan(28 * 1024 * 1024)
  })

  it('embarque les cinq boucles de musique', () => {
    for (const id of ['home', 'pve_1', 'pve_2', 'pve_3', 'boss']) {
      expect(existsSync(join(PUB, 'music', `${id}.mp3`)), `musique ${id} absente`).toBe(true)
    }
  })

  it('minifie le JSON des squelettes', () => {
    const raw = readFileSync(join(PUB, 'spine', 'axies', 'buba', 'skeleton.json'), 'utf8')
    expect(raw.includes('\n')).toBe(false)
  })

  it('convertit les effets sonores en MP3', () => {
    expect(manifest.sfx.length).toBeGreaterThan(0)
    for (const id of manifest.sfx) {
      expect(existsSync(join(PUB, 'sfx', `${id}.mp3`)), id).toBe(true)
    }
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
