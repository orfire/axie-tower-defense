import type { Spine } from 'pixi-spine'
import { Container } from 'pixi.js'
import { LEVELS, axieDef, levelDef } from './data/load'
import { Session, finishLevel } from './game/session'
import { saveNow } from './save/storage'
import { move, place, remove } from './sim/placement'
import { GameApp } from './render/app'
import { drawBoard } from './render/board'
import { WorldView } from './render/view'
import { loadSkeletons, makeSpine, playAnim, ANIM } from './render/sprites'
import { loadVfx } from './render/vfx'
import { tickFloats } from './render/floats'
import { consumeEvents } from './render/effects'
import { pxToCell, unitToPx } from './render/layout'
import { Sfx } from './audio/sfx'
import { Music, trackFor } from './audio/music'
import { CardOverlay } from './ui/cards'
import { controlsHtml } from './ui/controls'
import { DragDrop, type DragState } from './ui/dragdrop'
import { Hud } from './ui/hud'
import { injectIconStyles } from './ui/icons'
import { Onboarding, hintCell } from './ui/onboarding'
import { drawAuraLinks, drawAuraZones, drawHintCell, drawOverlay } from './ui/overlay'
import { Router, type ScreenId } from './ui/router'
import {
  briefHtml, collectionHtml, defeatHtml, draftHtml, mapHtml, resultHtml, titleHtml,
} from './ui/screens'
import { Tray } from './ui/tray'

const host = document.querySelector<HTMLElement>('#app')
if (!host) throw new Error('#app introuvable')

const session = new Session()
const router = new Router()
session.speed2x = session.save.speed2x

// Emblèmes de classe des six classes, en données URI : la patte, le poisson, la
// feuille, la plume, le papillon, la patte de reptile. La silhouette porte la
// classe, la couleur ne fait que la redire (règle d'accessibilité du concours).
injectIconStyles()

/**
 * Raccourci de développement : `?niveau=N` entre directement dans le niveau N,
 * avec le draft imposé s'il y en a un, sinon les Axies disponibles.
 *
 * La carte de campagne l'a remplacé pour le jeu normal, mais il contourne le
 * verrouillage par étoiles : c'est le seul moyen d'aller éprouver les niveaux 6
 * et 8 sans rejouer toute la campagne. Absence du paramètre = démarrage normal
 * sur l'écran de titre, d'où le `NaN` explicite plutôt que `Number(null)`, qui
 * vaut 0 et passerait pour une valeur donnée.
 */
const rawLevel = new URLSearchParams(location.search).get('niveau')
const wanted = rawLevel === null ? NaN : Number(rawLevel)
const devLevel = Number.isFinite(wanted)
  ? Math.min(Math.max(Math.trunc(wanted), 1), LEVELS.length)
  : null

// --- Écrans HTML -------------------------------------------------------------

/**
 * Les sept écrans hors jeu vivent dans ce seul conteneur, opaque et au-dessus
 * du plateau. Le jeu, lui, n'est jamais démonté : masquer le canvas coûte moins
 * qu'une application Pixi recréée à chaque aller-retour vers la carte.
 */
const screensEl = document.createElement('div')
screensEl.className = 'screens'
host.append(screensEl)

/** Ce que les écrans ont besoin de retenir entre deux navigations. */
const nav = {
  levelId: 1,
  /** Draft en cours de composition sur l'écran de draft. */
  picked: [] as string[],
  stars: 0,
  /** Axie débloqué par le dernier résultat, affiché en fiche. */
  unlocked: null as string | null,
  /** Vague atteinte à la défaite. */
  wave: 1,
}

// --- Jeu ---------------------------------------------------------------------

const game = new GameApp(host)
const worldView = new WorldView(game)
const canvas = game.app.view as HTMLCanvasElement

/**
 * Barre haute, bac et barre basse dans un même calque, masqué hors du jeu.
 *
 * Sans ce regroupement, leurs boutons resteraient dans l'ordre de tabulation
 * derrière l'écran de titre : un joueur au clavier tomberait sur « Lancer la
 * vague » invisible.
 */
const gameUi = document.createElement('div')
gameUi.className = 'game-ui'
host.append(gameUi)

