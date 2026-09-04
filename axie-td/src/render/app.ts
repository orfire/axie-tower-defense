import { Application, Container } from 'pixi.js'
import { computeLayout, type Layout } from './layout'

export const PALETTE = {
  ground: 0x3b4d43,
  plain: 0xb6c4a5,
  plainLine: 0x22302a,
  path: 0x9a7b5b,
  pathEdge: 0x5c4936,
  exit: 0xffd23f,
  hill: 0xc9c2b0,
  hillShadow: 0x8f8877,
  valid: 0x78cd6e,
  range: 0xffffff,
  classes: {
    beast: 0xf5a623,
    aquatic: 0x3aa7d9,
    plant: 0x6dbe45,
    bird: 0xf27ba8,
    bug: 0xe5473e,
    reptile: 0x9b5de5,
  },
} as const

/** Application Pixi et ses trois couches, du fond vers l'avant. */
export class GameApp {
  readonly app: Application
  /** Plateau : plaine, chemin, collines. Redessiné seulement au changement de niveau. */
  readonly boardLayer = new Container()
  /** Surbrillances de placement : cases valides, portée, liserés d'aura. */
  readonly overlayLayer = new Container()
  /** Unités : Axies et chimères. Trié par profondeur à chaque frame. */
  readonly unitLayer = new Container()
  /** Effets additifs et nombres flottants. */
  readonly fxLayer = new Container()
  layout: Layout
  private callbacks: ((l: Layout) => void)[] = []

  constructor(readonly host: HTMLElement) {
    this.app = new Application({
      resizeTo: host,
      background: PALETTE.ground,
      antialias: true,
      resolution: Math.min(2, window.devicePixelRatio || 1),
      autoDensity: true,
    })
    host.appendChild(this.app.view as HTMLCanvasElement)
    this.app.stage.addChild(this.boardLayer, this.overlayLayer, this.unitLayer, this.fxLayer)
    this.layout = computeLayout(host.clientWidth, host.clientHeight)
    this.app.renderer.on('resize', (w: number, h: number) => {
      const next = computeLayout(w, h)
      // Un redimensionnement au glissé émet des dizaines d'événements. Tant que
      // la géométrie du plateau ne bouge pas au pixel près, rien à redessiner.
      const same = next.cell === this.layout.cell
        && next.boardX === this.layout.boardX
        && next.boardY === this.layout.boardY
      this.layout = next
      if (same) return
      for (const cb of this.callbacks) cb(next)
    })
  }

  onResize(cb: (l: Layout) => void): void {
    this.callbacks.push(cb)
  }

  /** Trie les unités par ordonnée : celles du bas passent devant. */
  sortUnits(): void {
    this.unitLayer.children.sort((a, b) => a.y - b.y)
  }
}
