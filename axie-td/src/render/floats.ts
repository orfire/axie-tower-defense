import { Container, Text, TextStyle } from 'pixi.js'

const STYLES: Record<string, TextStyle> = {
  normal: new TextStyle({ fontFamily: 'Fredoka, sans-serif', fontSize: 16, fontWeight: '700', fill: 0xffffff, stroke: 0x000000, strokeThickness: 3 }),
  crit: new TextStyle({ fontFamily: 'Fredoka, sans-serif', fontSize: 22, fontWeight: '700', fill: 0xffd23f, stroke: 0x000000, strokeThickness: 4 }),
  poison: new TextStyle({ fontFamily: 'Fredoka, sans-serif', fontSize: 13, fontWeight: '700', fill: 0x8be26a, stroke: 0x000000, strokeThickness: 3 }),
  bleed: new TextStyle({ fontFamily: 'Fredoka, sans-serif', fontSize: 13, fontWeight: '700', fill: 0xff8080, stroke: 0x000000, strokeThickness: 3 }),
}

type Float = { text: Text; life: number }
const alive: Float[] = []

/** Nombre de dégâts qui monte et disparaît en 0,8 s. */
export function spawnFloat(layer: Container, value: number, x: number, y: number, kind = 'normal'): void {
  if (value < 0.5) return // les DoT tickent 30 fois par seconde : on n'affiche pas la poussière
  const text = new Text(`-${Math.round(value)}`, STYLES[kind] ?? STYLES.normal)
  text.anchor.set(0.5, 1)
  text.position.set(x, y)
  layer.addChild(text)
  alive.push({ text, life: 0 })
}

/** À appeler chaque frame avec le temps réel écoulé. */
export function tickFloats(dt: number): void {
  for (let i = alive.length - 1; i >= 0; i--) {
    const f = alive[i]
    f.life += dt
    f.text.y -= 28 * dt
    f.text.alpha = Math.max(0, 1 - f.life / 0.8)
    if (f.life >= 0.8) {
      f.text.destroy()
      alive.splice(i, 1)
    }
  }
}
