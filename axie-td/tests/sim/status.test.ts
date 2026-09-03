import { describe, expect, it } from 'vitest'
import { createWorld, startWave } from '../../src/sim/world'
import { makeEnemy } from '../../src/sim/spawn'
import { applyStatus, hasStatus, refreshRoots, tickStatuses } from '../../src/sim/status'
import { DT } from '../../src/sim/types'
import { placeTestAxie } from './helpers'

function ticks(w: ReturnType<typeof createWorld>, seconds: number) {
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    w.t += DT
    tickStatuses(w)
  }
}

describe('statuts', () => {
  it('fait expirer Trempé au bout de 4 secondes', () => {
    const w = createWorld(1)
    const e = makeEnemy(w, 'slime'); w.enemies.push(e)
    applyStatus(w, e, 'wet')
    expect(hasStatus(e, 'wet')).toBe(true)
    ticks(w, 3.8)
    expect(hasStatus(e, 'wet')).toBe(true)
    ticks(w, 0.4)
    expect(hasStatus(e, 'wet')).toBe(false)
  })

  it('rafraîchit la durée au lieu de s’empiler', () => {
    const w = createWorld(1)
    const e = makeEnemy(w, 'slime'); w.enemies.push(e)
    applyStatus(w, e, 'poison')
    ticks(w, 3)
    applyStatus(w, e, 'poison')
    expect(e.statuses.filter((s) => s.id === 'poison')).toHaveLength(1)
    ticks(w, 3)
    expect(hasStatus(e, 'poison')).toBe(true)
  })

  it('garde le plus fort des deux à la réapplication', () => {
    // La tâche 8 pose des poisons de durée doublée (Enracinement) et de cadence
    // doublée (Essaim). Un coup ordinaire qui suit ne doit pas les effacer,
    // sinon la réaction en chaîne serait annulée sans que rien n'échoue.
    const w = createWorld(1)
    const e = makeEnemy(w, 'slime'); w.enemies.push(e)
    applyStatus(w, e, 'poison', { tickMult: 2, durationMult: 2 })
    const strong = e.statuses.find((s) => s.id === 'poison')!
    expect(strong.remaining).toBeCloseTo(8)
    expect(strong.tickMult).toBe(2)

    applyStatus(w, e, 'poison') // coup ordinaire, sans multiplicateur
    const after = e.statuses.find((s) => s.id === 'poison')!
    expect(after.remaining).toBeCloseTo(8) // et non 4
    expect(after.tickMult).toBe(2) // et non 1
  })

  it('inflige 4 dégâts par seconde en poison, sans tenir compte de l’armure', () => {
    const w = createWorld(5)
    const treant = makeEnemy(w, 'treant'); w.enemies.push(treant) // 40 % d'armure
    applyStatus(w, treant, 'poison')
    ticks(w, 1)
    expect(treant.maxHp - treant.hp).toBeCloseTo(4, 4)
  })

  it('double la cadence du poison sous l’aura Essaim', () => {
    const w = createWorld(1)
    const e = makeEnemy(w, 'slime'); w.enemies.push(e)
    applyStatus(w, e, 'poison', { tickMult: 2 })
    ticks(w, 1)
    expect(e.maxHp - e.hp).toBeCloseTo(8, 4)
  })

  it('pose Racines quand une Plante est voisine et le retire sinon', () => {
    const w = createWorld(1)
    // path[3] vaut [1,1] au niveau 1, et son voisin de droite [2,1] est path[2],
    // donc sur le chemin. On prend le voisin de gauche, en plaine.
    const cell = w.level.path[3]
    const olek = placeTestAxie(w, 'olek', [cell[0] - 1, cell[1]])
    startWave(w)
    const e = makeEnemy(w, 'slime'); e.d = 3; w.enemies.push(e)
    refreshRoots(w)
    expect(hasStatus(e, 'roots')).toBe(true)
    olek.ko = true
    refreshRoots(w)
    expect(hasStatus(e, 'roots')).toBe(false)
  })

  it('n’applique pas Saignement sur une cible non empoisonnée', () => {
    const w = createWorld(1)
    const e = makeEnemy(w, 'slime'); w.enemies.push(e)
    applyStatus(w, e, 'bleed')
    expect(hasStatus(e, 'bleed')).toBe(false)
    applyStatus(w, e, 'poison')
    applyStatus(w, e, 'bleed')
    expect(hasStatus(e, 'bleed')).toBe(true)
  })

  it('tue un ennemi par le poison seul', () => {
    const w = createWorld(1)
    const e = makeEnemy(w, 'slime-forest-b'); w.enemies.push(e) // 30 PV
    for (let i = 0; i < 3; i++) { applyStatus(w, e, 'poison'); ticks(w, 4) }
    expect(e.alive).toBe(false)
  })
})
