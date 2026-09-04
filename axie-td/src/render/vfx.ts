import { AnimatedSprite, Assets, BLEND_MODES, Rectangle, Texture, type Container } from 'pixi.js'

type Point = { x: number; y: number }

type Clip = {
  id: string
  fps: number
  frames: number
  duration: number
  atlas: { file: string; cols: number; rows: number; frameW: number; frameH: number }
  anchor: Point
  /**
   * Positions de l'attaquant et du défenseur au moment de la capture Unity,
   * en pixels dans l'image recadrée. Absentes de quelques atlas de statut,
   * qui n'ont pas de notion d'attaquant.
   */
  captureAttacker?: Point
  captureDefender?: Point
}

const clips = new Map<string, { clip: Clip; textures: Texture[] }>()

/**
 * Réduction appliquée aux effets d'attaque, après mise à l'échelle sur la
 * distance. Seul bouton à tourner si les coups masquent encore les chimères.
 */
const ATTACK_SCALE = 0.6

/** Charge les atlas d'effets d'un niveau. Les autres restent sur le disque. */
export async function loadVfx(ids: string[]): Promise<void> {
  const todo = [...new Set(ids)].filter((id) => !clips.has(id))
  await Promise.all(todo.map(async (id) => {
    const clip = (await (await fetch(`/vfx/${id}/clip.json`)).json()) as Clip
    const base = (await Assets.load(`/vfx/${id}/${clip.atlas.file}`)) as Texture
    const { cols, frameW, frameH } = clip.atlas
    const textures: Texture[] = []
    for (let i = 0; i < clip.frames; i++) {
      const col = i % cols
      const row = Math.floor(i / cols)
      textures.push(new Texture(base.baseTexture, new Rectangle(col * frameW, row * frameH, frameW, frameH)))
    }
    clips.set(id, { clip, textures })
  }))
}

/** Sprite additif ancré sur le point de l'image indiqué, détruit à la fin. */
function makeSprite(clip: Clip, textures: Texture[], anchor: Point): AnimatedSprite {
  const sprite = new AnimatedSprite(textures)
  sprite.anchor.set(anchor.x / clip.atlas.frameW, anchor.y / clip.atlas.frameH)
  sprite.blendMode = BLEND_MODES.ADD
  sprite.animationSpeed = clip.fps / 60
  sprite.loop = false
  sprite.onComplete = () => { sprite.destroy() }
  return sprite
}

/**
 * Joue un effet une fois à la position donnée, en fusion additive.
 * Silencieux si l'atlas n'est pas chargé : un effet manquant ne casse jamais une partie.
 */
export function playVfx(layer: Container, id: string, x: number, y: number, scale = 1): void {
  const entry = clips.get(id)
  if (!entry) return
  const sprite = makeSprite(entry.clip, entry.textures, entry.clip.anchor)
  sprite.position.set(x, y)
  sprite.scale.set(scale)
  layer.addChild(sprite)
  sprite.play()
}

/**
 * Joue un effet d'attaque tendu de l'attaquant vers sa cible.
 *
 * Les atlas d'Origins sont capturés de profil, attaquant à droite et défenseur à
 * gauche ; le projectile dessiné traverse déjà l'image de l'un à l'autre. On
 * ancre donc le sprite sur `captureDefender`, puis on le tourne et on le met à
 * l'échelle pour que `captureAttacker` retombe sur l'Axie : le trait part de
 * l'Axie et arrive sur l'ennemi, quelle que soit leur orientation sur le plateau.
 *
 * L'échelle est bornée puis réduite. À la taille exacte du recadrage, un effet
 * couvre deux à six cases : il masque la chimère qu'on essaie de voir mourir.
 * `ATTACK_SCALE` la ramène à ce qu'il faut pour lire la direction du coup sans
 * perdre la cible de vue. Les bornes, elles, empêchent un corps-à-corps de
 * tomber au sixième de sa taille et une volée d'oiseau de tout envahir.
 */
export function playVfxBetween(layer: Container, id: string, from: Point, to: Point, base = 1): void {
  const entry = clips.get(id)
  if (!entry) return
  const { clip, textures } = entry
  const { captureAttacker: ca, captureDefender: cd } = clip
  if (!ca || !cd) { playVfx(layer, id, to.x, to.y, base); return }

  // Vecteur défenseur → attaquant, dans l'image puis à l'écran.
  const ax = ca.x - cd.x, ay = ca.y - cd.y
  const wx = from.x - to.x, wy = from.y - to.y
  const inImage = Math.hypot(ax, ay), onScreen = Math.hypot(wx, wy)
  if (inImage < 1 || onScreen < 1) { playVfx(layer, id, to.x, to.y, base); return }

  const sprite = makeSprite(clip, textures, cd)
  sprite.position.set(to.x, to.y)
  const span = Math.min(Math.max(onScreen / inImage, base * 0.6), base * 1.6)
  sprite.scale.set(span * ATTACK_SCALE)
  sprite.rotation = Math.atan2(wy, wx) - Math.atan2(ay, ax)
  layer.addChild(sprite)
  sprite.play()
}
