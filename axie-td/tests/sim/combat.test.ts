import { describe, expect, it } from 'vitest'
import { createWorld, startWave } from '../../src/sim/world'
import { makeEnemy } from '../../src/sim/spawn'
import { damageAxie, damageEnemy, effectiveArmor, triangleMult } from '../../src/sim/combat'
import { pickTarget } from '../../src/sim/targeting'
import { placeTestAxie } from './helpers'

describe('triangle', () => {
  it('donne 1.15 en avantage, 0.85 en désavantage, 1 sinon', () => {
    expect(triangleMult('beast', 'plant')).toBeCloseTo(1.15)
    expect(triangleMult('plant', 'beast')).toBeCloseTo(0.85)
    expect(triangleMult('beast', 'bug')).toBe(1)
  })
})

describe('armure', () => {
  it('réduit les dégâts directs', () => {
    const w = createWorld(5)
    const treant = makeEnemy(w, 'treant') // 40 % d'armure
    expect(effectiveArmor(treant, w)).toBeCloseTo(0.4)
    damageEnemy(w, treant, 100, { from: null })
    expect(treant.hp).toBeCloseTo(300 - 60)
  })

  it('est ignorée par le poison', () => {
    const w = createWorld(5)
    const treant = makeEnemy(w, 'treant')
    damageEnemy(w, treant, 100, { from: null, ignoresArmor: true })
    expect(treant.hp).toBeCloseTo(200)
  })
})

describe('ciblage', () => {
  it('vise le plus avancé à portée', () => {
    const w = createWorld(1)
    const momo = placeTestAxie(w, 'momo', [3, 3])
    startWave(w)
    const a = makeEnemy(w, 'slime'); a.d = 2
    const b = makeEnemy(w, 'slime'); b.d = 5
    w.enemies.push(a, b)
    const target = pickTarget(w, momo)
    expect(target).not.toBeNull()
    expect(target!.d).toBeGreaterThanOrEqual(a.d)
  })

  it('ne vise rien hors de portée', () => {
    const w = createWorld(1)
    const olek = placeTestAxie(w, 'olek', [6, 9]) // portée 1
    startWave(w)
    const e = makeEnemy(w, 'slime'); e.d = 0
    w.enemies.push(e)
    expect(pickTarget(w, olek)).toBeNull()
  })

  it('donne la priorité à une cible marquée par Plume', () => {
    const w = createWorld(1)
    const momo = placeTestAxie(w, 'momo', [3, 3])
    startWave(w)
    const far = makeEnemy(w, 'slime'); far.d = 6
    const marked = makeEnemy(w, 'slime'); marked.d = 3
    marked.statuses.push({ id: 'feather', remaining: 3, tickMult: 1, dps: 0 })
    w.enemies.push(far, marked)
    // les deux à portée : la marque gagne sur l'avancement
    const t = pickTarget(w, momo)
    expect(t!.uid).toBe(marked.uid)
  })
})

describe('mort et KO', () => {
  it('marque un ennemi mort et émet l’événement', () => {
    const w = createWorld(1)
    const e = makeEnemy(w, 'slime')
    w.enemies.push(e)
    const died = damageEnemy(w, e, 999, { from: null })
    expect(died).toBe(true)
    expect(e.alive).toBe(false)
    expect(w.events.some((ev) => ev.k === 'death' && ev.uid === e.uid)).toBe(true)
  })

  it('met un Axie KO à 0 PV sans le supprimer', () => {
    const w = createWorld(1)
    const olek = placeTestAxie(w, 'olek', w.level.path[4])
    damageAxie(w, olek, 9999, null)
    expect(olek.ko).toBe(true)
    expect(olek.hp).toBe(0)
    expect(w.axies).toHaveLength(1)
    expect(w.events.some((ev) => ev.k === 'ko')).toBe(true)
  })
})
