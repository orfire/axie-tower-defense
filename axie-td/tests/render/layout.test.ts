import { describe, expect, it } from 'vitest'
import { computeLayout } from '../../src/render/layout'

describe('mise en page', () => {
  it('donne 55 px de case sur l’écran de référence', () => {
    const l = computeLayout(390, 780)
    expect(l.cell).toBeCloseTo(55, 0)
    expect(l.boardW).toBeCloseTo(l.cell * 7)
    expect(l.boardH).toBeCloseTo(l.cell * 10)
  })

  it('tient sur un petit écran sans descendre sous 43 px', () => {
    const l = computeLayout(360, 640)
    expect(l.cell).toBeGreaterThanOrEqual(43)
    expect(l.hudH + l.boardH + l.trayH + l.barH).toBeLessThanOrEqual(640)
  })

  it('centre le plateau horizontalement sur un écran large', () => {
    const l = computeLayout(1200, 900)
    expect(l.boardX).toBeGreaterThan(0)
    expect(l.boardX * 2 + l.boardW).toBeCloseTo(1200, 0)
  })

  it('réserve toujours 208 px aux barres', () => {
    const l = computeLayout(390, 780)
    expect(l.hudH + l.trayH + l.barH).toBe(208)
  })
})
