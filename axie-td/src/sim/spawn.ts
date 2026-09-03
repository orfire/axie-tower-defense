import { BALANCE } from '../data/load'
import type { EnemyUnit } from './types'
import type { World } from './world'

export function makeEnemy(w: World, type: string, d = 0): EnemyUnit {
  const def = BALANCE.enemies[type]
  if (!def) throw new Error(`Chimère inconnue : ${type}`)
  return {
    uid: w.nextUid++,
    type,
    def: { ...def },
    cls: def.class,
    tier: def.tier,
    maxHp: def.hp,
    hp: def.hp,
    d,
    statuses: [],
    shootCd: def.ranged ? def.ranged.period : 0,
    aoeCd: def.aoe ? def.aoe.period : 0,
    enraged: false,
    blockedBy: -1,
    alive: true,
  }
}

/** Sort les ennemis dont l'heure d'apparition est passée. */
export function spawnDue(w: World): void {
  while (w.pending.length > 0 && w.pending[0].t <= w.t) {
    const spawn = w.pending.shift()!
    w.enemies.push(makeEnemy(w, spawn.enemy))
  }
}
