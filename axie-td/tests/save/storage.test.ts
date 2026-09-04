import { beforeEach, describe, expect, it } from 'vitest'
import {
  emptySave, isLevelOpen, loadSave, recordResult, saveNow, totalStars, unlockedAxies,
} from '../../src/save/storage'

describe('sauvegarde', () => {
  beforeEach(() => { try { localStorage.clear() } catch { /* ignoré */ } })

  it('donne une partie neuve sans sauvegarde', () => {
    const s = loadSave()
    expect(totalStars(s)).toBe(0)
    expect(unlockedAxies(s)).toHaveLength(6)
    expect(isLevelOpen(s, 1)).toBe(true)
    expect(isLevelOpen(s, 2)).toBe(false)
  })

  it('enregistre un résultat et ouvre le niveau suivant', () => {
    let s = recordResult(emptySave(), 1, 2)
    expect(totalStars(s)).toBe(2)
    expect(isLevelOpen(s, 2)).toBe(true)
    s = recordResult(s, 2, 1)
    expect(totalStars(s)).toBe(3)
    expect(isLevelOpen(s, 3)).toBe(true)
  })

  it('ne fait jamais baisser le score d’un niveau', () => {
    let s = recordResult(emptySave(), 1, 3)
    s = recordResult(s, 1, 1)
    expect(s.stars['1']).toBe(3)
    expect(totalStars(s)).toBe(3)
  })

  it('n’ouvre pas le niveau suivant après une défaite', () => {
    const s = recordResult(emptySave(), 1, 0)
    expect(isLevelOpen(s, 2)).toBe(false)
  })

  it('débloque un Axie par palier d’étoiles', () => {
    const at2 = recordResult(emptySave(), 1, 2)
    expect(unlockedAxies(at2)).toContain('xia')
    expect(unlockedAxies(at2)).not.toContain('ena') // 3 étoiles requises
    const at3 = recordResult(at2, 2, 1)
    expect(unlockedAxies(at3)).toContain('ena')
  })

  it('n’inclut jamais l’Axie Dusk', () => {
    const s = { ...emptySave(), stars: { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3, 7: 3, 8: 3 } }
    expect(totalStars(s)).toBe(24)
    expect(unlockedAxies(s)).toHaveLength(19)
    expect(unlockedAxies(s)).not.toContain('support-dusk')
  })

  it('fait un aller-retour par le stockage', () => {
    saveNow(recordResult(emptySave(), 1, 3))
    expect(loadSave().stars['1']).toBe(3)
  })

  it('repart de zéro sur une sauvegarde illisible', () => {
    localStorage.setItem('axietd.save', '{ pas du json')
    expect(totalStars(loadSave())).toBe(0)
  })
})
