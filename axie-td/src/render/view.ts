import { Container, Graphics } from 'pixi.js'
import type { Spine } from 'pixi-spine'
import type { World } from '../sim/world'
import { center } from '../sim/grid'
import type { GameApp } from './app'
import { PALETTE } from './app'
import { unitToPx } from './layout'
import { ANIM, makeSpine, playAnim } from './sprites'

type Visual = {
  root: Container
  spine: Spine
  bar: Graphics
  facing: number
}

/**
 * Miroir visuel de l'état de simulation. Ne modifie jamais le monde :
 * il le lit et met à jour des objets d'affichage.
 */
export class WorldView {
  private visuals = new Map<number, Visual>()

  constructor(readonly game: GameApp) {}

  private ensure(uid: number, key: string, scale: number): Visual {
    let v = this.visuals.get(uid)
    if (v) return v
    const root = new Container()
    const spine = makeSpine(key)
    spine.scale.set(scale)
    const bar = new Graphics()
    root.addChild(spine, bar)
    this.game.unitLayer.addChild(root)
    v = { root, spine, bar, facing: 1 }
    this.visuals.set(uid, v)
    return v
  }

  private drawBar(v: Visual, ratio: number, width: number, color: number): void {
    v.bar.clear()
    if (ratio >= 1) return
    const h = Math.max(3, width * 0.09)
    const y = -width * 0.75
    v.bar.beginFill(0x000000, 0.45).drawRoundedRect(-width / 2, y, width, h, h / 2).endFill()
    v.bar.beginFill(color).drawRoundedRect(-width / 2, y, width * Math.max(0, ratio), h, h / 2).endFill()
  }

  /** Met l'affichage en accord avec l'état du monde. Appelé à chaque frame. */
  sync(world: World): void {
    const layout = this.game.layout
    const c = layout.cell
    const seen = new Set<number>()

    for (const a of world.axies) {
      seen.add(a.uid)
      const v = this.ensure(a.uid, `axie:${a.axieId}`, (c * 0.9) / 220)
      const p = unitToPx(layout, center(a.cell).x, center(a.cell).y)
      v.root.position.set(p.x, p.y + c * 0.32)
      v.root.alpha = a.ko ? 0.25 : 1
      v.spine.scale.x = Math.abs(v.spine.scale.x) * v.facing
      playAnim(v.spine, a.ko ? ANIM.axie_ko.spine : ANIM.axie_idle.spine, !a.ko, [ANIM.axie_ko.fallback])
      this.drawBar(v, a.hp / a.maxHp, c * 0.7, PALETTE.classes[a.cls])
    }

    for (const e of world.enemies) {
      seen.add(e.uid)
      const v = this.ensure(e.uid, `enemy:${e.type}`, (c * 0.85) / 240)
      const pos = world.board.posAt(e.d)
      const p = unitToPx(layout, pos.x, pos.y)
      // Sens de marche : les sprites Spine sont vus de profil.
      const ahead = world.board.posAt(Math.min(e.d + 0.3, world.board.length - 1))
      if (Math.abs(ahead.x - pos.x) > 1e-6) v.facing = ahead.x >= pos.x ? 1 : -1
      v.spine.scale.x = Math.abs(v.spine.scale.x) * v.facing
      v.root.position.set(p.x, p.y + c * 0.3)
      const moving = e.blockedBy < 0
      playAnim(v.spine, moving ? String(ANIM.enemy.walk) : String(ANIM.enemy.attack), true, [String(ANIM.enemy.walk)])
      this.drawBar(v, e.hp / e.maxHp, c * 0.6, 0xff6b6b)
    }

    for (const [uid, v] of this.visuals) {
      if (seen.has(uid)) continue
      v.root.destroy({ children: true })
      this.visuals.delete(uid)
    }

    this.game.sortUnits()
  }

  clear(): void {
    for (const v of this.visuals.values()) v.root.destroy({ children: true })
    this.visuals.clear()
  }
}