// `drawOverlay` (cases valides, cercle de portée) va sous les unités : la
// couche de surbrillance. `drawAuraLinks` va au-dessus, dans la couche
// d'effets, sinon les sprites recouvrent entièrement le liseré — deux Axies
// voisins se touchent presque, il tomberait pile derrière eux (constaté en
// relecture de la tâche 13). Le fantôme du glissé vit dans la même couche
// d'effets, après les liserés, pour rester visible par-dessus tout le reste
// pendant le geste.
const auraZonesGfx = new Container()
const overlayGfx = new Container()
// L'anneau d'onboarding en dernier : il désigne une case précise et doit rester
// lisible par-dessus les zones d'aura comme par-dessus les cases valides.
const hintCellGfx = new Container()
// Les zones d'aura d'abord : la surbrillance des cases valides pendant un
// glissement doit rester lisible par-dessus elles.
game.overlayLayer.addChild(auraZonesGfx, overlayGfx, hintCellGfx)
const auraLinksGfx = new Container()
const dragLayer = new Container()
game.fxLayer.addChild(auraLinksGfx, dragLayer)

const redraw = () => {
  if (session.world) drawBoard(game.boardLayer, session.world.board, game.layout)
}
game.onResize(redraw)

const sfx = new Sfx()
// Le bouton de coupure est commun aux deux : le GDD §14 n'en prévoit qu'un.
const music = new Music(sfx.muted)

const hud = new Hud()
hud.mount(gameUi)

function syncMuteBtn(): void {
  hud.muteBtn.classList.toggle('is-muted', sfx.muted)
  hud.muteBtn.textContent = sfx.muted ? '✕' : '♪'
  hud.muteBtn.setAttribute('aria-pressed', String(sfx.muted))
  // L'étiquette dit l'action à venir, pas l'état : « Couper le son » figé sur un
  // bouton déjà coupé annonce l'inverse de ce qu'il fait. `aria-pressed` porte
  // l'état, l'étiquette porte l'effet du prochain appui.
  hud.muteBtn.setAttribute('aria-label', sfx.muted ? 'Unmute' : 'Mute')
}
syncMuteBtn()
hud.muteBtn.addEventListener('click', () => {
  music.setMuted(sfx.toggleMute())
  syncMuteBtn()
})

const tray = new Tray()
tray.mount(gameUi)

const cards = new CardOverlay()
cards.mount(host)

/**
 * Bulles d'onboarding des niveaux 1 et 2 (GDD §12), montées dans le calque du
 * jeu pour disparaître avec lui dès qu'on quitte le plateau.
 *
 * Le niveau 3 en a une lui aussi, mais elle vit sur l'écran de draft : elle est
 * rendue par `draftHtml` et ne passe jamais par cet objet, qui n'existe que
 * tant qu'un monde existe. C'est ce que dit le drapeau `onboarding` des
 * données, vrai aux seuls niveaux 1 et 2.
 */
const onboarding = new Onboarding()
onboarding.mount(gameUi)

/** Un battement complet de l'anneau qui désigne une case, en millisecondes. */
const HINT_PULSE_MS = 1200

// Flash rouge plein écran quand une chimère sort : pas de son ni de VFX kit
// dédiés à une fuite, juste un signal d'écran (et une vibration sur mobile).
const leakFlash = document.createElement('div')
leakFlash.className = 'leak-flash'
gameUi.append(leakFlash)
let leakFlashTimer: ReturnType<typeof setTimeout> | undefined
function flashLeak(): void {
  leakFlash.classList.add('is-on')
  if (leakFlashTimer) clearTimeout(leakFlashTimer)
  leakFlashTimer = setTimeout(() => leakFlash.classList.remove('is-on'), 220)
  navigator.vibrate?.(120)
}

const bar = document.createElement('div')
bar.className = 'bar'
const launchBtn = document.createElement('button')
launchBtn.type = 'button'
launchBtn.className = 'launch'
launchBtn.textContent = 'Start wave'
const speedBtn = document.createElement('button')
speedBtn.type = 'button'
speedBtn.className = 'speed'
const quitBtn = document.createElement('button')
quitBtn.type = 'button'
quitBtn.className = 'speed quit'
quitBtn.textContent = '☰'
quitBtn.setAttribute('aria-label', 'Quit the level and go back to the map')
bar.append(launchBtn, speedBtn, quitBtn)
gameUi.append(bar)

