import { Container, Graphics } from 'pixi.js'
import type { Board } from '../sim/grid'
import { PALETTE } from './app'
import { cellToPx, COLS, ROWS, type Layout } from './layout'

/**
 * Dessine le plateau une fois par niveau. Le décor reste discret :
 * c'est le chemin qui doit ressortir, pas la grille (GDD §20.3).
 */
export function drawBoard(target: Container, board: Board, layout: Layout): void {
  target.removeChildren()
  const g = new Graphics()
  const c = layout.cell
  const r = Math.max(2, c * 0.14)

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const kind = board.kindAt([col, row])
      const { x, y } = cellToPx(layout, col, row)

      if (kind === 'path') {
        g.beginFill(PALETTE.path).drawRect(x, y, c, c).endFill()
      } else if (kind === 'hill') {
        // Ombre portée sous la colline : elle doit se reconnaître sans légende.
        g.beginFill(PALETTE.hillShadow).drawRoundedRect(x + 2, y + 6, c - 4, c - 6, r).endFill()
        g.beginFill(PALETTE.hill).drawRoundedRect(x + 2, y, c - 4, c - 6, r).endFill()
        g.beginFill(0xffffff, 0.35)
          .drawEllipse(x + c * 0.36, y + c * 0.28, c * 0.13, c * 0.07)
          .drawEllipse(x + c * 0.66, y + c * 0.36, c * 0.1, c * 0.06)
          .endFill()
      } else {
        g.beginFill(PALETTE.plain).drawRect(x, y, c, c).endFill()
        g.lineStyle(1, PALETTE.plainLine, 0.1).drawRect(x + 0.5, y + 0.5, c - 1, c - 1)
        g.lineStyle(0)
      }
    }
  }

  // Bord arrondi du chemin : on repasse les extrémités pour adoucir l'entrée et la sortie.
  const entry = cellToPx(layout, board.path[0][0], board.path[0][1])
  const exit = cellToPx(layout, board.path.at(-1)![0], board.path.at(-1)![1])
  g.beginFill(PALETTE.path, 1)
    .drawRoundedRect(entry.x, entry.y, c, c, r)
    .drawRoundedRect(exit.x, exit.y, c, c, r)
    .endFill()

  target.addChild(g)
}
