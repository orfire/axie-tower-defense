import { BALANCE } from '../data/load'
import type { ClassId } from '../data/types'
import type { AxieUnit, EnemyUnit } from './types'
import { isOrthAdjacent } from './grid'
import type { World } from './world'

export function triangleMult(attacker: ClassId, target: ClassId): number {
  const beats = BALANCE.triangle.beats
  if (beats[attacker]?.includes(target)) return BALANCE.triangle.advantage
  if (beats[target]?.includes(attacker)) return BALANCE.triangle.disadvantage
  return 1
}

/**
 * Armure de l'ennemi après l'aura Écailles des Reptiles voisins, puis Fragile.
 *
 * L'ordre est imposé par l'exemple chiffré du GDD §7.3 : un treant à 40 %,
 * voisin d'un Reptile et Fragile, tombe à 12,5 %. Écailles retire 15 points
 * bruts, Fragile divise ensuite par deux ce qu'il reste. L'ordre inverse
 * donnerait 5 %, soit un combo Reptile + Fragile bien plus fort que prévu.
 */
export function effectiveArmor(e: EnemyUnit, w: World): number {
  let armor = e.def.armor

  // Écailles d'abord : retrait de points d'armure bruts.
  const cell = w.board.cellAt(e.d)
  for (const a of w.axies) {
    if (a.ko || a.cls !== 'reptile' || a.kind === 'hill') continue
    if (isOrthAdjacent(a.cell, cell)) {
      armor += (BALANCE.auras.scales.value ?? -15) / 100
      break
    }
  }

  // Fragile ensuite : moitié de ce qu'il reste.
  if (e.statuses.some((s) => s.id === 'fragile')) {
    armor *= BALANCE.statuses.fragile.value ?? 0.5
  }

  return Math.min(1, Math.max(0, armor))
}

export type DamageOpts = {
  /** Classe de l'attaquant, pour le triangle. `null` pour un dégât sans classe. */
  from: ClassId | null
  ignoresArmor?: boolean
  kind?: 'normal' | 'crit' | 'poison' | 'bleed'
}

/** Applique des dégâts à un ennemi. Renvoie `true` s'il meurt de ce coup. */
export function damageEnemy(w: World, e: EnemyUnit, raw: number, opts: DamageOpts): boolean {
  if (!e.alive) return false
  let amount = raw
  if (opts.from) amount *= triangleMult(opts.from, e.cls)
  if (!opts.ignoresArmor) amount *= 1 - effectiveArmor(e, w)
  if (e.statuses.some((s) => s.id === 'wet')) {
    amount *= BALANCE.statuses.wet.value ?? 1.2
  }
  e.hp -= amount
  w.events.push({ k: 'damage', uid: e.uid, amount, kind: opts.kind ?? 'normal', at: w.board.posAt(e.d) })
  if (e.hp <= 0) {
    e.hp = 0
    e.alive = false
    w.events.push({ k: 'death', uid: e.uid, at: w.board.posAt(e.d) })
    return true
  }
  return false
}

/** Applique des dégâts à un Axie. Un Axie à 0 PV est KO, pas supprimé. */
export function damageAxie(w: World, a: AxieUnit, raw: number, from: ClassId | null): void {
  if (a.ko) return
  let amount = raw
  if (from) amount *= triangleMult(from, a.cls)
  a.hp -= amount
  if (a.hp <= 0) {
    a.hp = 0
    a.ko = true
    w.events.push({ k: 'ko', uid: a.uid })
  }
}
