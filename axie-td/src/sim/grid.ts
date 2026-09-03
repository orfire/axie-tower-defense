import type { Cell, LevelDef } from '../data/types'

export type Vec = { x: number; y: number }
export type CellKind = 'path' | 'plain' | 'hill'

export function center(cell: Cell): Vec {
  return { x: cell[0] + 0.5, y: cell[1] + 0.5 }
}

export function dist(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function sameCell(a: Cell, b: Cell): boolean {
  return a[0] === b[0] && a[1] === b[1]
}

export function isOrthAdjacent(a: Cell, b: Cell): boolean {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1
}

export function orthNeighbors(cell: Cell, cols: number, rows: number): Cell[] {
  const out: Cell[] = []
  for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const c = cell[0] + dc
    const r = cell[1] + dr
    if (c >= 0 && c < cols && r >= 0 && r < rows) out.push([c, r])
  }
  return out
}

const key = (cell: Cell) => `${cell[0]},${cell[1]}`

/** Vue immuable d'un niveau : type de chaque case et géométrie du chemin. */
export class Board {
  readonly path: Cell[]
  readonly length: number
  private readonly pathIndex = new Map<string, number>()
  private readonly hills = new Set<string>()

  constructor(readonly level: LevelDef, readonly cols = 7, readonly rows = 10) {
    this.path = level.path
    this.length = level.path.length
    level.path.forEach((cell, i) => this.pathIndex.set(key(cell), i))
    for (const h of level.hills) this.hills.add(key(h))
  }

  /** `null` si la case est hors grille. */
  kindAt(cell: Cell): CellKind | null {
    const [c, r] = cell
    if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) return null
    const k = key(cell)
    if (this.pathIndex.has(k)) return 'path'
    if (this.hills.has(k)) return 'hill'
    return 'plain'
  }

  /** Index de la case sur le chemin, ou -1. */
  pathIndexOf(cell: Cell): number {
    return this.pathIndex.get(key(cell)) ?? -1
  }

  private clamp(d: number): number {
    return Math.min(Math.max(d, 0), this.length - 1)
  }

  /** Position continue à la progression `d`, bornée aux extrémités. */
  posAt(d: number): Vec {
    const c = this.clamp(d)
    const i = Math.min(Math.floor(c), this.length - 1)
    const t = c - i
    const a = center(this.path[i])
    if (t === 0 || i + 1 >= this.length) return a
    const b = center(this.path[i + 1])
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
  }

  /** Case occupée à la progression `d`. */
  cellAt(d: number): Cell {
    return this.path[Math.min(Math.floor(this.clamp(d)), this.length - 1)]
  }
}
