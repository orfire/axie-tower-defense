import { BALANCE, axieDef } from '../data/load'
import type { ClassId } from '../data/types'
import { isOrthAdjacent } from './grid'
import type { AxieUnit } from './types'
import type { World } from './world'

/** Force d'un Axie comme source d'aura : somme de ses bonus de parts. */
function auraStrength(a: AxieUnit): number {
  const b = axieDef(a.axieId).bonuses
  return b.hp + b.damage + b.rate
}

/**
 * Voisins qui donnent effectivement une aura : un seul par classe, le plus fort.
 * Un Axie sur colline ne reçoit rien et ne donne rien.
 */
export function auraSources(w: World, a: AxieUnit): AxieUnit[] {
  if (a.ko || a.kind === 'hill') return []
  const best = new Map<ClassId, AxieUnit>()
  for (const other of w.axies) {
    if (other.uid === a.uid || other.ko || other.kind === 'hill') continue
    if (!isOrthAdjacent(a.cell, other.cell)) continue
    const cur = best.get(other.cls)
    if (!cur) { best.set(other.cls, other); continue }
    const sc = auraStrength(cur)
    const so = auraStrength(other)
    if (so > sc || (so === sc && other.uid < cur.uid)) best.set(other.cls, other)
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
        // Plante (Racines) et Reptile (Écailles) visent les ennemis :
        // traitées dans refreshRoots et effectiveArmor.
        default: break
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
