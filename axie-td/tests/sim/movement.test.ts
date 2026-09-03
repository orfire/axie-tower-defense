import { describe, expect, it } from 'vitest'
import { createWorld, startWave } from '../../src/sim/world'
import { makeEnemy, spawnDue } from '../../src/sim/spawn'
import { blockLimits, moveEnemies } from '../../src/sim/movement'
import { DT } from '../../src/sim/types'
import { placeTestAxie } from './helpers'

describe('apparition', () => {
  it('sort les ennemis à leur heure, pas avant', () => {
    const w = createWorld(1)
    startWave(w)
    spawnDue(w)
    expect(w.enemies).toHaveLength(1) // le spawn à t = 0
    w.t = 1.4
    spawnDue(w)
    expect(w.enemies).toHaveLength(1) // celui de t = 1.5 n'est pas encore là
    w.t = 1.5
    spawnDue(w)
    expect(w.enemies).toHaveLength(2)
  })
})

describe('déplacement', () => {
  it('avance un slime à sa vitesse et le fait fuir au bout du chemin', () => {
    const w = createWorld(1)
    startWave(w)
    spawnDue(w)
    const slime = w.enemies[0]
    const steps = Math.ceil((w.board.length - 1) / (slime.def.speed * DT))
    for (let i = 0; i < steps; i++) {
      w.t += DT
      moveEnemies(w)
    }
    expect(slime.alive).toBe(false)
    expect(w.lives).toBe(2)
    expect(w.events.some((e) => e.k === 'leak')).toBe(true)
  })

  it('retire 3 PV quand un boss fuit', () => {
    const w = createWorld(8)
    startWave(w)
    w.enemies = [makeEnemy(w, 'bear-dad')]
    w.enemies[0].d = w.board.length - 1
    moveEnemies(w)
    expect(w.lives).toBe(0)
  })
})

describe('blocage', () => {
  it('arrête un ennemi devant le bloqueur', () => {
    const w = createWorld(1)
    placeTestAxie(w, 'olek', w.level.path[6])
    startWave(w)
    spawnDue(w)
    const slime = w.enemies[0]
    for (let i = 0; i < 300; i++) {
      w.t += DT
      moveEnemies(w)
    }
    expect(slime.alive).toBe(true)
    expect(slime.d).toBeCloseTo(5, 5) // s'arrête sur la case 5, le bloqueur est en 6
    expect(slime.blockedBy).toBeGreaterThan(0)
  })

  it('met les suivants en file, une case par ennemi', () => {
    const w = createWorld(1)
    placeTestAxie(w, 'olek', w.level.path[6])
    startWave(w)
    w.t = 10
    spawnDue(w)
    for (let i = 0; i < 600; i++) {
      w.t += DT
      moveEnemies(w)
    }
    const stopped = w.enemies.filter((e) => e.alive).sort((a, b) => b.d - a.d)
    expect(stopped[0].d).toBeCloseTo(5, 5)
    expect(stopped[1].d).toBeCloseTo(4, 5)
    expect(stopped[2].d).toBeCloseTo(3, 5)
  })

  it('libère le passage quand le bloqueur est KO', () => {
    const w = createWorld(1)
    const olek = placeTestAxie(w, 'olek', w.level.path[6])
    startWave(w)
    spawnDue(w)
    for (let i = 0; i < 300; i++) { w.t += DT; moveEnemies(w) }
    expect(blockLimits(w).size).toBe(1)
    olek.ko = true
    expect(blockLimits(w).size).toBe(0)
    for (let i = 0; i < 60; i++) { w.t += DT; moveEnemies(w) }
    expect(w.enemies[0].d).toBeGreaterThan(5)
  })
})
