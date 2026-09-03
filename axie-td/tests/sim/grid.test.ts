import { describe, expect, it } from 'vitest'
import { Board, center, dist, isOrthAdjacent, sameCell } from '../../src/sim/grid'
import { levelDef } from '../../src/data/load'

describe('géométrie', () => {
  it('place le centre d\'une case à un demi-pas', () => {
    expect(center([0, 0])).toEqual({ x: 0.5, y: 0.5 })
    expect(center([3, 6])).toEqual({ x: 3.5, y: 6.5 })
  })

  it('mesure la distance en cases', () => {
    expect(dist(center([0, 0]), center([3, 0]))).toBe(3)
    expect(dist(center([0, 0]), center([3, 4]))).toBe(5)
  })

  it('ne reconnaît que l\'adjacence orthogonale', () => {
    // Les 4 voisins, dans les 4 directions.
    for (const n of [[3, 2], [3, 4], [2, 3], [4, 3]] as const) {
      expect(isOrthAdjacent([3, 3], n), String(n)).toBe(true)
    }
    // Les 4 diagonales : jamais. C'est la règle qui tient tout le système d'auras.
    for (const d of [[2, 2], [4, 4], [2, 4], [4, 2]] as const) {
      expect(isOrthAdjacent([3, 3], d), String(d)).toBe(false)
    }
    // Une case n'est pas sa propre voisine, et rien au-delà d'un pas.
    expect(isOrthAdjacent([3, 3], [3, 3])).toBe(false)
    expect(isOrthAdjacent([3, 3], [3, 5])).toBe(false)
  })

  it('compare deux cases', () => {
    expect(sameCell([3, 4], [3, 4])).toBe(true)
    expect(sameCell([3, 4], [4, 3])).toBe(false)
  })
})

describe('plateau', () => {
  const board = new Board(levelDef(3))

  it('classe chaque case', () => {
    expect(board.kindAt(levelDef(3).path[0])).toBe('path')
    expect(board.kindAt(levelDef(3).hills[0])).toBe('hill')
    expect(board.kindAt([6, 6])).toBe('plain')
    expect(board.kindAt([9, 9])).toBeNull()
  })

  it('donne l\'index d\'une case de chemin, -1 sinon', () => {
    expect(board.pathIndexOf(levelDef(3).path[4])).toBe(4)
    expect(board.pathIndexOf([6, 6])).toBe(-1)
  })

  it('interpole la position le long du chemin', () => {
    const p = levelDef(3).path
    expect(board.posAt(0)).toEqual(center(p[0]))
    expect(board.posAt(1)).toEqual(center(p[1]))
    const half = board.posAt(0.5)
    expect(half.x).toBeCloseTo((center(p[0]).x + center(p[1]).x) / 2, 10)
    expect(half.y).toBeCloseTo((center(p[0]).y + center(p[1]).y) / 2, 10)
  })

  it('borne la progression aux deux extrémités', () => {
    expect(board.posAt(-5)).toEqual(center(levelDef(3).path[0]))
    expect(board.posAt(999)).toEqual(center(levelDef(3).path.at(-1)!))
    expect(board.cellAt(999)).toEqual(levelDef(3).path.at(-1))
  })
})
