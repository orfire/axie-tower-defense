import { describe, expect, it } from 'vitest'
import { createWorld } from '../../src/sim/world'
import { place } from '../../src/sim/placement'
import { computeLayout, unitToPx } from '../../src/render/layout'
import { nearestValidCell } from '../../src/ui/dragdrop'

const layout = computeLayout(390, 780)

describe('aimantation', () => {
  it('aimante sur la case valide la plus proche du doigt', () => {
    const w = createWorld(1)
    // [3, 4] est en plaine au niveau 1. Ne pas choisir une case à l'œil :
    // [4, 5] et [3, 3] sont sur le chemin, où une classe à distance est refusée.
    const target = [3, 4] as const
    const p = unitToPx(layout, target[0] + 0.5, target[1] + 0.5)
    // Le doigt tombe 12 px à côté du centre : ça doit quand même viser cette case.
    const cell = nearestValidCell(w, 'momo', p.x + 12, p.y - 12, layout)
    expect(cell).toEqual([3, 4])
  })

  it('refuse le chemin pour une classe à distance et propose la case valide voisine', () => {
    const w = createWorld(1)
    const onPath = w.level.path[5]
    const p = unitToPx(layout, onPath[0] + 0.5, onPath[1] + 0.5)
    const cell = nearestValidCell(w, 'momo', p.x, p.y, layout)
    expect(cell).not.toBeNull()
    expect(w.board.kindAt(cell!)).not.toBe('path')
  })

  it('ne propose pas une case occupée', () => {
    const w = createWorld(1)
    place(w, 'momo', [3, 4])
    const p = unitToPx(layout, 3.5, 4.5)
    const cell = nearestValidCell(w, 'puffy', p.x, p.y, layout)
    expect(cell).not.toEqual([3, 4])
  })

  it('ne propose rien loin du plateau', () => {
    const w = createWorld(1)
    expect(nearestValidCell(w, 'momo', -400, -400, layout)).toBeNull()
  })
})
