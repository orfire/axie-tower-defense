import { describe, expect, it } from 'vitest'
import { createWorld, startWave } from '../../src/sim/world'
import { makeEnemy } from '../../src/sim/spawn'
import { recomputeAuras } from '../../src/sim/auras'
import { applyStatus, hasStatus } from '../../src/sim/status'
import { axieAttack } from '../../src/sim/axieActions'
import { placeTestAxie } from './helpers'

describe('réactions en chaîne', () => {
  it('fait ricocher l’Oiseau sur une cible Trempée', () => {
    const w = createWorld(1)
    const momo = placeTestAxie(w, 'momo', [3, 3])
    recomputeAuras(w)
    startWave(w)
    const main = makeEnemy(w, 'slime'); main.d = 3
    const near = makeEnemy(w, 'slime'); near.d = 3.5
    w.enemies.push(main, near)
    applyStatus(w, main, 'wet')
    const before = near.hp
    axieAttack(w, momo, main)
    expect(near.hp).toBeLessThan(before)
    expect(w.events.some((e) => e.k === 'reaction' && e.id === 'ricochet')).toBe(true)
  })

  it('ne ricoche pas sur une cible sèche', () => {
    const w = createWorld(1)
    const momo = placeTestAxie(w, 'momo', [3, 3])
    recomputeAuras(w)
    startWave(w)
    const main = makeEnemy(w, 'slime'); main.d = 3
    const near = makeEnemy(w, 'slime'); near.d = 3.5
    w.enemies.push(main, near)
    const before = near.hp
    axieAttack(w, momo, main)
    expect(near.hp).toBe(before)
  })

  it('double la durée du poison sur une cible enracinée', () => {
    const w = createWorld(1)
    const pomo = placeTestAxie(w, 'pomodoro', [3, 3])
    recomputeAuras(w)
    startWave(w)
    const e = makeEnemy(w, 'slime'); e.d = 3
    e.statuses.push({ id: 'roots', remaining: Infinity, tickMult: 1, dps: 0 })
    w.enemies.push(e)
    axieAttack(w, pomo, e)
    expect(e.statuses.find((s) => s.id === 'poison')!.remaining).toBeCloseTo(8)
    expect(w.events.some((ev) => ev.k === 'reaction' && ev.id === 'rooting')).toBe(true)
  })

  it('fait un critique de la Bête sur une cible Fragile', () => {
    const w = createWorld(5)
    const buba = placeTestAxie(w, 'buba', [3, 3])
    recomputeAuras(w)
    startWave(w)
    const plain = makeEnemy(w, 'treant'); plain.d = 3
    const frag = makeEnemy(w, 'treant'); frag.d = 3
    w.enemies.push(plain, frag)
    axieAttack(w, buba, plain)
    const normalLoss = plain.maxHp - plain.hp
    applyStatus(w, frag, 'fragile')
    axieAttack(w, buba, frag)
    const critLoss = frag.maxHp - frag.hp
    expect(critLoss).toBeGreaterThan(normalLoss * 1.9)
    expect(w.events.some((ev) => ev.k === 'reaction' && ev.id === 'shatter')).toBe(true)
  })

  it('fait exploser une cible qui saigne quand la Bête l’achève', () => {
    const w = createWorld(1)
    const buba = placeTestAxie(w, 'buba', [3, 3])
    recomputeAuras(w)
    startWave(w)
    const dying = makeEnemy(w, 'slime'); dying.d = 3; dying.hp = 1
    const near = makeEnemy(w, 'slime'); near.d = 3.4
    w.enemies.push(dying, near)
    applyStatus(w, dying, 'poison')
    applyStatus(w, dying, 'bleed')
    axieAttack(w, buba, dying)
    expect(dying.alive).toBe(false)
    expect(near.hp).toBeLessThan(near.maxHp)
    expect(w.events.some((ev) => ev.k === 'reaction' && ev.id === 'burst')).toBe(true)
  })

  it('applique Trempé via l’aura Marée d’un voisin Aquatique', () => {
    const w = createWorld(1)
    const momo = placeTestAxie(w, 'momo', [3, 3])
    placeTestAxie(w, 'puffy', [3, 4])
    recomputeAuras(w)
    startWave(w)
    const e = makeEnemy(w, 'slime'); e.d = 3
    w.enemies.push(e)
    axieAttack(w, momo, e)
    expect(hasStatus(e, 'wet')).toBe(true)
  })

  it('empoisonne au premier coup, saigne au second', () => {
    // GDD §6.1 : Saignement vise « une cible déjà empoisonnée ». Le premier coup
    // ne doit donc pas cumuler les deux, sinon l'Insecte ouvre à 10 dégâts par
    // seconde au lieu de 4 et la montée en puissance disparaît.
    const w = createWorld(1)
    const pomo = placeTestAxie(w, 'pomodoro', [3, 3])
    recomputeAuras(w)
    startWave(w)
    const e = makeEnemy(w, 'treant'); e.d = 3 // assez de PV pour encaisser deux coups
    w.enemies.push(e)

    axieAttack(w, pomo, e)
    expect(hasStatus(e, 'poison')).toBe(true)
    expect(hasStatus(e, 'bleed')).toBe(false)

    axieAttack(w, pomo, e)
    expect(hasStatus(e, 'bleed')).toBe(true)
  })

  it('donne une charge de Rage à la Bête qui tue', () => {
    const w = createWorld(1)
    const buba = placeTestAxie(w, 'buba', [3, 3])
    recomputeAuras(w)
    startWave(w)
    const e = makeEnemy(w, 'slime'); e.d = 3; e.hp = 1
    w.enemies.push(e)
    axieAttack(w, buba, e)
    expect(buba.rageStacks).toBe(1)
    expect(buba.eff.rate).toBeGreaterThan(buba.baseRate)
  })
})
