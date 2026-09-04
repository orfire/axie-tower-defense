/**
 * Banc d'équilibrage. Mesure, pour chaque niveau, la part du budget d'énergie
 * qu'un joueur compétent doit réellement dépenser pour décrocher trois étoiles.
 *
 * Lecture : « 3★ dès 40 % » = le niveau se gagne parfaitement en dépensant deux
 * cinquièmes de l'énergie offerte, donc il ne demande aucun choix. La cible est
 * 80 à 100 % sur la seconde moitié de la campagne, 60 à 80 % au début.
 *
 * Le placeur glouton n'est pas optimal : il ignore les auras et les réactions.
 * Il donne un plancher de difficulté, pas un plafond. Une mesure trop facile est
 * donc un verdict sûr ; une mesure difficile demande une vérification à la main.
 *
 * Usage : npx vite-node tools/balance.ts [-- niveau]
 */
import { AXIES, BALANCE, LEVELS, axieDef } from '../src/data/load'
import type { Cell, ClassId } from '../src/data/types'
import { runLevel } from '../src/sim/game'
import { canPlace, place, spentEnergy } from '../src/sim/placement'
import { center, dist } from '../src/sim/grid'
import { createWorld, type World } from '../src/sim/world'

const ROSTER = AXIES.filter((a) => a.class !== 'dusk').map((a) => a.id)

function cost(axieId: string): number {
  return BALANCE.classes[axieDef(axieId).class as ClassId].cost
}

/** Nombre de points du chemin qu'une case couvre, échantillonné au quart de case. */
function coverage(w: World, cell: Cell, range: number): number {
  const at = center(cell)
  let n = 0
  for (let d = 0; d < w.board.length; d += 0.25) {
    if (dist(at, w.board.posAt(d)) <= range) n++
  }
  return n * 0.25
}

/**
 * Pose des Axies tant que l'énergie dépensée reste sous `cap`.
 * Un bloqueur de mêlée sur le chemin passe en premier : c'est le premier geste
 * de tout joueur, et le glouton pur ne le trouverait pas puisqu'il ne sait pas
 * qu'immobiliser une vague multiplie le temps de tir de toute la formation.
 */
function greedyPlace(w: World, cap: number): void {
  const roster = w.level.draft.forced ?? ROSTER
  const cells: Cell[] = []
  for (let c = 0; c < BALANCE.grid.cols; c++) {
    for (let r = 0; r < BALANCE.grid.rows; r++) cells.push([c, r])
  }

  if (!w.axies.some((a) => a.kind === 'path')) {
    // Au tiers du chemin : assez tôt pour que les tireurs profitent de l'arrêt.
    const target = w.board.path[Math.floor(w.board.length / 3)]
    const blockers = roster
      .filter((id) => BALANCE.classes[axieDef(id).class as ClassId].line === 'melee')
      .sort((a, b) => cost(a) - cost(b))
    // Le plafond s'applique aussi au bloqueur : sans ce test il serait gratuit
    // et toutes les mesures sous 100 % seraient fausses.
    for (const id of blockers) {
      if (spentEnergy(w) + cost(id) <= cap && place(w, id, target)) break
    }
  }

  // Portee de tir la plus longue parmi les chimeres du niveau.
  const threat = Math.max(0, ...[...new Set(w.level.waves.flatMap((wv) => wv.spawns.map((sp) => sp.enemy)))]
    .map((e) => {
      const d = BALANCE.enemies[e]
      return Math.max(d.ranged?.range ?? 0, d.aoe?.radius ?? 0)
    }))

  for (;;) {
    let best: { id: string; cell: Cell; score: number } | null = null
    for (const id of roster) {
      const def = axieDef(id)
      const cls = BALANCE.classes[def.class as ClassId]
      if (spentEnergy(w) + cls.cost > cap) continue
      const dps = cls.damage * (1 + def.bonuses.damage) * cls.rate * (1 + def.bonuses.rate)
      for (const cell of cells) {
        if (!canPlace(w, id, cell).ok) continue
        // Une case sous le feu des chimeres a distance coute des Axies morts.
        // Sans ce terme le glouton aligne ses tireurs face aux dryades et se
        // fait effacer, ce qui ferait passer un niveau exigeant pour un niveau
        // impossible.
        const exposed = threat > 0 && coverage(w, cell, threat) > 0
        const score = ((dps * coverage(w, cell, cls.range)) / cls.cost) * (exposed ? 0.35 : 1)
        if (!best || score > best.score) best = { id, cell, score }
      }
    }
    if (!best) return
    place(w, best.id, best.cell)
  }
}

/** Plus petite fraction du budget qui décroche trois étoiles, ou null si aucune. */
function headroom(levelId: number): { frac: number | null; detail: string[] } {
  const detail: string[] = []
  let found: number | null = null
  for (const frac of [0.4, 0.6, 0.8, 1]) {
    const w = createWorld(levelId)
    const stars = runLevel(w, (world) => greedyPlace(world, Math.floor(currentCap(world, frac))))
    const label = w.phase === 'won' ? `${stars}★ (${w.lives}/3 PV)` : `perdu v${w.waveIndex + 1}`
    detail.push(`${Math.round(frac * 100)}% ${label}`)
    if (found === null && stars === 3) found = frac
  }
  if (found === null) {
    // Le glouton ignore les auras et le triangle des classes ; un humain fait
    // mieux. On mesure l'écart en lui accordant plus que le budget : s'il gagne
    // à 130 %, le niveau est exigeant. S'il faut le double, il est cassé.
    for (const frac of [1.3, 1.6, 2]) {
      const w = createWorld(levelId)
      const stars = runLevel(w, (world) => greedyPlace(world, Math.floor(currentCap(world, frac))))
      if (stars === 3) { detail.push('(3★ a ' + Math.round(frac * 100) + '%)'); break }
      if (frac === 2) detail.push('(perdu même à 200%)')
    }
  }
  return { frac: found, detail }
}

function currentCap(w: World, frac: number): number {
  return w.level.waves[Math.min(w.waveIndex, w.level.waves.length - 1)].budget * frac
}

const only = process.argv.slice(2).filter((a) => /^\d+$/.test(a)).map(Number)
const levels = only.length > 0 ? LEVELS.filter((l) => only.includes(l.id)) : LEVELS

console.log('niv  3★ dès   détail par fraction du budget')
for (const L of levels) {
  const { frac, detail } = headroom(L.id)
  const verdict = frac === null ? '  —   ' : frac <= 0.4 ? ' 40% !' : ` ${Math.round(frac * 100)}%  `
  console.log(`L${L.id}  ${verdict}  ${detail.join('  ·  ')}`)
}
