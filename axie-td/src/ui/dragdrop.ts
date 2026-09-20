import type { Cell } from '../data/types'
import { COLS, ROWS, unitToPx, type Layout } from '../render/layout'
import { canPlace } from '../sim/placement'
import type { World } from '../sim/world'

/** Rayon d'aimantation, en multiples de la taille de case. */
const SNAP_RADIUS = 2.2

/**
 * Tolérance d'un tap, en pixels CSS. Un doigt ne se pose jamais parfaitement
 * immobile : sous ce seuil le geste est lu comme un tap, au-delà comme un
 * glissement. 10 px est la valeur usuelle du tactile, plus serré on perd des
 * taps légitimes, plus large on ouvre une fiche au début d'un vrai déplacement.
 */
const TAP_SLOP = 10

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
  /**
   * Tap : appui et relâchement au même endroit, sans déplacement. Ouvre la
   * fiche de l'Axie, qu'il soit posé sur le plateau ou encore dans le bac.
   * `uid` vaut -1 quand il vient du bac, où l'Axie n'existe pas encore.
   */
  onTap: (uid: number, axieId: string) => void
}

/**
 * Glisser-déposer au doigt et à la souris, un seul point de contact.
 *
 * Le pointeur qui a commencé le geste est mémorisé et lui seul est écouté :
 * sans ça, un second doigt posé n'importe où pendant un glissement déplace ou
 * termine celui en cours. Sur mobile c'est la paume qui effleure l'écran.
 */
export class DragDrop {
  state: DragState = { kind: 'none' }
  /** Identifiant du pointeur qui mène le geste, -1 hors glissement. */
  private pointerId = -1
  private captured?: HTMLElement
  /** Point d'appui, pour distinguer un tap d'un glissement au relâchement. */
  private startX = 0
  private startY = 0

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
  startFromTray(axieId: string, px: number, py: number, e?: PointerEvent): void {
    if (this.state.kind !== 'none') return // un geste est déjà en cours
    this.claim(e)
    this.startX = px
    this.startY = py
    this.state = { kind: 'fromTray', axieId, px, py, cell: null }
    this.recompute()
  }

  /** Retient le pointeur menant et lui demande la capture, quand elle est possible. */
  private claim(e?: PointerEvent): void {
    if (!e) return
    this.pointerId = e.pointerId
    const el = e.currentTarget instanceof HTMLElement ? e.currentTarget : null
    // La capture garantit de recevoir le relâchement même si le doigt sort de la
    // page. Sans elle, un geste interrompu hors fenêtre laisse l'état bloqué.
    try {
      el?.setPointerCapture(e.pointerId)
      this.captured = el ?? undefined
    } catch { /* capture indisponible, le suivi par identifiant suffit */ }
  }

  private release(): void {
    try { if (this.pointerId >= 0) this.captured?.releasePointerCapture(this.pointerId) } catch { /* ignoré */ }
    this.captured = undefined
    this.pointerId = -1
  }

  /** Vrai si l'événement vient d'un autre doigt que celui qui mène le geste. */
  private foreign(e: PointerEvent): boolean {
    return this.pointerId >= 0 && e.pointerId !== this.pointerId
  }

  /**
   * Abandonne le geste en cours sans rien déposer. Sans lui, ouvrir une fiche
   * laisserait une session de glissement ouverte derrière elle, et le
   * relâchement déposerait l'Axie à la position figée du départ.
   */
  abort(): void {
    if (this.state.kind === 'none') return
    this.release()
    this.state = { kind: 'none' }
    this.ev.onUpdate(this.state)
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
    // Pendant une vague rien ne se déplace : le geste ne peut être qu'un tap.
    // Ouvrir tout de suite évite d'ouvrir une session de glissement qui
    // dessinerait un fantôme et un cercle de portée en plein combat.
    if (w.phase !== 'placement') { this.ev.onTap(a.uid, a.axieId); return }
    this.claim(e)
    this.startX = e.clientX
    this.startY = e.clientY
    this.state = { kind: 'fromBoard', uid, axieId: a.axieId, px: e.clientX, py: e.clientY, cell: a.cell }
    this.recompute()
  }

  private move = (e: PointerEvent) => {
    if (this.state.kind === 'none' || this.foreign(e)) return
    this.state.px = e.clientX
    this.state.py = e.clientY
    this.recompute()
  }

  private up = (e: PointerEvent) => {
    if (this.state.kind === 'none' || this.foreign(e)) return
    const st = this.state
    const still = Math.hypot(e.clientX - this.startX, e.clientY - this.startY) <= TAP_SLOP
    // Tap, sur le plateau comme dans le bac : on ouvre la fiche et on ne pose
    // rien. Un tap dans le bac aimanterait sinon l'Axie sur la case valide la
    // plus proche du doigt, donc au bas du plateau, sans que le joueur l'ait
    // voulu.
    if (still) this.ev.onTap(st.kind === 'fromBoard' ? st.uid : -1, st.axieId)
    else this.ev.onDrop(st)
    this.release()
    this.state = { kind: 'none' }
    this.ev.onUpdate(this.state)
  }

  private cancel = (e: PointerEvent) => {
    if (this.state.kind === 'none' || this.foreign(e)) return
    this.release()
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
