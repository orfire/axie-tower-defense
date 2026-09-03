import { describe, expect, it } from 'vitest'
import { BALANCE } from '../../src/data/load'
import { createWorld } from '../../src/sim/world'
import { auraSources, recomputeAuras } from '../../src/sim/auras'
import { placeTestAxie } from './helpers'

describe('auras', () => {
  it('donne +1 case de portée à un voisin sous Vent', () => {
    const w = createWorld(1)
    const puffy = placeTestAxie(w, 'puffy', [3, 3])
    placeTestAxie(w, 'momo', [3, 4])
    recomputeAuras(w)
    expect(puffy.eff.range).toBeCloseTo(puffy.baseRange + 1)
  })

  it('ne traverse pas la diagonale', () => {
    const w = createWorld(1)
    const puffy = placeTestAxie(w, 'puffy', [3, 3])
    placeTestAxie(w, 'momo', [4, 4])
    recomputeAuras(w)
    expect(puffy.eff.range).toBeCloseTo(puffy.baseRange)
  })

  it('n’empile pas deux voisins de la même classe', () => {
    const w = createWorld(1)
    const puffy = placeTestAxie(w, 'puffy', [3, 3])
    placeTestAxie(w, 'momo', [3, 4])
    placeTestAxie(w, 'dps-bird', [2, 3])
    recomputeAuras(w)
    expect(puffy.eff.range).toBeCloseTo(puffy.baseRange + 1) // +1, pas +2
    // Une seule source Oiseau retenue, pas deux.
    expect(auraSources(w, puffy).filter((s) => s.cls === 'bird')).toHaveLength(1)
  })

  it('départage deux voisins de même classe par le plus petit uid', () => {
    // La valeur d'une aura ne dépend pas de son porteur, donc eff serait identique
    // dans les deux cas : seul auraSources révèle qui a été retenu. Sans départage
    // stable, le liseré affiché changerait d'un chargement à l'autre.
    const w = createWorld(1)
    const puffy = placeTestAxie(w, 'puffy', [3, 3])
    const first = placeTestAxie(w, 'momo', [3, 4])
    const second = placeTestAxie(w, 'dps-bird', [2, 3])
    expect(second.uid).toBeGreaterThan(first.uid)
    recomputeAuras(w)
    expect(auraSources(w, puffy).find((s) => s.cls === 'bird')!.uid).toBe(first.uid)
  })

  it('cumule deux auras de classes différentes', () => {
    const w = createWorld(1)
    const momo = placeTestAxie(w, 'momo', [3, 3])
    placeTestAxie(w, 'puffy', [3, 4]) // Marée
    placeTestAxie(w, 'buba', [2, 3]) // Fureur
    recomputeAuras(w)
    expect(momo.eff.tide).toBe(true)
    expect(momo.eff.fury).toBeCloseTo(BALANCE.auras.fury.value!)
  })

  it('double la cadence des DoT sous Essaim', () => {
    const w = createWorld(1)
    const momo = placeTestAxie(w, 'momo', [3, 3])
    placeTestAxie(w, 'pomodoro', [3, 4])
    recomputeAuras(w)
    expect(momo.eff.swarm).toBe(2)
  })

  it('ignore un voisin KO', () => {
    const w = createWorld(1)
    const puffy = placeTestAxie(w, 'puffy', [3, 3])
    const momo = placeTestAxie(w, 'momo', [3, 4])
    momo.ko = true
    recomputeAuras(w)
    expect(puffy.eff.range).toBeCloseTo(puffy.baseRange)
  })

  it('coupe l’Axie sur colline de toute aura et lui retire une case de portée', () => {
    const w = createWorld(3)
    const hill = w.level.hills[0]
    const momo = placeTestAxie(w, 'momo', hill)
    placeTestAxie(w, 'buba', [hill[0], hill[1] - 1])
    recomputeAuras(w)
    expect(momo.kind).toBe('hill')
    expect(momo.eff.range).toBeCloseTo(momo.baseRange - 1)
    expect(momo.eff.fury).toBe(1)
    expect(auraSources(w, momo)).toHaveLength(0)
  })

  it('empêche un Axie sur colline de donner son aura', () => {
    const w = createWorld(3)
    const hill = w.level.hills[0]
    placeTestAxie(w, 'momo', hill)
    const puffy = placeTestAxie(w, 'puffy', [hill[0], hill[1] - 1])
    recomputeAuras(w)
    expect(puffy.eff.range).toBeCloseTo(puffy.baseRange)
  })
})
