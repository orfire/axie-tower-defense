import type { Cell } from '../data/types'
import { COLS, ROWS, unitToPx, type Layout } from '../render/layout'
import { canPlace } from '../sim/placement'
import type { World } from '../sim/world'

/** Rayon d'aimantation, en multiples de la taille de case. */
const SNAP_RADIUS = 2.2

/**
 * Case valide la plus proche du doigt. L'aimantation évite d'exiger de la précision
 * sur des cases de 43 px (GDD §11.3). Renvoie `null` si rien de valide n'est assez proche.
 */
export function nearestValidCell(
  w: World,
  axieId: string,
  px: number,
  py: number,
  layout: Layout,
  movingUid = -1,
): Cell | null {
  let best: Cell | null = null
  let bestD = (SNAP_RADIUS * layout.cell) ** 2

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const cell: Cell = [col, row]
      if (!canPlace(w, axieId, cell, movingUid).ok) continue
      const c = unitToPx(layout, col + 0.5, row + 0.5)
      const d = (c.x - px) ** 2 + (c.y - py) ** 2
      if (d < bestD) { bestD = d; best = cell }
    }
  }
  return best
}

export type DragState =
  | { kind: 'none' }
  | { kind: 'fromTray'; axieId: string; px: number; py: number; cell: Cell | null }
  | { kind: 'fromBoard'; uid: number; axieId: string; px: number; py: number; cell: Cell | null }

export type DragEvents = {
  getWorld: () => World
  getLayout: () => Layout
  /** Case sous le doigt au début du geste, pour attraper un Axie déjà posé. */
  axieAt: (cell: Cell) => number | null
  onDrop: (state: DragState) => void
  onUpdate: (state: DragState) => void
}

/** Gestion du glisser-déposer au doigt et à la souris, un seul point de contact. */
export class DragDrop {
  state: DragState = { kind: 'none' }

  constructor(private readonly ev: DragEvents) {}

  attach(el: HTMLElement): void {
    el.addEventListener('pointerdown', this.down)
    window.addEventListener('pointermove', this.move)
    window.addEventListener('pointerup', this.up)
    window.addEventListener('pointercancel', this.cancel)
  }

  detach(el: HTMLElement): void {
    el.removeEventListener('pointerdown', this.down)
    window.removeEventListener('pointermove', this.move)
    window.removeEventListener('pointerup', this.up)
    window.removeEventListener('pointercancel', this.cancel)
  }

  /** Démarre un glissement depuis le bac. Appelé par `Tray`. */
  startFromTray(axieId: string, px: number, py: number): void {
    this.state = { kind: 'fromTray', axieId, px, py, cell: null }
    this.recompute()
  }

  private down = (e: PointerEvent) => {
    if (this.state.kind !== 'none') return
    const layout = this.ev.getLayout()
    const col = Math.floor((e.clientX - layout.boardX) / layout.cell)
    const row = Math.floor((e.clientY - layout.boardY) / layout.cell)
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return
    const uid = this.ev.axieAt([col, row])
    if (uid === null) return
    const w = this.ev.getWorld()
    const a = w.axies.find((x) => x.uid === uid)
    if (!a) return
    this.state = { kind: 'fromBoard', uid, axieId: a.axieId, px: e.clientX, py: e.clientY, cell: a.cell }
    this.recompute()
  }

  private move = (e: PointerEvent) => {
    if (this.state.kind === 'none') return
    this.state.px = e.clientX
    this.state.py = e.clientY
    this.recompute()
  }

  private up = () => {
    if (this.state.kind === 'none') return
    this.ev.onDrop(this.state)
    this.state = { kind: 'none' }
    this.ev.onUpdate(this.state)
  }

  private cancel = () => {
    this.state = { kind: 'none' }
    this.ev.onUpdate(this.state)
  }

  private recompute(): void {
    if (this.state.kind === 'none') return
    const movingUid = this.state.kind === 'fromBoard' ? this.state.uid : -1
    this.state.cell = nearestValidCell(
      this.ev.getWorld(), this.state.axieId, this.state.px, this.state.py,
      this.ev.getLayout(), movingUid,
    )
    this.ev.onUpdate(this.state)
  }
}
