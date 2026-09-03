import { describe, expect, it } from 'vitest'
import { AXIES, BALANCE, LEVELS, MAX_STARS, PLAYABLE, axieDef, levelDef } from '../src/data/load'

describe('données', () => {
  it('charge 20 Axies dont 19 jouables', () => {
    expect(AXIES).toHaveLength(20)
    expect(PLAYABLE).toHaveLength(19)
  })

  it('donne 6 Axies au départ, un par classe', () => {
    const start = PLAYABLE.filter((a) => a.unlock.type === 'start')
    expect(start).toHaveLength(6)
    expect(new Set(start.map((a) => a.class)).size).toBe(6)
  })

  it('charge 8 niveaux et 24 étoiles au maximum', () => {
    expect(LEVELS).toHaveLength(8)
    expect(MAX_STARS).toBe(24)
  })

  it('déclare 6 classes et 20 chimères', () => {
    expect(Object.keys(BALANCE.classes)).toHaveLength(6)
    expect(Object.keys(BALANCE.enemies)).toHaveLength(20)
  })

  it('rend le triangle cohérent : chaque classe bat exactement deux classes', () => {
    for (const [cls, beaten] of Object.entries(BALANCE.triangle.beats)) {
      expect(beaten, cls).toHaveLength(2)
      expect(beaten).not.toContain(cls)
    }
  })

  it('utilise un pas fixe de 30 Hz sans aléa', () => {
    expect(BALANCE.sim.tick_hz).toBe(30)
    expect(BALANCE.sim.no_randomness).toBe(true)
  })

  it('lève une erreur nommée sur un identifiant inconnu', () => {
    expect(() => axieDef('inconnu')).toThrow('Axie inconnu : inconnu')
    expect(() => levelDef(99)).toThrow('Niveau inconnu : 99')
  })

  it('ne référence que des chimères connues dans les vagues', () => {
    for (const level of LEVELS) {
      for (const wave of level.waves) {
        for (const spawn of wave.spawns) {
          expect(BALANCE.enemies[spawn.enemy], `${level.id}/${spawn.enemy}`).toBeDefined()
        }
      }
    }
  })
})
