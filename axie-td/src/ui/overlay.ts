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
 * Cases valides, cercle de portée et liserés d'aura.
 * Les liserés portent aussi l'icône de la classe côté HTML : jamais d'information
 * transmise par la couleur seule (exigence d'accessibilité).
 */
export function drawOverlay(target: Container, world: World, layout: Layout, drag: DragState): void {
  target.removeChildren()
  const g = new Graphics()
  const c = layout.cell

  // Liserés d'aura, visibles en permanence entre voisins qui se donnent une aura.
  for (const a of world.axies) {
    if (a.ko) continue
    for (const src of auraSources(world, a)) {
      const from = center(a.cell)
      const to = center(src.cell)
      const mid = unitToPx(layout, (from.x + to.x) / 2, (from.y + to.y) / 2)
      const horizontal = from.y === to.y
      const w = horizontal ? c * 0.07 : c * 0.5
      const h = horizontal ? c * 0.5 : c * 0.07
      g.beginFill(PALETTE.classes[src.cls], 0.9)
        .drawRoundedRect(mid.x - w / 2, mid.y - h / 2, w, h, Math.min(w, h) / 2)
        .endFill()
    }
  }

  if (drag.kind === 'none') { target.addChild(g); return }

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

  target.addChild(g)
}

/** Portée de base d'un Axie, posé ou encore dans le bac. */
function rangeOf(world: World, axieId: string): number {
  const posed = world.axies.find((x) => x.axieId === axieId)
  if (posed) return posed.baseRange
  const cls = axieDef(axieId).class
  return cls === 'dusk' ? 1 : BALANCE.classes[cls].range
}
