import { BALANCE, axieDef } from '../../src/data/load'
import type { Cell, ClassId } from '../../src/data/types'
import type { AxieUnit } from '../../src/sim/types'
import type { World } from '../../src/sim/world'

/**
 * Pose un Axie sans passer par les règles de budget, pour isoler ce qu'un test mesure.
 * Les tests de budget et de validité de case sont dans tests/sim/placement.test.ts.
 */
export function placeTestAxie(w: World, axieId: string, cell: Cell): AxieUnit {
  const def = axieDef(axieId)
  const cls = def.class as ClassId
  const c = BALANCE.classes[cls]
  const unit: AxieUnit = {
    uid: w.nextUid++,
    axieId,
    cls,
    line: c.line,
    cell,
    kind: w.board.kindAt(cell) ?? 'plain',
    pathIndex: w.board.pathIndexOf(cell),
    cost: c.cost,
    maxHp: Math.round(c.hp * (1 + def.bonuses.hp)),
    hp: Math.round(c.hp * (1 + def.bonuses.hp)),
    baseDamage: c.damage * (1 + def.bonuses.damage),
    baseRate: c.rate * (1 + def.bonuses.rate),
    baseRange: c.range,
    cooldown: 0,
    rageStacks: 0,
    ko: false,
    eff: { damage: 0, rate: 0, range: 0, fury: 1, tide: false, swarm: 1 },
  }
  unit.eff = {
    damage: unit.baseDamage,
    rate: unit.baseRate,
    range: unit.baseRange,
    fury: 1,
    tide: false,
    swarm: 1,
  }
  w.axies.push(unit)
  return unit
}
