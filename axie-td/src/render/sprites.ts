import { Assets } from 'pixi.js'
import { Spine } from 'pixi-spine'
import vfxMap from '../../data/vfx-map.json'

type SkeletonKey = string // 'axie:buba' ou 'enemy:wolf-gray'

const loaded = new Map<SkeletonKey, unknown>()

function urlFor(key: SkeletonKey): string {
  const [kind, id] = key.split(':')
  const dir = kind === 'axie' ? 'axies' : 'chimeras'
  return `/spine/${dir}/${id}/skeleton.json`
}

/** Charge les squelettes d'un niveau. À appeler avant d'entrer en jeu. */
export async function loadSkeletons(ids: { axies: string[]; enemies: string[] }): Promise<void> {
  const keys = [
    ...ids.axies.map((a) => `axie:${a}`),
    ...ids.enemies.map((e) => `enemy:${e}`),
  ].filter((k) => !loaded.has(k))
  if (keys.length === 0) return
  const res = await Promise.all(keys.map((k) => Assets.load(urlFor(k))))
  keys.forEach((k, i) => loaded.set(k, res[i]))
}

/** Crée une instance Spine. Les textures sont partagées entre instances. */
export function makeSpine(key: SkeletonKey): Spine {
  const data = loaded.get(key)
  if (!data) throw new Error(`Squelette non chargé : ${key}`)
  return new Spine((data as { spineData: never }).spineData)
}

/**
 * `getCurrent` existe sur chaque implémentation concrète d'AnimationState (une
 * par version de runtime Spine) mais pas sur l'interface générique
 * `IAnimationState` que pixi-spine 4.0.3 expose publiquement sur `Spine.state`.
 * Lacune de déclaration de types, pas un problème d'exécution.
 */
type StateWithCurrent = { getCurrent(track: number): { animation?: { name: string } } | null }

/**
 * Joue une animation si le squelette la possède, sinon la première disponible en repli.
 *
 * Le garde-fou vaut pour toutes les animations, en boucle ou non. Il ne portait
 * d'abord que sur les boucles, ce qui figeait les animations à jouer une fois :
 * `sync` rappelle cette fonction à chaque frame, `setAnimation` crée à chaque
 * appel une nouvelle piste, et l'animation redémarrait donc 60 fois par seconde
 * sans jamais dépasser sa première image. Un Axie KO restait figé.
 *
 * `restart` sert aux appelants qui veulent vraiment rejouer depuis le début,
 * comme une animation d'attaque déclenchée à chaque coup.
 */
export function playAnim(
  spine: Spine,
  name: string,
  loop: boolean,
  fallbacks: string[] = [],
  restart = false,
): void {
  const has = (n: string) => spine.spineData.animations.some((a) => a.name === n)
  const pick = [name, ...fallbacks].find(has)
  if (!pick) return
  const current = (spine.state as unknown as StateWithCurrent).getCurrent(0)
  if (!restart && current && current.animation?.name === pick) return
  spine.state.setAnimation(0, pick, loop)
}

export const ANIM = vfxMap as unknown as {
  axie_attack: Record<string, { spine: string; vfx: string; sfx: string | string[] }>
  axie_idle: { spine: string; random: string[] }
  axie_hit: { spine: string }
  axie_ko: { spine: string; fallback: string }
  axie_place: { spine: string; sfx_by_class: Record<string, string> }
  axie_victory: { spine: string }
  enemy: Record<string, string | { vfx: string; sfx: string | null }>
  status: Record<string, { vfx: string; sfx: string | null }>
  reaction: Record<string, { vfx: string | string[]; sfx: string | null; scale: number }>
  level: Record<string, { sfx?: string | string[]; screen_flash?: number }>
}
