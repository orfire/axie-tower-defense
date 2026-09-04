import { createWorld } from './sim/world'
import { place } from './sim/placement'
import { step } from './sim/game'
import { startWave } from './sim/world'
import { GameApp } from './render/app'
import { drawBoard } from './render/board'
import { WorldView } from './render/view'
import { loadSkeletons } from './render/sprites'
import { DT } from './sim/types'

const host = document.querySelector<HTMLElement>('#app')
if (!host) throw new Error('#app introuvable')

const world = createWorld(1)
const game = new GameApp(host)
const view = new WorldView(game)

const redraw = () => drawBoard(game.boardLayer, world.board, game.layout)
game.onResize(redraw)
redraw()

const enemies = [...new Set(world.level.waves.flatMap((w) => w.spawns.map((s) => s.enemy)))]
await loadSkeletons({ axies: ['olek', 'momo'], enemies })

place(world, 'olek', world.level.path[6])
place(world, 'momo', [world.level.path[6][0] + 1, world.level.path[6][1]])
startWave(world)

let acc = 0
game.app.ticker.add(() => {
  acc += game.app.ticker.deltaMS / 1000
  while (acc >= DT) { step(world); acc -= DT }
  world.events.length = 0
  view.sync(world)
})