function syncSpeedBtn(): void {
  speedBtn.classList.toggle('is-on', session.speed2x)
  speedBtn.textContent = session.speed2x ? '×2' : '×1'
  speedBtn.setAttribute('aria-pressed', String(session.speed2x))
  // « ×2 » seul ne se lit pas à voix haute : un lecteur d'écran annonce
  // « fois deux, bouton », sans dire de quoi. L'étiquette nomme l'action.
  speedBtn.setAttribute(
    'aria-label',
    session.speed2x ? 'Revenir à la vitesse normale' : 'Doubler la vitesse',
  )
}
syncSpeedBtn()
speedBtn.addEventListener('click', () => {
  session.speed2x = !session.speed2x
  session.save = { ...session.save, speed2x: session.speed2x }
  saveNow(session.save)
  syncSpeedBtn()
})

quitBtn.addEventListener('click', () => router.go('map'))

launchBtn.addEventListener('click', () => {
  session.launchWave()
  refreshChrome()
})

function refreshChrome(): void {
  const w = session.world
  if (!w) return
  hud.update(w)
  tray.update(w, session.draft)
  // Le libellé change avec la phase : un bouton grisé qui dit encore « Lancer la
  // vague » ne dit pas pourquoi il ne répond plus, et le gris seul ne porte pas
  // l'information (règle d'accessibilité du concours).
  const placing = w.phase === 'placement'
  launchBtn.disabled = !placing
  const label = placing ? 'Lancer la vague' : 'Wave running'
  if (launchBtn.textContent !== label) launchBtn.textContent = label
  drawOverlay(overlayGfx, w, game.layout, dragDrop.state)
  drawAuraZones(auraZonesGfx, w, game.layout)
  drawAuraLinks(auraLinksGfx, w, game.layout)

  // L'onboarding est ici et pas seulement dans le ticker : une bulle doit
  // s'effacer au geste, pas à la frame suivante. `refreshChrome` est justement
  // rappelé au relâchement d'un glissé et au lancement d'une vague.
  if (!w.level.onboarding) {
    drawHintCell(hintCellGfx, null, game.layout, 0)
    return
  }
  onboarding.update(w)
  const phase = (game.app.ticker.lastTime % HINT_PULSE_MS) / HINT_PULSE_MS
  drawHintCell(hintCellGfx, hintCell(onboarding.current ?? undefined, w.level), game.layout, phase)
}

// --- Glisser-déposer ---------------------------------------------------------

/**
 * Fantôme du glissé : l'Axie tiré du bac n'est pas encore dans la simulation,
 * `WorldView` ne peut donc pas l'afficher (note d'architecture de la tâche 13).
 * Le fantôme suit tout glissement, qu'il vienne du bac ou d'un Axie déjà posé :
 * pas besoin de distinguer les deux ici. Pour un Axie déjà posé, c'est
 * `worldView.sync(w, draggedUid)` qui masque sa case d'origine pendant le geste,
 * pour que le fantôme reste la seule copie visible.
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
  // `axieAt` est consulté avant `getWorld` : hors partie il ne trouve rien et
  // le geste s'arrête là, si bien que `getWorld` n'est jamais appelé à vide.
  getWorld: () => session.world!,
  getLayout: () => game.layout,
  axieAt: (cell) => {
    const w = session.world
    if (!w) return null
    const a = w.axies.find((x) => !x.ko && x.cell[0] === cell[0] && x.cell[1] === cell[1])
    return a ? a.uid : null
  },
  onDrop: (state) => {
    const w = session.world
    if (!w) return
    if (state.kind === 'fromTray') {
      if (state.cell) place(w, state.axieId, state.cell)
    } else if (state.kind === 'fromBoard') {
      if (state.cell) {
        move(w, state.uid, state.cell)
      } else if (!pxToCell(game.layout, state.px, state.py)) {
        // Relâché hors du plateau (au-dessus du bac ou de la barre) : renvoyé au bac.
        remove(w, state.uid)
      }
      // Relâché sur le plateau mais trop loin de toute case valide : reste en place.
    }
    clearGhost()
    refreshChrome()
  },
  onUpdate: (state) => {
    const w = session.world
    if (!w) return
    updateGhost(state)
    drawOverlay(overlayGfx, w, game.layout, state)
    // Les zones suivent l'Axie en main : on lit où portera son aura avant de
    // lâcher, ce qui est tout l'intérêt de les montrer pendant le placement.
    drawAuraZones(auraZonesGfx, w, game.layout)
  },
  onTap: (_uid, axieId) => {
    clearGhost()
    cards.showAxie(axieId)
    refreshChrome()
  },
})
dragDrop.attach(canvas)

tray.onPick((axieId, px, py, e) => {
  dragDrop.startFromTray(axieId, px, py, e)
})

// --- Fiches d'Axie et de chimère --------------------------------------------

// Le bac et le plateau partagent le même geste : glisser pose, taper ouvre la
// fiche. Une fiche ouverte par un minuteur d'appui long volait le glissement à
// tout joueur qui marquait une pause avant de bouger — constaté sur la version
// déployée, où poser Buba au niveau 1 devenait impossible.

// Les Axies posés passent par `onTap` du glisser-déposer, dans les deux phases.
// Il ne reste ici que les chimères, que le glissement ne connaît pas.
canvas.addEventListener('pointerdown', (e) => {
  const w = session.world
  if (!w || w.phase !== 'wave') return
  const cell = pxToCell(game.layout, e.clientX, e.clientY)
  if (!cell) return
  if (w.axies.some((a) => a.cell[0] === cell[0] && a.cell[1] === cell[1])) return
  const enemy = w.enemies.find((en) => {
    const c = w.board.cellAt(en.d)
    return c[0] === cell[0] && c[1] === cell[1]
  })
  if (enemy) cards.showEnemy(enemy.type)
})

// --- Chargement d'un niveau --------------------------------------------------

/**
 * Squelettes et atlas du niveau à venir. Les deux fonctions ignorent ce qui est
 * déjà en mémoire : rejouer un niveau ne recharge rien.
 */
