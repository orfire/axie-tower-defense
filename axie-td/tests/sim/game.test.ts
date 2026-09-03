import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { createWorld, startWave } from '../../src/sim/world'
import { runWave, starsFor, step } from '../../src/sim/game'
import { axieActions } from '../../src/sim/axieActions'
import { makeEnemy } from '../../src/sim/spawn'
import { place } from '../../src/sim/placement'
import { DT } from '../../src/sim/types'

/** Premier voisin orthogonal en plaine d'une case de chemin. */
function nearPlain(w: ReturnType<typeof createWorld>, cell: readonly [number, number]): [number, number] {
  for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const n: [number, number] = [cell[0] + dc, cell[1] + dr]
    if (w.board.kindAt(n) === 'plain') return n
  }
  throw new Error(`Aucun voisin en plaine pour ${cell}`)
}

/**
 * Un appel de fonction séparé pour lire `w.phase` : lu en ligne, une boucle
 * imbriquée dans une autre déjà gardée par `w.phase === 'placement'` hérite à
 * tort de ce rétrécissement littéral aux yeux de TypeScript, alors que
 * `startWave` a changé la phase entre-temps (TS2367).
 */
function isWave(w: ReturnType<typeof createWorld>): boolean {
  return w.phase === 'wave'
}

describe('étoiles', () => {
  it('convertit les PV restants en étoiles', () => {
    expect(starsFor(3)).toBe(3)
    expect(starsFor(2)).toBe(2)
    expect(starsFor(1)).toBe(1)
    expect(starsFor(0)).toBe(0)
  })
})

describe('vague', () => {
  it('respecte la cadence d’attaque', () => {
    // Le cooldown se remet à zéro quand il n'y a pas de cible, mais s'accumule
    // avec le dépassement quand il y a attaque. Un test de bout en bout passerait
    // au travers d'une erreur de rythme : on la mesure ici, directement.
    const w = createWorld(1)
    // [3, 3] coïncide avec l'index 7 du chemin du niveau 1 (le chemin y repasse) :
    // Momo (distance) ne peut pas s'y poser. [2, 2] est en plaine, à portée de
    // l'ennemi immobile en d = 3 (case [1, 1] du chemin).
    const momo = place(w, 'momo', [2, 2])!
    startWave(w)
    // slime : assez de PV pour encaisser la volée sans mourir, et 0 % d'armure —
    // le treant a 40 % d'armure, ce que la formule de « hits » ci-dessous ne
    // modélise pas (elle ne fait que le triangle de classes).
    const e = makeEnemy(w, 'slime')
    e.d = 3
    w.enemies.push(e)

    const before = e.hp
    for (let i = 0; i < Math.round(1 / DT); i++) axieActions(w)
    const hits = Math.round((before - e.hp) / (momo.eff.damage * 0.85)) // triangle Oiseau < Plante
    expect(hits).toBe(Math.round(momo.eff.rate)) // 2 coups par seconde
  })

  it('se termine quand tous les ennemis sont morts ou sortis', () => {
    const w = createWorld(1)
    place(w, 'olek', w.level.path[6])
    place(w, 'momo', nearPlain(w, w.level.path[6]))
    runWave(w)
    expect(w.phase).toBe('placement')
    expect(w.waveIndex).toBe(1)
    expect(w.enemies).toHaveLength(0)
  })

  it('perd le niveau quand les 3 PV tombent', () => {
    const w = createWorld(1)
    for (let i = 0; i < 8 && w.phase === 'placement'; i++) {
      startWave(w)
      for (let k = 0; k < 180 / DT && isWave(w); k++) step(w)
    }
    expect(w.phase).toBe('lost')
    expect(w.lives).toBeLessThanOrEqual(0)
  })

  it('gagne le niveau 1 avec une formation de référence', () => {
    const w = createWorld(1)
    place(w, 'olek', w.level.path[6])
    place(w, 'momo', nearPlain(w, w.level.path[6]))
    while (w.phase === 'placement') runWave(w)
    expect(w.phase).toBe('won')
    expect(w.lives).toBeGreaterThan(0)
  })
})

describe('déterminisme', () => {
  it('donne exactement le même résultat sur deux exécutions', () => {
    const run = () => {
      const w = createWorld(3)
      place(w, 'olek', w.level.path[8])
      place(w, 'momo', nearPlain(w, w.level.path[8]))
      while (w.phase === 'placement' && w.waveIndex < 3) runWave(w)
      return { lives: w.lives, wave: w.waveIndex, uid: w.nextUid }
    }
    expect(run()).toEqual(run())
  })

  it('n’utilise ni aléa ni horloge dans src/sim', () => {
    const dir = join(process.cwd(), 'src', 'sim')
    for (const f of readdirSync(dir)) {
      const src = readFileSync(join(dir, f), 'utf8')
      expect(src, f).not.toMatch(/Math\.random|Date\.now|performance\.now|new Date\(/)
    }
  })

  it('n’importe rien du rendu dans src/sim', () => {
    const dir = join(process.cwd(), 'src', 'sim')
    for (const f of readdirSync(dir)) {
      const src = readFileSync(join(dir, f), 'utf8')
      expect(src, f).not.toMatch(/from '(pixi|\.\.\/render|\.\.\/ui)/)
    }
  })
})
