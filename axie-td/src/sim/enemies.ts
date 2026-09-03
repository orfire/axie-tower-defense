import { damageAxie } from './combat'
import { center, dist } from './grid'
import { makeEnemy } from './spawn'
import { pickAxieTarget } from './targeting'
import { DT } from './types'
import type { World } from './world'

export function enemyActions(w: World): void {
  for (const e of w.enemies) {
    if (!e.alive) continue
    const from = w.board.posAt(e.d)

    // Mêlée : seulement contre le bloqueur qui l'arrête.
    if (e.blockedBy > 0) {
      const blocker = w.axies.find((a) => a.uid === e.blockedBy)
      if (blocker && !blocker.ko) {
        damageAxie(w, blocker, e.def.melee_dps * DT, e.cls)
        w.events.push({ k: 'enemyAttack', uid: e.uid, target: blocker.uid })
      }
    }

    // Tir : en marchant, sans s'arrêter.
    const ranged = e.def.ranged
    if (ranged) {
      e.shootCd -= DT
      if (e.shootCd <= 0) {
        const target = pickAxieTarget(w, e, ranged.range, ranged.hits_hill)
        if (target) {
          damageAxie(w, target, ranged.damage, e.cls)
          w.events.push({ k: 'enemyAttack', uid: e.uid, target: target.uid })
          e.shootCd += ranged.period
        } else {
          e.shootCd = 0
        }
      }
    }

    // Zone : le mage frappe tous les Axies de son rayon.
    const aoe = e.def.aoe
    if (aoe) {
      e.aoeCd -= DT
      if (e.aoeCd <= 0) {
        const hit = w.axies.filter(
          (a) => !a.ko && (a.kind !== 'hill' || aoe.hits_hill) && dist(from, center(a.cell)) <= aoe.radius,
        )
        if (hit.length > 0) {
          for (const a of hit) {
            damageAxie(w, a, aoe.damage, e.cls)
            w.events.push({ k: 'enemyAttack', uid: e.uid, target: a.uid })
          }
          e.aoeCd += aoe.period
        } else {
          e.aoeCd = 0
        }
      }
    }

    // Soin : continu, sur les alliés du rayon.
    const heal = e.def.heal
    if (heal) {
      for (const other of w.enemies) {
        if (!other.alive || other.uid === e.uid) continue
        if (heal.only && !heal.only.includes(other.type)) continue
        if (dist(from, w.board.posAt(other.d)) > heal.radius) continue
        other.hp = Math.min(other.maxHp, other.hp + heal.hps * DT)
      }
    }
  }
}

/** Applique les scissions puis retire les morts. À appeler en fin de tick. */
export function resolveDeaths(w: World): void {
  const spawned = []
  for (const e of w.enemies) {
    if (e.alive || !e.def.on_death_spawn) continue
    for (let i = 0; i < e.def.on_death_spawn.count; i++) {
      spawned.push(makeEnemy(w, e.def.on_death_spawn.enemy, e.d))
    }
    // `def` est une copie par instance, faite dans spawn.ts : effacer ici n'affecte
    // que ce mort, pas les autres chimères du même type.
    e.def.on_death_spawn = undefined
  }
  w.enemies = w.enemies.filter((e) => e.alive)
  w.enemies.push(...spawned)
}
