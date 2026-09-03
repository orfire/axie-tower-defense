import { BALANCE, levelDef } from '../data/load'
import type { LevelDef, SpawnDef } from '../data/types'
import { Board } from './grid'
import type { AxieUnit, EnemyUnit, Phase, SimEvent } from './types'

export type World = {
  level: LevelDef
  board: Board
  /** Temps écoulé dans la vague en cours, en secondes. */
  t: number
  waveIndex: number
  lives: number
  axies: AxieUnit[]
  enemies: EnemyUnit[]
  /** Spawns de la vague en cours pas encore sortis, triés par temps croissant. */
  pending: SpawnDef[]
  /** Vidé par le rendu à chaque frame. */
  events: SimEvent[]
  nextUid: number
  phase: Phase
}

export function createWorld(levelId: number): World {
  const level = levelDef(levelId)
  return {
    level,
    board: new Board(level, BALANCE.grid.cols, BALANCE.grid.rows),
    t: 0,
    waveIndex: 0,
    lives: BALANCE.level.lives,
    axies: [],
    enemies: [],
    pending: [],
    events: [],
    nextUid: 1,
    phase: 'placement',
  }
}

/** Budget d'énergie de la vague à venir. */
export function currentBudget(w: World): number {
  return w.level.waves[Math.min(w.waveIndex, w.level.waves.length - 1)].budget
}

/** Passe de la phase de placement à la vague. Appelé par le bouton « Lancer ». */
export function startWave(w: World): void {
  if (w.phase !== 'placement') return
  const wave = w.level.waves[w.waveIndex]
  w.t = 0
  w.pending = [...wave.spawns].sort((a, b) => a.t - b.t)
  w.enemies = []
  w.phase = 'wave'
  for (const a of w.axies) {
    a.hp = a.maxHp
    a.ko = false
    a.cooldown = 0
    a.rageStacks = 0
  }
}
