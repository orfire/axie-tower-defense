import { BALANCE } from '../data/load'
import type { StatusId } from '../data/types'
import { damageEnemy } from './combat'
import { isOrthAdjacent } from './grid'
import { DT, type EnemyUnit } from './types'
import type { World } from './world'

export function hasStatus(e: EnemyUnit, id: StatusId): boolean {
  return e.statuses.some((s) => s.id === id)
}

export type ApplyOpts = {
  /** 2 sous l'aura Essaim. Figé au moment de l'application. */
  tickMult?: number
  /** 2 sous la réaction Enracinement. */
  durationMult?: number
}

/**
 * Pose un statut ou rafraîchit sa durée. Saignement exige une cible déjà empoisonnée.
 * Racines n'est jamais posé par ici : il est recalculé par `refreshRoots`.
 */
export function applyStatus(w: World, e: EnemyUnit, id: StatusId, opts: ApplyOpts = {}): void {
  if (!e.alive) return
  if (id === 'bleed' && !hasStatus(e, 'poison')) return
  if (id === 'roots') return

  const def = BALANCE.statuses[id]
  const base = typeof def.duration === 'number' ? def.duration : 0
  const remaining = base * (opts.durationMult ?? 1)
  const tickMult = opts.tickMult ?? 1

  const existing = e.statuses.find((s) => s.id === id)
  if (existing) {
    existing.remaining = Math.max(existing.remaining, remaining)
    existing.tickMult = Math.max(existing.tickMult, tickMult)
  } else {
    e.statuses.push({ id, remaining, tickMult, dps: def.dps ?? 0 })
  }
  w.events.push({ k: 'status', uid: e.uid, id })
}

/**
 * Racines dépend de la position : recalculé à chaque tick.
 * Un Axie Plante sur une colline ne donne aucune aura (GDD §4).
 */
export function refreshRoots(w: World): void {
  const plants = w.axies.filter((a) => !a.ko && a.cls === 'plant' && a.kind !== 'hill')
  for (const e of w.enemies) {
    if (!e.alive) continue
    const cell = w.board.cellAt(e.d)
    const rooted = plants.some((a) => isOrthAdjacent(a.cell, cell))
    const idx = e.statuses.findIndex((s) => s.id === 'roots')
    if (rooted && idx < 0) {
      e.statuses.push({ id: 'roots', remaining: Infinity, tickMult: 1, dps: 0 })
      w.events.push({ k: 'status', uid: e.uid, id: 'roots' })
    } else if (!rooted && idx >= 0) {
      e.statuses.splice(idx, 1)
    }
  }
}

/** Applique les DoT et fait expirer les statuts à durée finie. */
export function tickStatuses(w: World): void {
  for (const e of w.enemies) {
    if (!e.alive) continue
    for (const s of [...e.statuses]) {
      if (s.dps > 0) {
        damageEnemy(w, e, s.dps * s.tickMult * DT, {
          from: null,
          ignoresArmor: true,
          kind: s.id === 'poison' ? 'poison' : 'bleed',
        })
        if (!e.alive) break
      }
      if (Number.isFinite(s.remaining)) {
        s.remaining -= DT
        if (s.remaining <= 0) {
          const i = e.statuses.indexOf(s)
          if (i >= 0) e.statuses.splice(i, 1)
        }
      }
    }
  }
}
