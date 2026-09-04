import { Container, Graphics, Sprite, Texture } from 'pixi.js'
import { BALANCE, axieDef } from '../data/load'
import type { Cell, ClassId } from '../data/types'
import { PALETTE } from '../render/app'
import { COLS, ROWS, cellToPx, unitToPx, type Layout } from '../render/layout'
import { auraSources } from '../sim/auras'
import { center } from '../sim/grid'
import { canPlace, kindAllowsLine } from '../sim/placement'
import type { World } from '../sim/world'
import type { DragState } from './dragdrop'
import { CLASS_ICON } from './icons'

/**
 * Un seul objet Graphics, réutilisé et vidé plutôt que recréé.
 * Ces fonctions tournent à chaque frame et à chaque mouvement du doigt :
 * `removeChildren` détache sans libérer la géométrie GPU, si bien qu'en recréer
 * un à chaque appel épuise la mémoire de la carte en quelques minutes de jeu.
 *
 * `keepBadges` sert aux deux fonctions d'aura, qui posent des Sprite après le
 * Graphics : les détruire à chaque trame en recréerait une vingtaine soixante
 * fois par seconde. Elles les gardent et les recyclent via `badgeAt`.
 */
function reusableGraphics(target: Container, keepBadges = false): Graphics {
  const first = target.children[0]
  if (first instanceof Graphics) {
    // Les enfants ajoutés après le Graphics sont reconstruits à chaque appel :
    // on les libère ici, sauf pour les conteneurs à badges. Pixi refuse
    // `removeChildren(1)` quand il n'y a justement rien après l'index 0
    // (`children.length === 1`, le cas courant tant qu'aucun enfant supplémentaire
    // n'existe) : `range === 0` n'est accepté que sur un conteneur totalement vide,
    // sans quoi `Container.removeChildren` lève un `RangeError`. Constaté à
    // l'exécution : la première trame après une pose plantait silencieusement le
    // gestionnaire de relâchement, laissant le glissé bloqué en plein geste.
    if (!keepBadges && target.children.length > 1) {
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
 * Textures des six emblèmes de classe, décodées une fois pour toutes.
 *
 * Les données URI viennent de `icons.generated.ts` : rien à charger sur le
 * réseau, l'emblème est là dès la première trame.
 */
const iconCache = new Map<string, Texture>()

function iconTexture(cls: ClassId): Texture {
  let t = iconCache.get(cls)
  if (!t) {
    t = Texture.from(CLASS_ICON[cls])
    iconCache.set(cls, t)
  }
  return t
}

/**
 * Badge de classe n° `index` d'un conteneur, créé au besoin et recyclé ensuite.
 * L'index 0 du conteneur est toujours le Graphics de `reusableGraphics`.
 */
function badgeAt(target: Container, index: number): Sprite {
  const existing = target.children[index + 1]
  if (existing instanceof Sprite) return existing
  const s = new Sprite()
  s.anchor.set(0.5)
  target.addChild(s)
  return s
}

/** Masque les badges au-delà de `used` : ils resservent à la trame suivante. */
function hideBadgesFrom(target: Container, used: number): void {
  for (let i = used + 1; i < target.children.length; i++) target.children[i].visible = false
}

/** Les quatre voisines orthogonales. Jamais les diagonales (GDD §5). */
const ORTH = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const

/**
 * Zones d'aura marquées AU SOL, sous les unités.
 *
 * Une aura ne porte que sur les quatre cases orthogonales (GDD §5) : on peint
 * ces cases à la couleur de la classe de l'Axie qui les couvre. C'est la seule
 * façon de lire la portée d'une aura avant de poser un allié dedans — les
 * liserés, eux, n'apparaissent qu'une fois la liaison établie.
 *
 * Un Axie sur une colline n'a pas d'aura (GDD §4) : il ne marque rien.
 *
 * Deux zones peuvent se recouvrir, et la couleur seule ne dit alors pas laquelle
 * est laquelle — ce que le règlement du concours interdit. Chaque case couverte
 * porte donc l'emblème de chacune des classes qui la couvrent : la patte pour
 * Bête, le poisson pour Aquatique, et ainsi de suite. Les emblèmes se lisent à
 * la silhouette, pas à la teinte.
 *
 * Une même classe ne compte qu'une fois par case : c'est l'anti-empilement du
 * GDD §5.3, deux voisins de même classe ne cumulent pas leur aura.
 */
export function drawAuraZones(target: Container, world: World, layout: Layout): void {
  const g = reusableGraphics(target, true)
  const c = layout.cell
  const inset = c * 0.09

  // Classes qui couvrent chaque case, dans l'ordre des Axies : déterministe,
  // donc les emblèmes ne changent pas de place d'une trame à l'autre.
  const cover = new Map<number, ClassId[]>()
  for (const a of world.axies) {
    if (a.ko || a.kind === 'hill') continue
    for (const [dc, dr] of ORTH) {
      const col = a.cell[0] + dc
      const row = a.cell[1] + dr
      if (col < 0 || col >= COLS || row < 0 || row >= ROWS) continue
      const key = row * COLS + col
      const list = cover.get(key)
      if (!list) cover.set(key, [a.cls])
      else if (!list.includes(a.cls)) list.push(a.cls)
    }
  }

  let used = 0
  for (const [key, classes] of cover) {
    const col = key % COLS
    const row = (key - col) / COLS
    const p = cellToPx(layout, col, row)

    for (const cls of classes) {
      const color = PALETTE.classes[cls]
      // Le liseré porte l'essentiel : un remplissage assez opaque pour se voir
      // sur la plaine claire vire au gris sale sur le brun du chemin.
      g.beginFill(color, 0.26)
        .drawRoundedRect(p.x + inset, p.y + inset, c - inset * 2, c - inset * 2, c * 0.22)
        .endFill()
      g.lineStyle(Math.max(1.5, c * 0.045), color, 0.8)
        .drawRoundedRect(p.x + inset, p.y + inset, c - inset * 2, c - inset * 2, c * 0.22)
        .lineStyle(0)
    }

    // Emblèmes alignés en haut de la case, centrés. Quatre au maximum : une case
    // n'a que quatre voisines. La taille se resserre plutôt que de déborder.
    const n = classes.length
    const size = Math.min(c * 0.28, (c - inset * 2 - (n - 1) * 2) / n)
    const y = p.y + inset + size / 2
    const x0 = p.x + c / 2 - ((n - 1) * (size + 2)) / 2
    for (let i = 0; i < n; i++) {
      const badge = badgeAt(target, used++)
      badge.texture = iconTexture(classes[i])
      badge.width = badge.height = size
      badge.position.set(x0 + i * (size + 2), y)
      badge.alpha = 0.95
      badge.visible = true
    }
  }
  hideBadgesFrom(target, used)
}

/**
 * Liserés d'aura, dessinés AU-DESSUS des unités.
 * Ils vivent dans la couche d'effets et non dans celle des surbrillances, sinon
 * les sprites les recouvrent entièrement : deux Axies voisins se touchent presque,
 * et le liseré tombe pile derrière eux. C'est le seul indice non coloré d'une
 * mécanique centrale du jeu, il doit rester visible.
 *
 * L'emblème posé au milieu du liseré dit de quelle classe vient l'aura : entre
 * deux Axies, la couleur du trait ne suffit pas à désigner lequel des deux la
 * donne, et un liaison Bête→Oiseau se lit à l'envers sans lui.
 */
export function drawAuraLinks(target: Container, world: World, layout: Layout): void {
  const g = reusableGraphics(target, true)
  const c = layout.cell
  let used = 0
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
      // L'emblème se décale vers celui qui REÇOIT l'aura, pas au milieu du
      // liseré : deux Axies voisins s'envoient chacun la sienne, et les deux
      // emblèmes se superposeraient exactement au point médian — seul le second
      // dessiné se verrait. Décalé, chaque emblème répond à « qui me nourrit ».
      const at = unitToPx(layout, from.x + (to.x - from.x) * 0.32, from.y + (to.y - from.y) * 0.32)
      const badge = badgeAt(target, used++)
      badge.texture = iconTexture(src.cls)
      badge.width = badge.height = c * 0.3
      badge.position.set(at.x, at.y)
      badge.alpha = 1
      badge.visible = true
    }
  }
  hideBadgesFrom(target, used)
}

/**
 * Cases valides et cercle de portée, dessinés SOUS les unités.
 * Les liserés d'aura, eux, sont dessinés par `drawAuraLinks`, au-dessus.
 */
export function drawOverlay(target: Container, world: World, layout: Layout, drag: DragState): void {
  const g = reusableGraphics(target)
  const c = layout.cell

  if (drag.kind === 'none') return

  // Cases valides pour l'Axie en main, et croix sur celles que son type refuse.
  //
  // Le refus est lu sur le type de case, jamais sur le libellé français du
  // message d'erreur : une case sans énergie ou déjà occupée n'est pas barrée,
  // sinon tout le plateau se raye dès que le budget est épuisé et la croix ne
  // veut plus rien dire. `kindAllowsLine` isole ce test dans `sim/placement`,
  // où un test le couvre.
  const movingUid = drag.kind === 'fromBoard' ? drag.uid : -1
  // `null` pour un Axie Crépuscule, hors v1 : il est refusé partout, et barrer
  // le plateau entier n'apprendrait rien.
  const dragged = axieDef(drag.axieId).class
  const line = dragged === 'dusk' || world.phase !== 'placement'
    ? null
    : BALANCE.classes[dragged].line
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const p = cellToPx(layout, col, row)
      if (canPlace(world, drag.axieId, [col, row], movingUid).ok) {
        g.beginFill(PALETTE.valid, 0.45)
          .drawRoundedRect(p.x + 3, p.y + 3, c - 6, c - 6, c * 0.15)
          .endFill()
        continue
      }
      if (line === null) continue
      const kind = world.board.kindAt([col, row])
      if (kind === null || kindAllowsLine(kind, line)) continue
      const m = c * 0.34
      g.lineStyle(2, 0xff6b6b, 0.35)
        .moveTo(p.x + m, p.y + m).lineTo(p.x + c - m, p.y + c - m)
        .moveTo(p.x + c - m, p.y + m).lineTo(p.x + m, p.y + c - m)
        .lineStyle(0)
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

/**
 * Anneau battant sur la case désignée par une bulle d'onboarding (GDD §12 :
 * « une case du chemin clignote »).
 *
 * Sans lui, « glisse Buba sur le chemin » ne montre aucun endroit : le premier
 * geste du jeu se devine. `phase` va de 0 à 1 et vient de la boucle de rendu —
 * la simulation, elle, n'a pas de temps réel à donner.
 *
 * Blanc et non jaune : le jaune désigne déjà la sortie du chemin.
 */
export function drawHintCell(
  target: Container, cell: Cell | null, layout: Layout, phase: number,
): void {
  const g = reusableGraphics(target)
  if (!cell) return
  const c = layout.cell
  const t = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2)
  const inset = c * (0.05 + 0.06 * t)
  const p = cellToPx(layout, cell[0], cell[1])
  g.lineStyle(Math.max(2, c * 0.055), PALETTE.range, 0.45 + 0.45 * t)
    .drawRoundedRect(p.x + inset, p.y + inset, c - inset * 2, c - inset * 2, c * 0.2)
    .lineStyle(0)
}

/** Portée de base d'un Axie, posé ou encore dans le bac. */
function rangeOf(world: World, axieId: string): number {
  const posed = world.axies.find((x) => x.axieId === axieId)
  if (posed) return posed.baseRange
  const cls = axieDef(axieId).class
  return cls === 'dusk' ? 1 : BALANCE.classes[cls].range
}