async function preload(draft: string[], enemies: string[]): Promise<void> {
  await loadSkeletons({ axies: draft, enemies })
  // Atlas d'effets nécessaires au niveau : les attaques des classes du draft et
  // tous les statuts du jeu (petit ensemble fixe). Les autres atlas restent sur
  // le disque, chargés seulement si un futur niveau en a besoin.
  const draftClasses = [...new Set(draft.map((id) => axieDef(id).class))]
  const attackVfxIds = draftClasses
    .map((c) => ANIM.axie_attack[c]?.vfx)
    .filter((v): v is string => Boolean(v))
  const statusVfxIds = Object.values(ANIM.status).map((s) => s.vfx)
  await loadVfx([...attackVfxIds, ...statusVfxIds])
}

/** Vrai tant que les assets du niveau ne sont pas là : l'écran de jeu attend. */
let loading = false
/**
 * Jeton de la dernière entrée en jeu. Un joueur qui repart sur la carte pendant
 * le chargement ne doit pas voir le plateau s'afficher par-dessus quand les
 * assets finissent d'arriver.
 */
let playToken = 0
/** Fin de niveau déjà traitée : `finish` n'enregistre qu'une fois. */
let ended = false

async function startPlay(levelId: number, draft: string[]): Promise<void> {
  const token = ++playToken
  loading = true
  ended = false
  // Un niveau rejoué réaffiche ses bulles : la disposition est à revoir, et
  // c'est justement là que le rappel sert.
  onboarding.reset()
  session.begin(levelId, draft)
  render()
  await preload(session.draft, session.announcedEnemies(levelId))
  if (token !== playToken || router.current !== 'play') return
  loading = false
  worldView.clear()
  redraw()
  refreshChrome()
  render()
}

// --- Navigation --------------------------------------------------------------

/** Numéro de niveau porté par un paramètre d'écran, ou le niveau courant. */
function levelParam(p: Record<string, unknown>): number {
  const n = Number(p.levelId)
  return Number.isFinite(n) && n >= 1 ? n : nav.levelId
}

router.onEnter('brief', (p) => { nav.levelId = levelParam(p) })

router.onEnter('draft', (p) => {
  nav.levelId = levelParam(p)
  nav.picked = session.suggestedDraft(nav.levelId)
})

router.onEnter('play', (p) => {
  const id = levelParam(p)
  // Reporté dans l'état de navigation : les écrans « fiche » et « draft » le
  // faisaient déjà, mais on entre aussi en jeu sans passer par eux — le
  // raccourci `?niveau=`. Sans cette ligne, la musique et l'écran de fin
  // restaient sur le niveau précédent.
  nav.levelId = id
  const draft = Array.isArray(p.draft) && p.draft.length > 0
    ? (p.draft as string[])
    : session.suggestedDraft(id)
  void startPlay(id, draft)
})

