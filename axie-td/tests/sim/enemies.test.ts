import { describe, expect, it } from 'vitest'
import { createWorld, startWave } from '../../src/sim/world'
import { makeEnemy } from '../../src/sim/spawn'
import { moveEnemies } from '../../src/sim/movement'
import { enemyActions, resolveDeaths } from '../../src/sim/enemies'
import { DT } from '../../src/sim/types'
import { placeTestAxie } from './helpers'

/**
 * Case adjacente à `c`, décalée en y (pas en x) : au niveau 1, `path[6] + (1,0)`
 * tombe sur `path[7]` (chemin, pas plaine) — vérifié sur `data/levels/01.json`.
 * Le décalage en y évite la collision et retombe bien en plaine.
 */
const near = (c: readonly [number, number]): [number, number] => [c[0], c[1] + 1]

describe('chimères', () => {
  it('fait frapper le bloqueur par l’ennemi bloqué', () => {
    const w = createWorld(1)
    const olek = placeTestAxie(w, 'olek', w.level.path[6])
    startWave(w)
    const e = makeEnemy(w, 'slime'); e.d = 4; w.enemies.push(e)
    for (let i = 0; i < 120; i++) { w.t += DT; moveEnemies(w); enemyActions(w) }
    expect(olek.hp).toBeLessThan(olek.maxHp)
  })

  it('épargne les Axies en plaine de toute mêlée', () => {
    const w = createWorld(1)
    const olek = placeTestAxie(w, 'olek', w.level.path[6])
    const puffy = placeTestAxie(w, 'puffy', near(w.level.path[6]))
    startWave(w)
    const e = makeEnemy(w, 'slime'); e.d = 4; w.enemies.push(e)
    for (let i = 0; i < 120; i++) { w.t += DT; moveEnemies(w); enemyActions(w) }
    expect(olek.hp).toBeLessThan(olek.maxHp)
    expect(puffy.hp).toBe(puffy.maxHp)
  })

  it('fait tirer slime-attack sur un Axie à portée', () => {
    const w = createWorld(4)
    const puffy = placeTestAxie(w, 'puffy', near(w.level.path[3]))
    startWave(w)
    const e = makeEnemy(w, 'slime-attack'); e.d = 3; w.enemies.push(e)
    for (let i = 0; i < 90; i++) { w.t += DT; enemyActions(w) }
    expect(puffy.hp).toBeLessThan(puffy.maxHp)
  })

  it('empêche slime-attack d’atteindre une colline', () => {
    const w = createWorld(4)
    const momo = placeTestAxie(w, 'momo', w.level.hills[0])
    startWave(w)
    for (let d = 0; d < w.board.length; d++) {
      const e = makeEnemy(w, 'slime-attack'); e.d = d; w.enemies.push(e)
    }
    for (let i = 0; i < 120; i++) { w.t += DT; enemyActions(w) }
    expect(momo.hp).toBe(momo.maxHp)
  })

  it('laisse dryad-mage atteindre une colline', () => {
    const w = createWorld(6)
    // Sur les 8 niveaux, la colline la plus proche du chemin est à √2 case
    // (diagonale) — jamais à 1 case ou moins. Le rayon de zone du mage (1)
    // ne peut donc atteindre AUCUNE colline réelle du jeu tel quel : ce n'est
    // pas un mauvais choix d'index (hills[0] vs hills[1]) mais une limite
    // numérique de la donnée. hills[1] est la colline la plus proche
    // (√2 ≈ 1,414) ; on élargit le rayon de cette seule instance d'ennemi
    // pour isoler la règle testée (hits_hill laisse la zone atteindre une
    // cible de type colline dans son rayon), sans toucher balance.json.
    const hill = w.level.hills[1]
    const momo = placeTestAxie(w, 'momo', hill)
    startWave(w)
    const e = makeEnemy(w, 'dryad-mage')
    e.d = nearestIndex(w, hill)
    e.def.aoe!.radius = 1.5
    w.enemies.push(e)
    for (let i = 0; i < 200; i++) { w.t += DT; enemyActions(w) }
    expect(momo.hp).toBeLessThan(momo.maxHp)
  })

  it('soigne les alliés proches sans dépasser leurs PV maximum', () => {
    const w = createWorld(4)
    startWave(w)
    const healer = makeEnemy(w, 'slime-support'); healer.d = 3
    const hurt = makeEnemy(w, 'slime'); hurt.d = 3; hurt.hp = 10
    w.enemies.push(healer, hurt)
    for (let i = 0; i < 300; i++) { w.t += DT; enemyActions(w) }
    expect(hurt.hp).toBe(hurt.maxHp)
  })

  it('scinde slime-fusion en deux slimes à sa mort', () => {
    const w = createWorld(8)
    startWave(w)
    const fusion = makeEnemy(w, 'slime-fusion'); fusion.d = 5
    w.enemies.push(fusion)
    fusion.alive = false
    resolveDeaths(w)
    const spawned = w.enemies.filter((e) => e.type === 'slime')
    expect(spawned).toHaveLength(2)
    expect(spawned[0].d).toBeCloseTo(5)
  })

  it('ne scinde pas deux fois le même mort', () => {
    const w = createWorld(8)
    startWave(w)
    const fusion = makeEnemy(w, 'slime-fusion'); fusion.d = 5; fusion.alive = false
    w.enemies.push(fusion)
    resolveDeaths(w)
    resolveDeaths(w)
    expect(w.enemies.filter((e) => e.type === 'slime')).toHaveLength(2)
  })

  it('retire les morts de la liste', () => {
    const w = createWorld(1)
    startWave(w)
    const a = makeEnemy(w, 'slime')
    const b = makeEnemy(w, 'slime'); b.alive = false
    w.enemies.push(a, b)
    resolveDeaths(w)
    expect(w.enemies).toHaveLength(1)
    expect(w.enemies[0].uid).toBe(a.uid)
  })
})

/** Index du chemin le plus proche d'une case, pour placer un tireur à portée. */
function nearestIndex(w: ReturnType<typeof createWorld>, cell: readonly [number, number]): number {
  let best = 0
  let bestD = Infinity
  for (let i = 0; i < w.board.length; i++) {
    const p = w.board.posAt(i)
    const d = Math.hypot(p.x - (cell[0] + 0.5), p.y - (cell[1] + 0.5))
    if (d < bestD) { bestD = d; best = i }
  }
  return best
}
