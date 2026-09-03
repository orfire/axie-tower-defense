import { center, dist } from './grid'
import type { AxieUnit, EnemyUnit } from './types'
import type { World } from './world'

function hasFeather(e: EnemyUnit): boolean {
  return e.statuses.some((s) => s.id === 'feather')
}

/** Cible d'un Axie : marquée par Plume d'abord, puis la plus avancée, puis le plus petit uid. */
export function pickTarget(w: World, a: AxieUnit): EnemyUnit | null {
  if (a.ko) return null
  const from = center(a.cell)
  let best: EnemyUnit | null = null
  for (const e of w.enemies) {
    if (!e.alive) continue
    if (dist(from, w.board.posAt(e.d)) > a.eff.range) continue
    if (best === null) { best = e; continue }
    const fe = hasFeather(e)
    const fb = hasFeather(best)
    if (fe !== fb) { if (fe) best = e; continue }
    if (e.d !== best.d) { if (e.d > best.d) best = e; continue }
    if (e.uid < best.uid) best = e
  }
  return best
}

/** Cible d'un ennemi à distance : l'Axie le plus proche à portée, puis le plus petit uid. */
export function pickAxieTarget(w: World, e: EnemyUnit, range: number, hitsHill: boolean): AxieUnit | null {
  const from = w.board.posAt(e.d)
  let best: AxieUnit | null = null
  let bestD = Infinity
  for (const a of w.axies) {
    if (a.ko) continue
    if (a.kind === 'hill' && !hitsHill) continue
    const d = dist(from, center(a.cell))
    if (d > range) continue
    if (d < bestD || (d === bestD && best !== null && a.uid < best.uid)) {
      best = a
      bestD = d
    }
  }
  return best
}

/** Ennemis vivants dans un rayon autour d'un point, hors `exceptUid`. */
export function enemiesInRadius(w: World, at: { x: number; y: number }, radius: number, exceptUid = -1): EnemyUnit[] {
  return w.enemies
    .filter((e) => e.alive && e.uid !== exceptUid && dist(at, w.board.posAt(e.d)) <= radius)
    .sort((a, b) => b.d - a.d || a.uid - b.uid)
}
