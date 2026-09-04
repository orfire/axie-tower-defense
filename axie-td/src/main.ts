import { createWorld } from './sim/world'
import { GameApp } from './render/app'
import { drawBoard } from './render/board'

const host = document.querySelector<HTMLElement>('#app')
if (!host) throw new Error('#app introuvable')

const world = createWorld(3)
const game = new GameApp(host)

function redraw() {
  drawBoard(game.boardLayer, world.board, game.layout)
}
game.onResize(redraw)
redraw()
