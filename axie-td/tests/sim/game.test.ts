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
 * TypeScript garde le type littéral `'placement'` de `w.phase` à travers l'appel
 * à `startWave`, et signale alors une comparaison impossible (TS2367). Passer par
 * une fonction casse cette déduction, sans rien changer au comportement.
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
    // [3, 3] est l'index 7 du chemin au niveau 1 : Momo, classe à distance, ne peut
    // pas s'y poser. [2, 2] est en plaine et à portée de l'ennemi immobile en d = 3.
    const momo = place(w, 'momo', [2, 2])!
    startWave(w)
    // slime : 0 % d'armure. Le treant en a 40 %, que la formule de comptage
    // ci-dessous ne modélise pas, puisqu'elle ne fait que le triangle de classes.
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

  it('avance un ennemi d’exactement sa vitesse en une seconde', () => {
    // Le test précédent ne peut PAS détecter un réordonnancement de step :
    // rejouer du code déterministe donne le même résultat quel que soit l'ordre
    // interne. Celui-ci le peut. step incrémente le temps, fait apparaître, puis
    // déplace, donc un slime à vitesse 1 a parcouru exactement 1 case au bout de
    // 30 ticks. Si l'apparition passait après le déplacement, il aurait un tick
    // de retard et vaudrait 29/30.
    const w = createWorld(1)
    startWave(w)
    for (let i = 0; i < Math.round(1 / DT); i++) step(w)
    expect(w.enemies[0].d).toBeCloseTo(1, 6)
  })

  it('frappe le bloqueur dès le tick où le blocage s’établit', () => {
    // C'EST ce test qui est sensible à l'ordre entre moveEnemies, qui pose
    // blockedBy, et enemyActions, qui le consomme. Dans le bon ordre, le tout
    // premier tick de blocage inflige déjà des dégâts. Si enemyActions passait
    // avant moveEnemies, il lirait un blockedBy encore vide et les dégâts
    // n'arriveraient qu'au tick suivant.
    // Mesurer une seconde en régime établi ne le détecte pas : une fois le
    // blocage installé, le drapeau vaut la même chose dans les deux ordres et le
    // décalage d'un tick disparaît dans la somme.
    const w = createWorld(1)
    const olek = place(w, 'olek', w.level.path[6])!
    startWave(w)

    let hpAvant = olek.hp
    let ticks = 0
    while (ticks < Math.round(20 / DT) && !w.enemies.some((e) => e.blockedBy === olek.uid)) {
      hpAvant = olek.hp
      step(w)
      ticks++
    }
    expect(w.enemies.some((e) => e.blockedBy === olek.uid), 'aucun blocage en 20 s').toBe(true)
    // Le slime inflige 4 dégâts par seconde, soit 4 × DT sur ce seul tick.
    expect(hpAvant - olek.hp).toBeCloseTo(4 * DT, 6)
  })

  it('inflige exactement les dégâts de mêlée d’une seconde au bloqueur', () => {
    // Contrôle de valeur, pas d'ordre : un slime bloqué retire 4 PV par seconde
    // à Olek, sans modificateur, Plante contre Plante étant neutre.
    const w = createWorld(1)
    const olek = place(w, 'olek', w.level.path[6])!
    startWave(w)
    // On avance jusqu'au blocage, et pas au-delà. Attendre un temps fixe laisserait
    // Olek entamer sa cible avant la mesure : un slime à 40 PV sans armure tombe en
    // 4 s environ sous ses 9,6 dégâts par seconde, et mourrait au milieu de la
    // seconde mesurée, ce qui la trouerait.
    let waited = 0
    while (
      waited < Math.round(20 / DT)
      && w.phase === 'wave'
      && !w.enemies.some((e) => e.blockedBy === olek.uid)
    ) {
      step(w)
      waited++
    }
    const blocked = w.enemies.find((e) => e.blockedBy === olek.uid)
    expect(blocked, 'aucun ennemi bloqué après 20 s').toBeDefined()

    const before = olek.hp
    for (let i = 0; i < Math.round(1 / DT); i++) step(w)
    expect(before - olek.hp).toBeCloseTo(4, 4)
  })

  it('n’utilise ni aléa ni horloge dans src/sim', () => {
    for (const [name, src] of simSources()) {
      expect(src, name).not.toMatch(/Math\.random|Date\.now|performance\.now|new Date\(/)
    }
  })

  it('n’importe rien du rendu dans src/sim', () => {
    for (const [name, src] of simSources()) {
      // Guillemets simples ou doubles, import statique ou dynamique.
      expect(src, name).not.toMatch(/(?:from|import\s*\()\s*['"](?:pixi|\.\.\/render|\.\.\/ui)/)
    }
  })
})

/** Tous les fichiers TypeScript de src/sim, sous-dossiers compris. */
function simSources(): [string, string][] {
  const out: [string, string][] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith('.ts')) out.push([full, readFileSync(full, 'utf8')])
    }
  }
  walk(join(process.cwd(), 'src', 'sim'))
  if (out.length === 0) throw new Error('Aucun fichier trouvé dans src/sim')
  return out
}
