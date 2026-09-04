// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { createWorld, startWave } from '../../src/sim/world'
import { runWave } from '../../src/sim/game'
import { place } from '../../src/sim/placement'
import { Session } from '../../src/game/session'
import { emptySave, recordResult } from '../../src/save/storage'
import { draftHtml } from '../../src/ui/screens'
import { Onboarding, draftHint, hintCell, hintsFor } from '../../src/ui/onboarding'

describe('onboarding', () => {
  it('donne au plus trois bulles par niveau', () => {
    for (const level of [1, 2, 3]) {
      const all = [0, 1, 2, 3, 4].flatMap((wave) => hintsFor(level, wave))
      expect(all.length, `niveau ${level}`).toBeLessThanOrEqual(3)
    }
  })

  it('ne dit plus rien à partir du niveau 4', () => {
    expect(hintsFor(4, 0)).toHaveLength(0)
    expect(hintsFor(8, 0)).toHaveLength(0)
  })

  it('demande d’abord de poser un bloqueur sur le chemin', () => {
    const hints = hintsFor(1, 0)
    expect(hints[0].text).toContain('chemin')
    const w = createWorld(1)
    expect(hints[0].done(w)).toBe(false)
    place(w, 'olek', w.level.path[6])
    expect(hints[0].done(w)).toBe(true)
  })

  it('explique les auras à la première vague du niveau 2', () => {
    const hints = hintsFor(2, 0)
    expect(hints[0].text.toLowerCase()).toContain('ralentiss')
  })

  it('n’explique qu’une seule réaction en chaîne', () => {
    const all = [1, 2, 3].flatMap((l) => [0, 1, 2].flatMap((wv) => hintsFor(l, wv)))
    const chain = all.filter((h) => h.text.includes('deux fois'))
    expect(chain).toHaveLength(1)
  })
})

describe('bulle affichée', () => {
  it('n’en montre qu’une à la fois et l’efface au premier geste correct', () => {
    const ob = new Onboarding()
    const w = createWorld(1)

    ob.update(w)
    expect(ob.el.hidden).toBe(false)
    expect(ob.el.textContent).toContain('chemin')

    // Buba est bien un bloqueur : mêlée, et son coût tient dans le budget de la
    // première vague. La case vient du chemin du niveau, jamais d'un choix à l'œil.
    place(w, 'buba', w.level.path[6])
    ob.update(w)
    expect(ob.el.hidden).toBe(false)
    expect(ob.el.textContent).toContain('Lance la vague')

    startWave(w)
    ob.update(w)
    expect(ob.el.hidden).toBe(true)
  })

  it('ne revient pas sur une bulle déjà écartée', () => {
    const ob = new Onboarding()
    const w = createWorld(1)
    ob.update(w)
    place(w, 'buba', w.level.path[6])
    ob.update(w)
    ob.dismiss('l1-launch')
    ob.update(w)
    expect(ob.el.hidden).toBe(true)
  })

  it('oublie tout à reset, pour un niveau rejoué', () => {
    const ob = new Onboarding()
    const w = createWorld(1)
    ob.update(w)
    ob.dismiss('l1-block')
    ob.update(w)
    expect(ob.el.textContent).toContain('Lance la vague')
    ob.reset()
    expect(ob.el.hidden).toBe(true)
    ob.update(createWorld(1))
    expect(ob.el.textContent).toContain('chemin')
  })

  it('passe à la bulle de portée une fois la première vague jouée', () => {
    const ob = new Onboarding()
    const w = createWorld(1)
    place(w, 'buba', w.level.path[6])
    ob.update(w)
    expect(ob.el.textContent).toContain('Lance la vague')
    runWave(w)
    expect(w.waveIndex).toBe(1)
    ob.update(w)
    expect(ob.el.hidden).toBe(false)
    expect(ob.el.textContent).toContain('Momo')
  })

  it('ne montre aucune bulle de plateau au niveau 3', () => {
    const ob = new Onboarding()
    ob.update(createWorld(3))
    expect(ob.el.hidden).toBe(true)
  })

  it('désigne une case du chemin, jamais une case choisie à l’œil', () => {
    const w = createWorld(1)
    const cell = hintCell(hintsFor(1, 0)[0], w.level)
    expect(cell).not.toBeNull()
    expect(w.board.kindAt(cell!)).toBe('path')
    expect(hintCell(hintsFor(1, 0)[1], w.level)).toBeNull()
  })
})

describe('bulle de l’écran de draft', () => {
  it('n’existe qu’au niveau 3', () => {
    expect(draftHint(3)?.text).toContain('chimères')
    expect(draftHint(1)).toBeNull()
    expect(draftHint(2)).toBeNull()
    expect(draftHint(4)).toBeNull()
  })

  it('s’affiche sur l’écran de draft du niveau 3 tant qu’il n’est pas réussi', () => {
    const session = new Session()
    session.save = emptySave()
    const el = document.createElement('div')
    el.innerHTML = draftHtml(session, 3, session.suggestedDraft(3))
    expect(el.querySelector('.draft-hint')?.textContent).toContain('chimères')
  })

  it('disparaît une fois le niveau 3 réussi', () => {
    const session = new Session()
    session.save = recordResult(emptySave(), 3, 2)
    const el = document.createElement('div')
    el.innerHTML = draftHtml(session, 3, session.suggestedDraft(3))
    expect(el.querySelector('.draft-hint')).toBeNull()
  })

  it('ne s’affiche pas sur les autres niveaux', () => {
    const session = new Session()
    session.save = emptySave()
    const el = document.createElement('div')
    el.innerHTML = draftHtml(session, 2, session.suggestedDraft(2))
    expect(el.querySelector('.draft-hint')).toBeNull()
  })
})
