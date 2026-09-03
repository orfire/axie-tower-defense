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

  it('compose Écailles puis Fragile comme le chiffre du GDD', () => {
    // GDD §7.3 : un treant à 40 %, voisin d'un Reptile et Fragile, tombe à 12,5 %.
    // L'ordre inverse donnerait 5 %. Ce test verrouille l'ordre, pas seulement le résultat.
    const w = createWorld(5)
    const treant = makeEnemy(w, 'treant')
    treant.d = 3
    w.enemies.push(treant)
    expect(effectiveArmor(treant, w)).toBeCloseTo(0.4, 5)

    // Un Reptile sur une case voisine de celle qu'occupe le treant.
    const [c, r] = w.board.cellAt(treant.d)
    const neighbour: [number, number] = c + 1 < 7 ? [c + 1, r] : [c - 1, r]
    placeTestAxie(w, 'venoki', neighbour)
    expect(effectiveArmor(treant, w)).toBeCloseTo(0.25, 5) // 0,40 − 0,15

    treant.statuses.push({ id: 'fragile', remaining: 5, tickMult: 1, dps: 0 })
    expect(effectiveArmor(treant, w)).toBeCloseTo(0.125, 5) // puis divisé par deux
  })

  it('ne descend jamais sous zéro', () => {
    const w = createWorld(1)
    const slime = makeEnemy(w, 'slime') // aucune armure
    slime.d = 3
    w.enemies.push(slime)
    const [c, r] = w.board.cellAt(slime.d)
    placeTestAxie(w, 'venoki', c + 1 < 7 ? [c + 1, r] : [c - 1, r])
    expect(effectiveArmor(slime, w)).toBe(0)
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

  it('départage deux cibles identiques par le plus petit uid', () => {
    // Sans ce départage, le vainqueur dépendrait de l'ordre du tableau
    // et deux parties identiques divergeraient.
    const w = createWorld(1)
    const momo = placeTestAxie(w, 'momo', [3, 3])
    startWave(w)
    const a = makeEnemy(w, 'slime'); a.d = 3
    const b = makeEnemy(w, 'slime'); b.d = 3
    w.enemies.push(b, a) // volontairement dans le désordre
    expect(pickTarget(w, momo)!.uid).toBe(Math.min(a.uid, b.uid))
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
    expect(e.hp).toBe(0) // jamais négatif à l'affichage
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
