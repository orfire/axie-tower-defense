import type { Cell, ClassId, EnemyDef, Line, StatusId, Tier } from '../data/types'
import type { CellKind } from './grid'

export const DT = 1 / 30

export type StatusInstance = {
  id: StatusId
  /** Secondes restantes. `Infinity` pour un statut recalculé chaque tick (Racines). */
  remaining: number
  /** Multiplicateur de cadence de tick, 2 sous l'aura Essaim. */
  tickMult: number
  /** Dégâts par seconde, pour Poison et Saignement. */
  dps: number
}

export type EffectiveStats = {
  damage: number
  rate: number
  range: number
  /** 1.3 si un voisin Bête donne Fureur, 1 sinon. */
  fury: number
  /** vrai si un voisin Aquatique donne Marée. */
  tide: boolean
  /** 2 si un voisin Insecte donne Essaim, 1 sinon. */
  swarm: number
}

export type AxieUnit = {
  uid: number
  axieId: string
  cls: ClassId
  line: Line
  cell: Cell
  kind: CellKind
  /** Index sur le chemin si l'Axie bloque, -1 sinon. */
  pathIndex: number
  cost: number
  maxHp: number
  hp: number
  baseDamage: number
  baseRate: number
  baseRange: number
  cooldown: number
  rageStacks: number
  ko: boolean
  eff: EffectiveStats
}

export type EnemyUnit = {
  uid: number
  type: string
  def: EnemyDef
  cls: ClassId
  tier: Tier
  maxHp: number
  hp: number
  /** Progression le long du chemin, en cases. */
  d: number
  statuses: StatusInstance[]
  shootCd: number
  aoeCd: number
  enraged: boolean
  /** uid de l'Axie qui le bloque, -1 sinon. */
  blockedBy: number
  alive: boolean
}

export type SimEvent =
  | { k: 'attack'; from: number; to: number; cls: ClassId }
  | { k: 'damage'; uid: number; amount: number; kind: 'normal' | 'crit' | 'poison' | 'bleed' }
  | { k: 'status'; uid: number; id: StatusId }
  | { k: 'reaction'; id: 'ricochet' | 'rooting' | 'shatter' | 'burst'; uid: number }
  | { k: 'enemyAttack'; uid: number; target: number }
  | { k: 'death'; uid: number }
  | { k: 'ko'; uid: number }
  | { k: 'leak'; uid: number; damage: number }
  | { k: 'waveEnd' }
  | { k: 'levelEnd'; stars: number }

export type Phase = 'placement' | 'wave' | 'won' | 'lost'
