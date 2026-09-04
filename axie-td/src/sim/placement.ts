import { BALANCE, axieDef } from '../data/load'
import type { Cell, ClassId, Line } from '../data/types'
import { recomputeAuras } from './auras'
import { sameCell, type CellKind } from './grid'
import type { AxieUnit } from './types'
import { currentBudget, type World } from './world'

export function spentEnergy(w: World): number {
  return w.axies.reduce((sum, a) => sum + a.cost, 0)
}

export type PlaceCheck = { ok: true } | { ok: false; reason: string }

/**
 * Vrai si une case de ce type accepte cette ligne, sans rien savoir de l'énergie
 * ni de l'occupation.
 *
 * Extrait de `canPlace` pour que le rendu puisse distinguer les deux refus : une
 * case barrée pendant un glissement dit « pas ce type d'Axie ici », pas « plus
 * d'énergie », sans quoi tout le plateau se barre dès que le budget est épuisé.
 * Le rendu lisait auparavant le libellé français du refus, qu'une reformulation
 * aurait cassé en silence.
 */
export function kindAllowsLine(kind: CellKind, line: Line): boolean {
  return BALANCE.cells[kind].allowed_lines.includes(line)
}

/** `movingUid` >= 0 quand on déplace un Axie déjà posé : sa case et son coût sont ignorés. */
export function canPlace(w: World, axieId: string, cell: Cell, movingUid = -1): PlaceCheck {
  if (w.phase !== 'placement') return { ok: false, reason: 'La vague est en cours' }

  const def = axieDef(axieId)
  if (def.class === 'dusk') return { ok: false, reason: 'Cet Axie arrive plus tard' }
  const cls = def.class as ClassId
  const line = BALANCE.classes[cls].line

  const kind = w.board.kindAt(cell)
  if (kind === null) return { ok: false, reason: 'Hors du plateau' }
  if (!kindAllowsLine(kind, line)) {
    return {
      ok: false,
      reason: kind === 'path'
        ? 'Seules les classes de mêlée bloquent sur le chemin'
        : 'Seules les classes à distance tiennent une colline',
    }
  }

  const occupied = w.axies.some((a) => a.uid !== movingUid && sameCell(a.cell, cell))
  if (occupied) return { ok: false, reason: 'Case déjà occupée' }

  if (movingUid < 0 && spentEnergy(w) + BALANCE.classes[cls].cost > currentBudget(w)) {
    return { ok: false, reason: "Pas assez d'énergie" }
  }

  return { ok: true }
}

export function place(w: World, axieId: string, cell: Cell): AxieUnit | null {
  if (!canPlace(w, axieId, cell).ok) return null
  const def = axieDef(axieId)
  const cls = def.class as ClassId
  const c = BALANCE.classes[cls]
  const maxHp = Math.round(c.hp * (1 + def.bonuses.hp))

  const unit: AxieUnit = {
    uid: w.nextUid++,
    axieId,
    cls,
    line: c.line,
    cell,
    kind: w.board.kindAt(cell)!,
    pathIndex: w.board.pathIndexOf(cell),
    cost: c.cost,
    maxHp,
    hp: maxHp,
    baseDamage: c.damage * (1 + def.bonuses.damage),
    baseRate: c.rate * (1 + def.bonuses.rate),
    baseRange: c.range,
    cooldown: 0,
    rageStacks: 0,
    ko: false,
    eff: { damage: 0, rate: 0, range: 0, fury: 1, tide: false, swarm: 1 },
  }
  w.axies.push(unit)
  recomputeAuras(w)
  return unit
}

export function move(w: World, uid: number, cell: Cell): boolean {
  const a = w.axies.find((x) => x.uid === uid)
  if (!a || !canPlace(w, a.axieId, cell, uid).ok) return false
  a.cell = cell
  a.kind = w.board.kindAt(cell)!
  a.pathIndex = w.board.pathIndexOf(cell)
  recomputeAuras(w)
  return true
}

export function remove(w: World, uid: number): boolean {
  if (w.phase !== 'placement') return false
  const i = w.axies.findIndex((a) => a.uid === uid)
  if (i < 0) return false
  w.axies.splice(i, 1)
  recomputeAuras(w)
  return true
}

/**
 * Renvoie au bac les Axies qui ne rentrent plus dans le budget.
 * Les budgets sont croissants par design, donc ce cas ne devrait jamais arriver :
 * c'est un garde-fou contre une erreur de données.
 */
export function trimToBudget(w: World): void {
  while (spentEnergy(w) > currentBudget(w) && w.axies.length > 0) w.axies.pop()
  recomputeAuras(w)
}
