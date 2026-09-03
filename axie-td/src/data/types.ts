export type ClassId = 'beast' | 'aquatic' | 'plant' | 'bird' | 'bug' | 'reptile'
export type Line = 'melee' | 'ranged'
export type Cell = readonly [number, number]
export type Tier = 'normal' | 'miniboss' | 'boss'
export type StatusId = 'wet' | 'roots' | 'feather' | 'poison' | 'bleed' | 'fragile'
export type AuraId = 'fury' | 'tide' | 'roots' | 'wind' | 'swarm' | 'scales'
export type ReactionId = 'ricochet' | 'rooting' | 'shatter' | 'burst'

export interface ClassDef {
  line: Line
  cost: number
  hp: number
  damage: number
  rate: number
  range: number
  attack_vfx: string
  on_hit_status: StatusId | null
  self_status: 'rage' | null
  aura: AuraId
  ignores_armor?: boolean
}

export interface EnemyDef {
  class: ClassId
  hp: number
  speed: number
  armor: number
  melee_dps: number
  tier: Tier
  ranged?: { range: number; period: number; damage: number; hits_hill: boolean }
  aoe?: { radius: number; period: number; damage: number; hits_hill: boolean }
  heal?: { radius: number; hps: number; only?: string[] }
  leader?: { radius: number; speed_mult: number; affects: string[] }
  enrage?: { hp_below: number; speed_mult: number; vfx: string }
  on_death_spawn?: { enemy: string; count: number }
  line_breaker?: boolean
}

export interface AuraDef {
  class: ClassId
  target: 'allies' | 'enemies'
  effect: string
  value?: number
  status?: StatusId
  hp_threshold?: number
}

export interface StatusDef {
  duration: number | null | 'wave'
  effect: string
  value?: number
  dps?: number
  ignores_armor?: boolean
  max_stacks?: number
  refresh_on_reapply?: boolean
  applied_when?: string
  gain_on?: string
  /** Atlas d'effet du kit, consommé par le rendu. */
  vfx?: string
  /** Icône de statut affichée sur l'ennemi. */
  icon?: string
  /** Commentaire de design, jamais lu par le code. */
  note?: string
}

export interface Balance {
  version: string
  /** Provenance : quelle version du GDD a produit ce fichier. */
  gdd: string
  sim: { tick_hz: number; no_randomness: boolean }
  grid: { cols: number; rows: number }
  level: {
    lives: number
    leak_damage: Record<Tier, number>
    stars_by_lives: Record<string, number>
  }
  /** Toujours `orthogonal` en v1 : les diagonales ne portent jamais d'aura. */
  adjacency: string
  triangle: { advantage: number; disadvantage: number; beats: Record<ClassId, ClassId[]> }
  targeting: { default: string; priority_status: StatusId }
  cells: {
    path: { allowed_lines: Line[]; blocks: boolean }
    plain: { allowed_lines: Line[] }
    hill: { allowed_lines: Line[]; range_penalty: number; auras: boolean; max_per_level: number; hit_only_by: string[] }
  }
  classes: Record<ClassId, ClassDef>
  auras: Record<AuraId, AuraDef> & { anti_stack: string }
  statuses: Record<StatusId | 'blocked' | 'rage', StatusDef>
  reactions: Record<ReactionId, Record<string, unknown>>
  parts_bonus: Record<ClassId, { hp?: number; damage?: number; rate?: number }>
  /** Règles de dérivation du profil depuis les parts. Utilisé par gen-data.mjs. */
  profile_rules: {
    min_dominant: number
    tie_margin: number
    labels: Record<string, string>
  }
  ko: { removed_until: string; returns: string }
  /** Règles de comportement des chimères, en toutes lettres. Documentation exécutable. */
  enemy_rules: Record<string, string | boolean>
  enemies: Record<string, EnemyDef>
}

export interface AxieDef {
  id: string
  name: string
  class: ClassId | 'dusk'
  spine: string
  parts: Record<'eyes' | 'ears' | 'mouth' | 'horn' | 'back' | 'tail', ClassId | 'dusk'>
  bonuses: { hp: number; damage: number; rate: number }
  profile: string | null
  unlock: { type: 'start' | 'stars' | 'v2'; stars?: number }
  /** Commentaire de design, jamais lu par le code. */
  note?: string
}

export interface SpawnDef { t: number; enemy: string }
export interface WaveDef { budget: number; spawns: SpawnDef[] }

export interface LevelDef {
  id: number
  name: string
  biome: string
  path: Cell[]
  hills: Cell[]
  entry: Cell
  exit: Cell
  draft: { forced: string[] | null }
  onboarding?: boolean
  waves: WaveDef[]
}
