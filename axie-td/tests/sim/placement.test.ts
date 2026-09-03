import { describe, expect, it } from 'vitest'
import { createWorld, currentBudget, startWave } from '../../src/sim/world'
import { canPlace, move, place, remove, spentEnergy } from '../../src/sim/placement'

describe('placement', () => {
  it('accepte une classe de mêlée sur le chemin', () => {
    const w = createWorld(1)
    expect(canPlace(w, 'olek', w.level.path[4]).ok).toBe(true)
    expect(place(w, 'olek', w.level.path[4])).not.toBeNull()
    expect(w.axies[0].pathIndex).toBe(4)
  })

  it('refuse une classe à distance sur le chemin', () => {
    const w = createWorld(1)
    const check = canPlace(w, 'momo', w.level.path[4])
    expect(check.ok).toBe(false)
    expect(check.ok === false && check.reason).toContain('mêlée')
  })

  it('refuse une classe de mêlée sur une colline', () => {
    const w = createWorld(3)
    expect(canPlace(w, 'olek', w.level.hills[0]).ok).toBe(false)
  })

  it('refuse deux Axies sur la même case', () => {
    const w = createWorld(1)
    place(w, 'momo', [6, 6])
    expect(canPlace(w, 'puffy', [6, 6]).ok).toBe(false)
  })

  it('refuse de dépasser le budget de la vague', () => {
    const w = createWorld(1) // budget de la vague 1 : 3
    expect(currentBudget(w)).toBe(3)
    place(w, 'olek', [6, 6]) // coût 2
    expect(canPlace(w, 'buba', [6, 7]).ok).toBe(false) // 2 + 3 > 3
    expect(canPlace(w, 'momo', [6, 7]).ok).toBe(true) // 2 + 1 = 3
  })

  it('rend l’énergie au retrait', () => {
    const w = createWorld(1)
    const olek = place(w, 'olek', [6, 6])!
    expect(spentEnergy(w)).toBe(2)
    expect(remove(w, olek.uid)).toBe(true)
    expect(spentEnergy(w)).toBe(0)
  })

  it('déplace gratuitement', () => {
    const w = createWorld(1)
    const olek = place(w, 'olek', [6, 6])!
    expect(move(w, olek.uid, [6, 7])).toBe(true)
    expect(spentEnergy(w)).toBe(2)
    expect(olek.cell).toEqual([6, 7])
  })

  it('interdit tout placement pendant la vague', () => {
    const w = createWorld(1)
    startWave(w)
    expect(canPlace(w, 'momo', [6, 6]).ok).toBe(false)
    expect(place(w, 'momo', [6, 6])).toBeNull()
  })
})
