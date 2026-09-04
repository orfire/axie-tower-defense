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

/**
 * Première case voisine en plaine. Un décalage fixe ne convient pas : au niveau 1,
 * le voisin de droite de `path[6]` est `path[7]`, donc une case de chemin, où une
 * classe à distance ne peut pas se poser. Momo disparaîtrait sans erreur visible.
 */
function plainNeighbour(w: typeof world, cell: readonly [number, number]): [number, number] {
  for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const n: [number, number] = [cell[0] + dc, cell[1] + dr]
    if (w.board.kindAt(n) === 'plain') return n
  }
  throw new Error(`Aucun voisin en plaine pour ${cell}`)
}

// `place` renvoie null quand la case est refusée. Sans ce contrôle, un Axie
// disparaît sans message et on cherche la cause ailleurs, comme c'est arrivé ici.
const blocker = world.level.path[6]
for (const [id, cell] of [
  ['olek', blocker],
  ['momo', plainNeighbour(world, blocker)],
] as const) {
  if (!place(world, id, cell)) throw new Error(`Placement refusé : ${id} en ${cell}`)
}
startWave(world)

let acc = 0
game.app.ticker.add(() => {
  acc += game.app.ticker.deltaMS / 1000
  while (acc >= DT) { step(world); acc -= DT }
  world.events.length = 0
  view.sync(world)
})
