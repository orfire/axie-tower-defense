// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { createWorld } from '../../src/sim/world'
import { place } from '../../src/sim/placement'
import { computeLayout, unitToPx } from '../../src/render/layout'
import { DragDrop, nearestValidCell, type DragState } from '../../src/ui/dragdrop'
import { startWave } from '../../src/sim/world'

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

/** Événement de pointeur minimal : jsdom n'implémente pas `PointerEvent`. */
function pointer(type: string, x: number, y: number): PointerEvent {
  const e = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true }) as MouseEvent & { pointerId: number }
  e.pointerId = 1
  return e as unknown as PointerEvent
}

describe('tap sur un Axie posé', () => {
  /** Monde avec Olek sur le chemin, plus le harnais de glisser-déposer. */
  function harness() {
    const w = createWorld(1)
    const olek = place(w, 'olek', w.level.path[5])!
    const taps: Array<[number, string]> = []
    const drops: DragState[] = []
    const el = document.createElement('div')
    document.body.appendChild(el)
    const dd = new DragDrop({
      getWorld: () => w,
      getLayout: () => layout,
      axieAt: (cell) => {
        const a = w.axies.find((x) => x.cell[0] === cell[0] && x.cell[1] === cell[1])
        return a ? a.uid : null
      },
      onDrop: (state) => { drops.push(state) },
      onUpdate: () => {},
      onTap: (uid, axieId) => { taps.push([uid, axieId]) },
    })
    dd.attach(el)
    const p = unitToPx(layout, olek.cell[0] + 0.5, olek.cell[1] + 0.5)
    return { w, olek, taps, drops, el, p }
  }

  it('appui et relâchement au même endroit ouvrent la fiche, sans rien déposer', () => {
    const { olek, taps, drops, el, p } = harness()
    el.dispatchEvent(pointer('pointerdown', p.x, p.y))
    // Deux pixels de tremblement : un doigt ne se pose jamais parfaitement immobile.
    window.dispatchEvent(pointer('pointerup', p.x + 2, p.y - 1))
    expect(taps).toEqual([[olek.uid, 'olek']])
    expect(drops).toHaveLength(0)
  })

  it('un vrai glissement dépose et n’ouvre pas de fiche', () => {
    const { taps, drops, el, p } = harness()
    el.dispatchEvent(pointer('pointerdown', p.x, p.y))
    window.dispatchEvent(pointer('pointermove', p.x + 40, p.y + 40))
    window.dispatchEvent(pointer('pointerup', p.x + 40, p.y + 40))
    expect(taps).toHaveLength(0)
    expect(drops).toHaveLength(1)
  })

  it('pendant une vague, l’appui ouvre la fiche sans ouvrir de glissement', () => {
    const { w, olek, taps, drops, el, p } = harness()
    startWave(w)
    el.dispatchEvent(pointer('pointerdown', p.x, p.y))
    expect(taps).toEqual([[olek.uid, 'olek']])
    // Aucun glissement ouvert : sans ça un fantôme et un cercle de portée
    // apparaîtraient en plein combat, et le relâchement tenterait un dépôt.
    expect(drops).toHaveLength(0)
    window.dispatchEvent(pointer('pointerup', p.x, p.y))
    expect(drops).toHaveLength(0)
  })
})
