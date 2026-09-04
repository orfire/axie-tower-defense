import type { Container } from 'pixi.js'
import type { Sfx } from '../audio/sfx'
import { center } from '../sim/grid'
import type { World } from '../sim/world'
import { unitToPx, type Layout } from './layout'
import { spawnFloat } from './floats'
import { ANIM } from './sprites'
import { playVfx } from './vfx'

export type EffectCtx = {
  fx: Container
  layout: Layout
  sfx: Sfx
  /** Appelé quand un ennemi sort : flash rouge et vibration. */
  onLeak: () => void
}

/**
 * Position écran d'un événement.
 *
 * On préfère toujours celle que l'événement transporte : un ennemi tué a déjà
 * quitté la liste quand le rendu lit les événements, et la recherche par
 * identifiant ne trouverait rien. La recherche ne sert que pour les événements
 * sans position, comme une attaque d'ennemi visant un Axie.
 */
function posOf(world: World, uid: number, layout: Layout, at?: { x: number; y: number }) {
  if (at) return unitToPx(layout, at.x, at.y)
  const a = world.axies.find((x) => x.uid === uid)
  if (a) { const c = center(a.cell); return unitToPx(layout, c.x, c.y) }
  const e = world.enemies.find((x) => x.uid === uid)
  if (e) { const p = world.board.posAt(e.d); return unitToPx(layout, p.x, p.y) }
  return null
}

/**
 * Traduit les événements de la simulation en images et en sons, puis vide la file.
 * Ne modifie jamais l'état du jeu.
 */
export function consumeEvents(world: World, ctx: EffectCtx): void {
  for (const ev of world.events) {
    switch (ev.k) {
      case 'attack': {
        const anim = ANIM.axie_attack[ev.cls]
        const p = posOf(world, ev.to, ctx.layout, ev.at)
        if (p && anim) {
          playVfx(ctx.fx, anim.vfx, p.x, p.y, ctx.layout.cell / 180)
          ctx.sfx.play(anim.sfx)
        }
        break
      }
      case 'damage': {
        const p = posOf(world, ev.uid, ctx.layout, ev.at)
        if (p) spawnFloat(ctx.fx, ev.amount, p.x, p.y - ctx.layout.cell * 0.3, ev.kind)
        break
      }
      case 'status': {
        const p = posOf(world, ev.uid, ctx.layout, ev.at)
        const s = ANIM.status[ev.id]
        if (p && s) { playVfx(ctx.fx, s.vfx, p.x, p.y, ctx.layout.cell / 200); ctx.sfx.play(s.sfx) }
        break
      }
      case 'reaction': {
        const p = posOf(world, ev.uid, ctx.layout, ev.at)
        const r = ANIM.reaction[ev.id]
        if (p && r) {
          const list = Array.isArray(r.vfx) ? r.vfx : [r.vfx]
          for (const v of list) playVfx(ctx.fx, v, p.x, p.y, (ctx.layout.cell / 180) * r.scale)
          ctx.sfx.play(r.sfx)
        }
        break
      }
      case 'leak':
        ctx.onLeak()
        ctx.sfx.play(ANIM.level.leak?.sfx)
        break
      case 'waveEnd':
        ctx.sfx.play(ANIM.level.wave_start?.sfx)
        break
      default:
        break
    }
  }
  world.events.length = 0
}
