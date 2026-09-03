import { BALANCE } from '../data/load'
import { center, dist, isOrthAdjacent } from './grid'
import { DT, type EnemyUnit } from './types'
import type { World } from './world'

/** Vitesse de l'ennemi après meneur, Racines et enrage. */
export function effectiveSpeed(w: World, e: EnemyUnit): number {
  let speed = e.def.speed

  // Meneur : un allié voisin accélère les types qu'il commande.
  for (const other of w.enemies) {
    if (!other.alive || other.uid === e.uid || !other.def.leader) continue
    if (!other.def.leader.affects.includes(e.type)) continue
    if (dist(w.board.posAt(other.d), w.board.posAt(e.d)) <= other.def.leader.radius) {
      speed *= other.def.leader.speed_mult
      break
    }
  }

  if (e.enraged && e.def.enrage) speed *= e.def.enrage.speed_mult

  // Racines : un Axie Plante voisin de la case occupée ralentit.
  const cell = w.board.cellAt(e.d)
  for (const a of w.axies) {
    if (a.ko || a.cls !== 'plant' || a.kind === 'hill') continue
    if (isOrthAdjacent(a.cell, cell)) {
      speed *= BALANCE.auras.roots.value!
      break
    }
  }

  return speed
}

/**
 * Progression maximale autorisée par les bloqueurs.
 * Le premier de la file s'arrête sur la case précédant le bloqueur, le suivant une case
 * plus tôt, et ainsi de suite. Ordre déterministe : par progression décroissante.
 */
export function blockLimits(w: World): Map<number, number> {
  const blockers = w.axies
    .filter((a) => !a.ko && a.pathIndex >= 0)
    .map((a) => a.pathIndex)
    .sort((a, b) => a - b)

  const limits = new Map<number, number>()
  if (blockers.length === 0) return limits

  const queued = new Map<number, number>()
  const ordered = [...w.enemies].filter((e) => e.alive).sort((a, b) => b.d - a.d || a.uid - b.uid)

  for (const e of ordered) {
    const k = blockers.find((idx) => idx > e.d)
    if (k === undefined) continue
    const slot = queued.get(k) ?? 0
    queued.set(k, slot + 1)
    limits.set(e.uid, Math.max(0, k - 1 - slot))
  }
  return limits
}

export function moveEnemies(w: World): void {
  const limits = blockLimits(w)
  const blockerAt = new Map<number, number>()
  for (const a of w.axies) if (!a.ko && a.pathIndex >= 0) blockerAt.set(a.pathIndex, a.uid)

  for (const e of w.enemies) {
    if (!e.alive) continue

    if (e.def.enrage && !e.enraged && e.hp <= e.maxHp * e.def.enrage.hp_below) {
      e.enraged = true
    }

    const limit = limits.get(e.uid)
    const target = e.d + effectiveSpeed(w, e) * DT
    e.d = limit === undefined ? target : Math.min(target, limit)

    // Bloqué si arrivé à sa limite et juste devant un bloqueur.
    if (limit !== undefined && e.d >= limit - 1e-9) {
      const uid = blockerAt.get(Math.round(limit) + 1)
      e.blockedBy = uid ?? -1
    } else {
      e.blockedBy = -1
    }

    if (e.d >= w.board.length - 1) {
      e.alive = false
      const damage = BALANCE.level.leak_damage[e.tier]
      w.lives -= damage
      w.events.push({ k: 'leak', uid: e.uid, damage })
    }
  }
}

/** Position visuelle d'un ennemi, en unités de case. */
export function enemyPos(w: World, e: EnemyUnit) {
  return w.board.posAt(e.d)
}

/** Position d'un Axie, en unités de case. */
export function axiePos(a: { cell: readonly [number, number] }) {
  return center(a.cell)
}
