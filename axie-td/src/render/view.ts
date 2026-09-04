import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { Spine } from 'pixi-spine'
import type { Tier } from '../data/types'
import type { World } from '../sim/world'
import { center } from '../sim/grid'
import { STATUS_GLYPH } from '../ui/icons'
import type { GameApp } from './app'
import { PALETTE } from './app'
import { unitToPx } from './layout'
import { ANIM, makeSpine, playAnim } from './sprites'

type Visual = {
  root: Container
  spine: Spine
  bar: Graphics
  /** Pastilles de statut, au-dessus de la barre de vie. Vide pour un Axie. */
  status: Text
  facing: number
  /** Hauteur d'affichage voulue, en cases. L'échelle en découle. */
  cells: number
}

/**
 * Style des pastilles de statut.
 *
 * Un glyphe par effet, jamais la couleur seule : c'est l'exigence
 * d'accessibilité du concours, et à 43 px la case un halo coloré autour d'un
 * sprite déjà coloré ne se voit pas. Le contour noir les détache du décor
 * clair comme du sprite. La légende est sur la page « Contrôles ».
 */
const STATUS_STYLE = new TextStyle({
  fontSize: 13,
  fill: 0xffffff,
  stroke: 0x1b221e,
  strokeThickness: 3,
})

/**
 * Les squelettes du kit ne partagent aucune échelle commune : un slime fait 475
 * unités de haut, un loup 801, un ours 1858. Un diviseur fixe donnerait un slime
 * correct et un ours de six cases. On normalise donc chaque squelette sur une
 * hauteur voulue, exprimée en cases, et la hiérarchie visuelle vient de là.
 */
const AXIE_CELLS = 1.0
const ENEMY_CELLS: Record<Tier, number> = { normal: 0.95, miniboss: 1.4, boss: 1.9 }

/**
 * Miroir visuel de l'état de simulation. Ne modifie jamais le monde :
 * il le lit et met à jour des objets d'affichage.
 */
export class WorldView {
  private visuals = new Map<number, Visual>()

  constructor(readonly game: GameApp) {}

  private ensure(uid: number, key: string, cells: number): Visual {
    let v = this.visuals.get(uid)
    if (v) return v
    const root = new Container()
    const spine = makeSpine(key)
    const bar = new Graphics()
    const status = new Text('', STATUS_STYLE)
    status.anchor.set(0.5, 1)
    root.addChild(spine, bar)
    this.game.unitLayer.addChild(root)
    // Hors du conteneur de l'unité pour passer au-dessus des effets : sa
    // position est donc recopiée à chaque trame, et sa destruction explicite.
    this.game.pipLayer.addChild(status)
    v = { root, spine, bar, status, facing: 1, cells }
    this.visuals.set(uid, v)
    return v
  }

  /**
   * Échelle et sens, réappliqués à chaque frame plutôt qu'à la création : la
   * taille de case change au redimensionnement, et le sens de marche à chaque virage.
   */
  private applyScale(v: Visual): void {
    const natural = v.spine.spineData.height || 800
    const s = (v.cells * this.game.layout.cell) / natural
    v.spine.scale.set(s * v.facing, s)
  }

  private drawBar(v: Visual, ratio: number, width: number, color: number): void {
    v.bar.clear()
    if (ratio >= 1) return
    const h = Math.max(3, width * 0.09)
    const y = -width * 0.75
    v.bar.beginFill(0x000000, 0.45).drawRoundedRect(-width / 2, y, width, h, h / 2).endFill()
    v.bar.beginFill(color).drawRoundedRect(-width / 2, y, width * Math.max(0, ratio), h, h / 2).endFill()
  }

  /**
   * Met l'affichage en accord avec l'état du monde. Appelé à chaque frame.
   * `draggedUid` est l'Axie tenu en main, -1 hors glissement : sa case d'origine
   * est masquée pendant le geste, sinon il s'affiche à la fois là et sous le doigt
   * (le fantôme du glissé, dessiné par ailleurs, en devient un doublon).
   */
  sync(world: World, draggedUid = -1): void {
    const layout = this.game.layout
    const c = layout.cell
    const seen = new Set<number>()

    for (const a of world.axies) {
      seen.add(a.uid)
      const v = this.ensure(a.uid, `axie:${a.axieId}`, AXIE_CELLS)
      if (a.uid === draggedUid) { v.root.visible = false; continue }
      v.root.visible = true
      const p = unitToPx(layout, center(a.cell).x, center(a.cell).y)
      // Les squelettes ont leur origine aux pieds : on pose donc l'unité sur le
      // bas de sa case plutôt qu'au centre, sinon elle flotte au-dessus.
      v.root.position.set(p.x, p.y + c * 0.42)
      v.root.alpha = a.ko ? 0.25 : 1
      this.applyScale(v)
      playAnim(v.spine, a.ko ? ANIM.axie_ko.spine : ANIM.axie_idle.spine, !a.ko, [ANIM.axie_ko.fallback])
      this.drawBar(v, a.hp / a.maxHp, c * 0.7, PALETTE.classes[a.cls])
    }

    for (const e of world.enemies) {
      seen.add(e.uid)
      const v = this.ensure(e.uid, `enemy:${e.type}`, ENEMY_CELLS[e.tier])
      const pos = world.board.posAt(e.d)
      const p = unitToPx(layout, pos.x, pos.y)
      // Sens de marche : les sprites Spine sont vus de profil.
      const ahead = world.board.posAt(Math.min(e.d + 0.3, world.board.length - 1))
      if (Math.abs(ahead.x - pos.x) > 1e-6) v.facing = ahead.x >= pos.x ? 1 : -1
      this.applyScale(v)
      v.root.position.set(p.x, p.y + c * 0.42)
      const moving = e.blockedBy < 0
      playAnim(v.spine, moving ? String(ANIM.enemy.walk) : String(ANIM.enemy.attack), true, [String(ANIM.enemy.walk)])
      this.drawBar(v, e.hp / e.maxHp, c * 0.6, 0xff6b6b)

      // Pastilles de statut : un glyphe par effet, jamais la couleur seule.
      // La comparaison évite de régénérer la texture du texte à chaque trame ;
      // sans elle, Pixi redessine et remonte au GPU 60 fois par seconde et par
      // chimère un texte qui n'a pas bougé.
      const glyphs = e.statuses.map((s) => STATUS_GLYPH[s.id]).join('')
      if (v.status.text !== glyphs) v.status.text = glyphs
      v.status.position.set(v.root.x, v.root.y - c * 0.95)
    }

    for (const [uid, v] of this.visuals) {
      if (seen.has(uid)) continue
      v.root.destroy({ children: true })
      v.status.destroy()
      this.visuals.delete(uid)
    }

    this.game.sortUnits()
  }

  clear(): void {
    for (const v of this.visuals.values()) {
      v.root.destroy({ children: true })
      v.status.destroy()
    }
    this.visuals.clear()
  }
}
