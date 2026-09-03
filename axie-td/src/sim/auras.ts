import { BALANCE } from '../data/load'
import type { ClassId } from '../data/types'
import { isOrthAdjacent } from './grid'
import type { AxieUnit } from './types'
import type { World } from './world'

/**
 * Voisins qui donnent effectivement une aura : un seul par classe.
 * Un Axie sur colline ne reçoit rien et ne donne rien.
 *
 * Le GDD §5.3 parle de retenir « la plus forte » des auras d'une même classe.
 * En v1 cette formulation n'a pas d'effet : la valeur d'une aura est fixée par la
 * classe, pas par l'Axie qui la porte, donc deux voisins de même classe donnent
 * exactement le même bonus. Le départage sert uniquement au déterminisme, et il se
 * fait sur le plus petit uid. Le jour où une aura variera selon le porteur, c'est
 * ici qu'il faudra comparer la statistique concernée.
 */
export function auraSources(w: World, a: AxieUnit): AxieUnit[] {
  if (a.ko || a.kind === 'hill') return []
  const best = new Map<ClassId, AxieUnit>()
  for (const other of w.axies) {
    if (other.uid === a.uid || other.ko || other.kind === 'hill') continue
    if (!isOrthAdjacent(a.cell, other.cell)) continue
    const cur = best.get(other.cls)
    if (!cur || other.uid < cur.uid) best.set(other.cls, other)
  }
  return [...best.values()].sort((x, y) => x.uid - y.uid)
}

/** Recalcule `eff` de chaque Axie. À appeler après toute pose, retrait, KO ou gain de Rage. */
export function recomputeAuras(w: World): void {
  for (const a of w.axies) {
    const eff = {
      damage: a.baseDamage,
      rate: a.baseRate,
      range: a.baseRange,
      fury: 1,
      tide: false,
      swarm: 1,
    }

    // La colline coûte une case de portée, quoi qu'il arrive (GDD §4).
    if (a.kind === 'hill') eff.range -= BALANCE.cells.hill.range_penalty

    for (const src of auraSources(w, a)) {
      switch (src.cls) {
        case 'bird': eff.range += BALANCE.auras.wind.value ?? 1; break
        case 'beast': eff.fury = BALANCE.auras.fury.value ?? 1.3; break
        case 'aquatic': eff.tide = true; break
        case 'bug': eff.swarm = BALANCE.auras.swarm.value ?? 2; break
        case 'plant':
        case 'reptile':
          // Racines et Écailles visent les ennemis : traitées dans refreshRoots
          // et effectiveArmor, jamais ici.
          break
        default: {
          // Une septième classe ajoutée sans aura échouerait à la compilation
          // plutôt que de ne rien faire en silence.
          const unhandled: never = src.cls
          throw new Error(`Classe sans aura déclarée : ${String(unhandled)}`)
        }
      }
    }

    // La Rage de l'Axie Bête s'ajoute à sa propre cadence.
    if (a.cls === 'beast' && a.rageStacks > 0) {
      eff.rate *= Math.pow(BALANCE.statuses.rage.value ?? 1.1, a.rageStacks)
    }

    eff.range = Math.max(0.5, eff.range)
    a.eff = eff
  }
}
