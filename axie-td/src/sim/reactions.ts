import { BALANCE } from '../data/load'
import { damageEnemy } from './combat'
import { applyStatus } from './status'
import { enemiesInRadius } from './targeting'
import type { AxieUnit, EnemyUnit } from './types'
import type { World } from './world'

const R = BALANCE.reactions as unknown as {
  ricochet: { max_targets: number; radius: number; damage_mult: number }
  rooting: { value: number }
  shatter: { damage_mult: number }
  burst: { damage: number; radius: number }
}

/** Ricochet : l'Oiseau frappe une cible Trempée, le tir rebondit. */
export function ricochet(w: World, a: AxieUnit, target: EnemyUnit, baseDamage: number): void {
  const hit = enemiesInRadius(w, w.board.posAt(target.d), R.ricochet.radius, target.uid)
    .slice(0, R.ricochet.max_targets)
  if (hit.length === 0) return
  w.events.push({ k: 'reaction', id: 'ricochet', uid: target.uid, at: w.board.posAt(target.d) })
  for (const e of hit) {
    damageEnemy(w, e, baseDamage * R.ricochet.damage_mult, { from: a.cls })
    if (a.eff.tide) applyStatus(w, e, 'wet')
  }
}

/** Éclatement : la Bête achève une cible qui saigne. */
export function burst(w: World, target: EnemyUnit): void {
  w.events.push({ k: 'reaction', id: 'burst', uid: target.uid, at: w.board.posAt(target.d) })
  for (const e of enemiesInRadius(w, w.board.posAt(target.d), R.burst.radius, target.uid)) {
    damageEnemy(w, e, R.burst.damage, { from: null })
  }
}

export const ROOTING_MULT = R.rooting.value
export const SHATTER_MULT = R.shatter.damage_mult
