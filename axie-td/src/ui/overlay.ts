import { Container, Graphics } from 'pixi.js'
import { BALANCE, axieDef } from '../data/load'
import { PALETTE } from '../render/app'
import { COLS, ROWS, cellToPx, unitToPx, type Layout } from '../render/layout'
import { auraSources } from '../sim/auras'
import { center } from '../sim/grid'
import { canPlace } from '../sim/placement'
import type { World } from '../sim/world'
import type { DragState } from './dragdrop'

/**
 * Un seul objet Graphics, réutilisé et vidé plutôt que recréé.
 * Ces fonctions tournent à chaque frame et à chaque mouvement du doigt :
 * `removeChildren` détache sans libérer la géométrie GPU, si bien qu'en recréer
 * un à chaque appel épuise la mémoire de la carte en quelques minutes de jeu.
 */
function reusableGraphics(target: Container): Graphics {
  const first = target.children[0]
  if (first instanceof Graphics) {
    // Les enfants ajoutés après le Graphics, comme les badges de classe de la
    // tâche 19, sont reconstruits à chaque appel : on les libère ici. Pixi
    // refuse `removeChildren(1)` quand il n'y a justement rien après l'index 0
    // (`children.length === 1`, le cas courant tant qu'aucun enfant supplémentaire
    // n'existe) : `range === 0` n'est accepté que sur un conteneur totalement vide,
    // sans quoi `Container.removeChildren` lève un `RangeError`. Constaté à
    // l'exécution : la première trame après une pose plantait silencieusement le
    // gestionnaire de relâchement, laissant le glissé bloqué en plein geste.
    if (target.children.length > 1) {
      for (const extra of target.removeChildren(1)) extra.destroy()
    }
    first.clear()
    return first
  }
  for (const old of target.removeChildren()) old.destroy()
  const g = new Graphics()
  target.addChild(g)
  return g
}

/**
 * Liserés d'aura, dessinés AU-DESSUS des unités.
 * Ils vivent dans la couche d'effets et non dans celle des surbrillances, sinon
 * les sprites les recouvrent entièrement : deux Axies voisins se touchent presque,
 * et le liseré tombe pile derrière eux. C'est le seul indice non coloré d'une
 * mécanique centrale du jeu, il doit rester visible.
 */
export function drawAuraLinks(target: Container, world: World, layout: Layout): void {
  const g = reusableGraphics(target)
  const c = layout.cell
  for (const a of world.axies) {
    if (a.ko) continue
    for (const src of auraSources(world, a)) {
      const from = center(a.cell)
      const to = center(src.cell)
      const mid = unitToPx(layout, (from.x + to.x) / 2, (from.y + to.y) / 2)
      const horizontal = from.y === to.y
      const w = horizontal ? c * 0.07 : c * 0.5
      const h = horizontal ? c * 0.5 : c * 0.07
      g.beginFill(PALETTE.classes[src.cls], 0.95)
        .drawRoundedRect(mid.x - w / 2, mid.y - h / 2, w, h, Math.min(w, h) / 2)
        .endFill()
    }
  }
}

/**
 * Cases valides et cercle de portée, dessinés SOUS les unités.
 * Les liserés d'aura, eux, sont dessinés par `drawAuraLinks`, au-dessus.
 */
export function drawOverlay(target: Container, world: World, layout: Layout, drag: DragState): void {
  const g = reusableGraphics(target)
  const c = layout.cell

  if (drag.kind === 'none') return

  // Cases valides pour l'Axie en main.
  const movingUid = drag.kind === 'fromBoard' ? drag.uid : -1
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (!canPlace(world, drag.axieId, [col, row], movingUid).ok) continue
      const p = cellToPx(layout, col, row)
      g.beginFill(PALETTE.valid, 0.45)
        .drawRoundedRect(p.x + 3, p.y + 3, c - 6, c - 6, c * 0.15)
        .endFill()
    }
  }

  // Cercle de portée, à la case aimantée.
  if (drag.cell) {
    const def = world.axies.find((a) => a.uid === movingUid)
    const cls = def ? def.cls : undefined
    const base = cls ? BALANCE.classes[cls].range : rangeOf(world, drag.axieId)
    const onHill = world.board.kindAt(drag.cell) === 'hill'
    const range = Math.max(0.5, base - (onHill ? BALANCE.cells.hill.range_penalty : 0))
    const mid = center(drag.cell)
    const p = unitToPx(layout, mid.x, mid.y)
    g.beginFill(PALETTE.range, 0.16).drawCircle(p.x, p.y, range * c).endFill()
    g.lineStyle(2, PALETTE.range, 0.75).drawCircle(p.x, p.y, range * c).lineStyle(0)
  }
}

/** Portée de base d'un Axie, posé ou encore dans le bac. */
function rangeOf(world: World, axieId: string): number {
  const posed = world.axies.find((x) => x.axieId === axieId)
  if (posed) return posed.baseRange
  const cls = axieDef(axieId).class
  return cls === 'dusk' ? 1 : BALANCE.classes[cls].range
}
