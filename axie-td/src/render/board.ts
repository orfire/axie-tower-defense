import { Container, Graphics } from 'pixi.js'
import type { Board } from '../sim/grid'
import { PALETTE } from './app'
import { cellToPx, COLS, ROWS, type Layout } from './layout'

/**
 * Dessine le plateau une fois par niveau. Le décor reste discret :
 * c'est le chemin qui doit ressortir, pas la grille (GDD §20.3).
 */
export function drawBoard(target: Container, board: Board, layout: Layout): void {
  // `removeChildren` détache sans libérer la géométrie GPU : sans le `destroy`,
  // un redimensionnement au glissé accumule des objets pendant toute la session.
  for (const old of target.removeChildren()) old.destroy()
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

  // Entrée et sortie : deux repères que le joueur doit lire sans légende.
  // Repasser un rectangle arrondi de la même couleur par-dessus le chemin ne
  // donnerait rien, la forme arrondie étant incluse dans le carré déjà peint.
  const entry = cellToPx(layout, board.path[0][0], board.path[0][1])
  const exit = cellToPx(layout, board.path.at(-1)![0], board.path.at(-1)![1])

  // L'entrée est une gueule de terrier : un demi-disque sombre en creux.
  g.beginFill(PALETTE.pathEdge, 0.9)
    .drawCircle(entry.x + c / 2, entry.y + c / 2, c * 0.3)
    .endFill()

  // La sortie est un anneau clair : c'est là que les chimères s'échappent.
  g.lineStyle(Math.max(2, c * 0.08), PALETTE.exit, 0.95)
    .drawCircle(exit.x + c / 2, exit.y + c / 2, c * 0.3)
    .lineStyle(0)

  target.addChild(g)
}
