import { describe, expect, it } from 'vitest'
import { Router } from '../../src/ui/router'

describe('navigation', () => {
  it('démarre sur le titre', () => {
    expect(new Router().current).toBe('title')
  })

  it('prévient les abonnés d’un écran à l’entrée', () => {
    const r = new Router()
    const seen: unknown[] = []
    r.onEnter('brief', (p) => seen.push(p))
    r.go('brief', { levelId: 3 })
    expect(r.current).toBe('brief')
    expect(seen).toEqual([{ levelId: 3 }])
  })

  it('garde une pile de retour', () => {
    const r = new Router()
    r.go('map')
    r.go('brief', { levelId: 1 })
    expect(r.back()).toBe('map')
    expect(r.current).toBe('map')
  })

  it('revient au titre quand la pile est vide', () => {
    const r = new Router()
    expect(r.back()).toBe('title')
  })
})
