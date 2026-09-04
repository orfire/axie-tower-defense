import type { Spine } from 'pixi-spine'
import { createWorld, startWave } from './sim/world'
import { move, place, remove } from './sim/placement'
import { step } from './sim/game'
import { GameApp } from './render/app'
import { drawBoard } from './render/board'
import { WorldView } from './render/view'
import { loadSkeletons, makeSpine, playAnim, ANIM } from './render/sprites'
import { DT } from './sim/types'
import { Container } from 'pixi.js'
import { Hud } from './ui/hud'
import { Tray } from './ui/tray'
import { DragDrop, type DragState } from './ui/dragdrop'
import { drawAuraLinks, drawOverlay } from './ui/overlay'
import { pxToCell, unitToPx } from './render/layout'

const host = document.querySelector<HTMLElement>('#app')
if (!host) throw new Error('#app introuvable')

// Draft en dur pour la vérification manuelle (GDD §7 : le draft réel viendra d'un
// écran de sélection, hors scope de cette tâche).
const DRAFT = ['olek', 'momo', 'puffy', 'buba', 'pomodoro']

const world = createWorld(1)
const game = new GameApp(host)
const view = new WorldView(game)

// `drawOverlay` (cases valides, cercle de portée) va sous les unités : la
// couche de surbrillance. `drawAuraLinks` va au-dessus, dans la couche
// d'effets, sinon les sprites recouvrent entièrement le liseré — deux Axies
// voisins se touchent presque, il tomberait pile derrière eux (constaté en
// relecture de la tâche 13). Le fantôme du glissé vit dans la même couche
// d'effets, après les liserés, pour rester visible par-dessus tout le reste
// pendant le geste.
const overlayGfx = new Container()
game.overlayLayer.addChild(overlayGfx)
const auraLinksGfx = new Container()
const dragLayer = new Container()
game.fxLayer.addChild(auraLinksGfx, dragLayer)

const redraw = () => drawBoard(game.boardLayer, world.board, game.layout)
game.onResize(redraw)
redraw()

const enemies = [...new Set(world.level.waves.flatMap((w) => w.spawns.map((s) => s.enemy)))]
await loadSkeletons({ axies: DRAFT, enemies })

// --- HUD, bac, barre basse -------------------------------------------------

const hud = new Hud()
hud.mount(host)

const tray = new Tray()
tray.mount(host)

const bar = document.createElement('div')
bar.className = 'bar'
const launchBtn = document.createElement('button')
launchBtn.type = 'button'
launchBtn.className = 'launch'
launchBtn.textContent = 'Lancer la vague'
const speedBtn = document.createElement('button')
speedBtn.type = 'button'
speedBtn.className = 'speed'
speedBtn.textContent = '×1'
bar.append(launchBtn, speedBtn)
host.append(bar)

let speedMult = 1
speedBtn.addEventListener('click', () => {
  speedMult = speedMult === 1 ? 2 : 1
  speedBtn.classList.toggle('is-on', speedMult === 2)
  speedBtn.textContent = `×${speedMult}`
})

launchBtn.addEventListener('click', () => {
  startWave(world)
  refreshChrome()
})

function refreshChrome(): void {
  hud.update(world)
  tray.update(world, DRAFT)
  launchBtn.disabled = world.phase !== 'placement'
  drawOverlay(overlayGfx, world, game.layout, dragDrop.state)
  drawAuraLinks(auraLinksGfx, world, game.layout)
}

// --- Glisser-déposer ---------------------------------------------------------

/**
 * Fantôme du glissé : l'Axie tiré du bac n'est pas encore dans la simulation,
 * `WorldView` ne peut donc pas l'afficher (note d'architecture de la tâche 13).
 * Le fantôme suit tout glissement, qu'il vienne du bac ou d'un Axie déjà posé :
 * pas besoin de distinguer les deux ici. Pour un Axie déjà posé, c'est
 * `view.sync(world, draggedUid)` qui masque sa case d'origine pendant le
 * geste, pour que le fantôme reste la seule copie visible.
 */
let ghost: { axieId: string; spine: Spine } | null = null

function ensureGhost(axieId: string): Spine {
  if (ghost && ghost.axieId === axieId) return ghost.spine
  if (ghost) ghost.spine.destroy()
  const spine = makeSpine(`axie:${axieId}`)
  spine.alpha = 0.85
  dragLayer.addChild(spine)
  playAnim(spine, ANIM.axie_idle.spine, true, ANIM.axie_idle.random)
  ghost = { axieId, spine }
  return spine
}

function clearGhost(): void {
  if (!ghost) return
  ghost.spine.destroy()
  ghost = null
}

/** Même hauteur voulue que `WorldView` pour les Axies : une case (voir render/view.ts). */
const GHOST_CELLS = 1.0

function updateGhost(state: DragState): void {
  if (state.kind === 'none') { clearGhost(); return }
  const spine = ensureGhost(state.axieId)
  const c = game.layout.cell
  const natural = spine.spineData.height || 800
  const s = (GHOST_CELLS * c) / natural
  spine.scale.set(s, s)
  const p = state.cell
    ? unitToPx(game.layout, state.cell[0] + 0.5, state.cell[1] + 0.5)
    : { x: state.px, y: state.py }
  // Origine aux pieds, comme WorldView : on pose sur le bas de la case, pas le centre.
  spine.position.set(p.x, p.y + c * 0.42)
}

/** Axie tenu en main, -1 hors glissement. Sert à le masquer dans `WorldView`. */
function draggedUid(): number {
  return dragDrop.state.kind === 'fromBoard' ? dragDrop.state.uid : -1
}

const dragDrop = new DragDrop({
  getWorld: () => world,
  getLayout: () => game.layout,
  axieAt: (cell) => {
    const a = world.axies.find((x) => !x.ko && x.cell[0] === cell[0] && x.cell[1] === cell[1])
    return a ? a.uid : null
  },
  onDrop: (state) => {
    if (state.kind === 'fromTray') {
      if (state.cell) place(world, state.axieId, state.cell)
    } else if (state.kind === 'fromBoard') {
      if (state.cell) {
        move(world, state.uid, state.cell)
      } else if (!pxToCell(game.layout, state.px, state.py)) {
        // Relâché hors du plateau (au-dessus du bac ou de la barre) : renvoyé au bac.
        remove(world, state.uid)
      }
      // Relâché sur le plateau mais trop loin de toute case valide : reste en place.
    }
    clearGhost()
    refreshChrome()
  },
  onUpdate: (state) => {
    updateGhost(state)
    drawOverlay(overlayGfx, world, game.layout, state)
  },
})
dragDrop.attach(game.app.view as HTMLCanvasElement)

tray.onPick((axieId, px, py, e) => {
  dragDrop.startFromTray(axieId, px, py, e)
})

refreshChrome()

// --- Boucle de simulation ----------------------------------------------------

let acc = 0
game.app.ticker.add(() => {
  acc += (game.app.ticker.deltaMS / 1000) * speedMult
  while (acc >= DT) { step(world); acc -= DT }
  world.events.length = 0
  view.sync(world, draggedUid())
  refreshChrome()
})