for (const id of ['title', 'map', 'brief', 'draft', 'result', 'defeat', 'collection', 'controls'] as const) {
  router.onEnter(id, () => render())
}

function screenHtml(): string {
  switch (router.current) {
    case 'title': return titleHtml(session.save)
    case 'map': return mapHtml(session.save)
    case 'brief': return briefHtml(session, nav.levelId)
    case 'draft': return draftHtml(session, nav.levelId, nav.picked)
    case 'result': return resultHtml(nav.levelId, nav.stars, session.save, nav.unlocked)
    case 'defeat': return defeatHtml(nav.levelId, nav.wave)
    case 'collection': return collectionHtml(session.save)
    case 'controls': return controlsHtml()
    default: return '<div class="screen"><p class="hint">Loading…</p></div>'
  }
}

function render(): void {
  const playing = router.current === 'play' && !loading
  // La piste suit l'écran. `Music.play` ignore une demande identique, donc
  // passer du titre à la carte puis au draft ne recommence pas la boucle.
  music.play(trackFor(router.current, nav.levelId))
  gameUi.hidden = !playing
  canvas.style.visibility = playing ? 'visible' : 'hidden'
  screensEl.hidden = playing
  if (playing) return
  screensEl.innerHTML = screenHtml()
  screensEl.scrollTop = 0
}

/**
 * Une seule délégation pour les sept écrans : le HTML est réécrit à chaque
 * navigation, un écouteur par bouton serait reposé à chaque fois.
 */
screensEl.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-go],[data-level],[data-draft],[data-play],[data-retry],[data-pick],[data-unpick],[data-card]')
  if (!el) return
  const d = el.dataset

  if (d.go) { router.go(d.go as ScreenId); return }
  if (d.level) { router.go('brief', { levelId: Number(d.level) }); return }
  if (d.draft) { router.go('draft', { levelId: Number(d.draft) }); return }
  if (d.play) { router.go('play', { levelId: Number(d.play), draft: [...nav.picked] }); return }
  // « Réessayer » conserve le draft de la tentative précédente (GDD §11.5) :
  // seule la disposition est à revoir, les vagues sont identiques.
  if (d.retry) { router.go('play', { levelId: Number(d.retry), draft: [...session.draft] }); return }
  if (d.card) { cards.showAxie(d.card); return }

  // Composition du draft. Une équipe imposée ne se modifie pas.
  if (levelDef(nav.levelId).draft.forced) return
  if (d.pick) {
    if (nav.picked.includes(d.pick)) nav.picked = nav.picked.filter((x) => x !== d.pick)
    else if (nav.picked.length < 5) nav.picked = [...nav.picked, d.pick]
    render()
  } else if (d.unpick) {
    nav.picked = nav.picked.filter((x) => x !== d.unpick)
    render()
  }
})

// --- Fin de niveau -----------------------------------------------------------

/**
 * Court délai avant l'écran de résultat : le coup fatal, le dernier nombre
 * flottant et le flash de fuite ont le temps de s'afficher.
 */
const END_DELAY_MS = 900

function onLevelEnd(): void {
  const r = finishLevel(session)
  if (!r) return
  ended = true
  nav.levelId = session.levelId
  nav.stars = r.stars
  nav.unlocked = r.unlocked
  nav.wave = r.wave
  if (r.won) sfx.play(ANIM.level.stars?.sfx)
  // Le jeton de la partie, pas seulement l'écran courant : quitter pendant le
  // délai puis relancer un niveau ramène sur `play`, et un minuteur périmé
  // jetterait le joueur sur le résultat du niveau précédent.
  const token = playToken
  window.setTimeout(() => {
    if (token !== playToken || router.current !== 'play') return
    router.go(r.won ? 'result' : 'defeat')
  }, END_DELAY_MS)
}

// --- Boucle de simulation ----------------------------------------------------

game.app.ticker.add(() => {
  const w = session.world
  if (!w || router.current !== 'play' || loading) return
  const dtReal = game.app.ticker.deltaMS / 1000
  session.advance(dtReal)
  consumeEvents(w, { fx: game.fxLayer, layout: game.layout, sfx, onLeak: flashLeak })
  tickFloats(dtReal)
  worldView.sync(w, draggedUid())
  refreshChrome()
  if (!ended && (w.phase === 'won' || w.phase === 'lost')) onLevelEnd()
})

if (devLevel !== null) router.go('play', { levelId: devLevel })
else render()
