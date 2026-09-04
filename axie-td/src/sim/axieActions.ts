import { BALANCE } from '../data/load'
import { recomputeAuras } from './auras'
import { damageEnemy } from './combat'
import { ROOTING_MULT, SHATTER_MULT, burst, ricochet } from './reactions'
import { applyStatus, hasStatus } from './status'
import { pickTarget } from './targeting'
import { DT, type AxieUnit, type EnemyUnit } from './types'
import type { World } from './world'

const MAX_RAGE = BALANCE.statuses.rage.max_stacks ?? 5

/** Une attaque complète : dégâts, statuts posés, réactions déclenchées. */
export function axieAttack(w: World, a: AxieUnit, target: EnemyUnit): void {
  if (a.ko || !target.alive) return

  // On lit les statuts avant de frapper : plusieurs effets dépendent de l'état d'avant.
  const wasWet = hasStatus(target, 'wet')
  const wasRooted = hasStatus(target, 'roots')
  const wasFragile = hasStatus(target, 'fragile')
  const wasBleeding = hasStatus(target, 'bleed')
  const wasPoisoned = hasStatus(target, 'poison')

  let damage = a.eff.damage

  // Fureur : +30 % contre une cible sous la moitié de ses PV.
  if (a.eff.fury > 1 && target.hp <= target.maxHp * (BALANCE.auras.fury.hp_threshold ?? 0.5)) {
    damage *= a.eff.fury
  }

  // Brisure : la Bête sur une cible Fragile fait un critique garanti.
  const crit = a.cls === 'beast' && wasFragile
  if (crit) {
    damage *= SHATTER_MULT
    w.events.push({ k: 'reaction', id: 'shatter', uid: target.uid, at: w.board.posAt(target.d) })
  }

  const cls = BALANCE.classes[a.cls]
  w.events.push({ k: 'attack', from: a.uid, to: target.uid, cls: a.cls, at: w.board.posAt(target.d) })

  const died = damageEnemy(w, target, damage, {
    from: a.cls,
    ignoresArmor: cls.ignores_armor === true,
    kind: crit ? 'crit' : 'normal',
  })

  // Enracinement : l'Insecte sur une cible ralentie double la durée de ses DoT.
  const durationMult = a.cls === 'bug' && wasRooted ? ROOTING_MULT : 1
  if (a.cls === 'bug' && wasRooted) {
    w.events.push({ k: 'reaction', id: 'rooting', uid: target.uid, at: w.board.posAt(target.d) })
  }

  if (!died && cls.on_hit_status) {
    applyStatus(w, target, cls.on_hit_status, { tickMult: a.eff.swarm, durationMult })
    // Saignement seulement si la cible était DÉJÀ empoisonnée avant ce coup (GDD §6.1).
    // Le premier coup d'Insecte empoisonne, les suivants ajoutent le saignement :
    // 4 dégâts par seconde puis 10, et non 10 d'emblée.
    if (a.cls === 'bug' && wasPoisoned) {
      applyStatus(w, target, 'bleed', { tickMult: a.eff.swarm, durationMult })
    }
  }
  // Marée : un voisin Aquatique trempe les cibles touchées.
  if (!died && a.eff.tide) applyStatus(w, target, 'wet')

  // Ricochet : l'Oiseau sur une cible qui était Trempée.
  if (a.cls === 'bird' && wasWet) ricochet(w, a, target, damage)

  if (died) {
    if (a.cls === 'beast' && wasBleeding) burst(w, target)
    if (a.cls === 'beast' && a.rageStacks < MAX_RAGE) {
      a.rageStacks++
      recomputeAuras(w)
    }
  }
}

/** Fait tourner les cooldowns et déclenche les attaques dues. */
export function axieActions(w: World): void {
  for (const a of w.axies) {
    if (a.ko) continue
    a.cooldown -= DT
    if (a.cooldown > 0) continue
    const target = pickTarget(w, a)
    if (!target) { a.cooldown = 0; continue }
    axieAttack(w, a, target)
    a.cooldown += 1 / a.eff.rate
  }
}
