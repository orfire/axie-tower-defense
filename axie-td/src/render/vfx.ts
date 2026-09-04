import { AnimatedSprite, Assets, BLEND_MODES, Rectangle, Texture, type Container } from 'pixi.js'

type Clip = {
  id: string
  fps: number
  frames: number
  duration: number
  atlas: { file: string; cols: number; rows: number; frameW: number; frameH: number }
  anchor: { x: number; y: number }
}

const clips = new Map<string, { clip: Clip; textures: Texture[] }>()

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

/**
 * Joue un effet une fois à la position donnée, en fusion additive.
 * Silencieux si l'atlas n'est pas chargé : un effet manquant ne casse jamais une partie.
 */
export function playVfx(layer: Container, id: string, x: number, y: number, scale = 1): void {
  const entry = clips.get(id)
  if (!entry) return
  const { clip, textures } = entry
  const sprite = new AnimatedSprite(textures)
  sprite.anchor.set(clip.anchor.x / clip.atlas.frameW, clip.anchor.y / clip.atlas.frameH)
  sprite.blendMode = BLEND_MODES.ADD
  sprite.position.set(x, y)
  sprite.scale.set(scale)
  sprite.animationSpeed = clip.fps / 60
  sprite.loop = false
  sprite.onComplete = () => { sprite.destroy() }
  layer.addChild(sprite)
  sprite.play()
}
