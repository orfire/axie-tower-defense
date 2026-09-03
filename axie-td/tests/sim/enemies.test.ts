import { describe, expect, it } from 'vitest'
import { createWorld, startWave } from '../../src/sim/world'
import { makeEnemy } from '../../src/sim/spawn'
import { moveEnemies } from '../../src/sim/movement'
import { enemyActions, resolveDeaths } from '../../src/sim/enemies'
import { DT } from '../../src/sim/types'
import { placeTestAxie } from './helpers'

/**
 * Premier voisin orthogonal en plaine d'une case de chemin.
 * Un décalage fixe ne convient pas : selon le niveau, le voisin de droite d'une
 * case de chemin est lui-même sur le chemin, et l'Axie ne serait plus en plaine.
 */
function nearPlain(w: ReturnType<typeof createWorld>, cell: readonly [number, number]): [number, number] {
  for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const n: [number, number] = [cell[0] + dc, cell[1] + dr]
    if (w.board.kindAt(n) === 'plain') return n
  }
  throw new Error(`Aucun voisin en plaine pour ${cell}`)
}

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
    const puffy = placeTestAxie(w, 'puffy', nearPlain(w, w.level.path[6]))
    startWave(w)
    const e = makeEnemy(w, 'slime'); e.d = 4; w.enemies.push(e)
    for (let i = 0; i < 120; i++) { w.t += DT; moveEnemies(w); enemyActions(w) }
    expect(olek.hp).toBeLessThan(olek.maxHp)
    expect(puffy.hp).toBe(puffy.maxHp)
  })

  it('fait tirer slime-attack sur un Axie à portée', () => {
    const w = createWorld(4)
    const puffy = placeTestAxie(w, 'puffy', nearPlain(w, w.level.path[3]))
    startWave(w)
    const e = makeEnemy(w, 'slime-attack'); e.d = 3; w.enemies.push(e)
    for (let i = 0; i < 90; i++) { w.t += DT; enemyActions(w) }
    expect(puffy.hp).toBeLessThan(puffy.maxHp)
  })

  it('empêche slime-attack d’atteindre une colline', () => {
    // On sème un tireur sur chaque case du chemin : aucun ne doit toucher la colline,
    // quelle que soit sa position, puisque hits_hill vaut faux pour ce type.
    const w = createWorld(4)
    const momo = placeTestAxie(w, 'momo', w.level.hills[0])
    startWave(w)
    for (let d = 0; d < w.board.length; d++) {
      const e = makeEnemy(w, 'slime-attack'); e.d = d; w.enemies.push(e)
    }
    for (let i = 0; i < 120; i++) { w.t += DT; enemyActions(w) }
    expect(momo.hp).toBe(momo.maxHp)
  })

  it('touche en revanche un Axie en plaine, à portée', () => {
    // Contrôle que le test précédent prouve bien l'exclusion des collines
    // et non simplement que le tireur ne touche jamais rien.
    const w = createWorld(4)
    const puffy = placeTestAxie(w, 'puffy', nearPlain(w, w.level.path[3]))
    startWave(w)
    const e = makeEnemy(w, 'slime-attack'); e.d = 3; w.enemies.push(e)
    for (let i = 0; i < 120; i++) { w.t += DT; enemyActions(w) }
    expect(puffy.hp).toBeLessThan(puffy.maxHp)
  })

  it('laisse dryad-mage atteindre la colline la plus proche du chemin', () => {
    // Le rayon du mage vaut 1,5 et la colline la plus proche du chemin est à 1,414
    // au niveau 6. C'est le seul cas où sa menace anti-colline peut se matérialiser,
    // et tools/gen-data.mjs vérifie que chaque niveau à dryades en offre au moins un.
    const w = createWorld(6)
    const { hill, d } = closestHill(w)
    const momo = placeTestAxie(w, 'momo', hill)
    startWave(w)
    const e = makeEnemy(w, 'dryad-mage')
    e.d = d
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

/**
 * Colline la plus proche du chemin, et la progression `d` qui l'approche au mieux.
 * Recherche fine, pas seulement sur les index entiers : un tireur se place aussi
 * entre deux cases.
 */
function closestHill(w: ReturnType<typeof createWorld>) {
  let best = { hill: w.level.hills[0], d: 0, dist: Infinity }
  for (const hill of w.level.hills) {
    for (let d = 0; d <= w.board.length - 1; d += 0.05) {
      const p = w.board.posAt(d)
      const dist = Math.hypot(p.x - (hill[0] + 0.5), p.y - (hill[1] + 0.5))
      if (dist < best.dist) best = { hill, d, dist }
    }
  }
  return best
}
