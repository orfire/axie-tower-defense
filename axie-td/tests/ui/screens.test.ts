// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { LEVELS, MAX_STARS, PLAYABLE, levelDef } from '../../src/data/load'
import { Session } from '../../src/game/session'
import { emptySave, recordResult, unlockedAxies } from '../../src/save/storage'
import {
  briefHtml, collectionHtml, defeatHtml, draftHtml, mapHtml, pathThumb, resultHtml, titleHtml,
} from '../../src/ui/screens'

/** Analyse la chaîne produite : on interroge le DOM, pas des sous-chaînes. */
function dom(html: string): HTMLElement {
  const d = document.createElement('div')
  d.innerHTML = html
  return d
}

describe('écran de titre', () => {
  it('mène au jeu et à la collection, et affiche le total d’étoiles', () => {
    const el = dom(titleHtml(recordResult(emptySave(), 1, 2)))
    expect(el.querySelector('[data-go="map"]')).not.toBeNull()
    expect(el.querySelector('[data-go="collection"]')).not.toBeNull()
    expect(el.textContent).toContain(`2 étoiles sur ${MAX_STARS}`)
  })
})

describe('carte de campagne', () => {
  it('n’ouvre que le premier niveau sur une partie neuve', () => {
    const el = dom(mapHtml(emptySave()))
    const boutons = [...el.querySelectorAll<HTMLButtonElement>('.level')]
    expect(boutons).toHaveLength(LEVELS.length)
    expect(boutons[0].disabled).toBe(false)
    expect(boutons[0].dataset.level).toBe('1')
    expect(boutons.slice(1).every((b) => b.disabled)).toBe(true)
  })

  it('ouvre le niveau suivant une fois le précédent réussi', () => {
    const el = dom(mapHtml(recordResult(emptySave(), 1, 2)))
    const boutons = [...el.querySelectorAll<HTMLButtonElement>('.level')]
    expect(boutons[1].disabled).toBe(false)
    expect(boutons[2].disabled).toBe(true)
  })

  it('dit en toutes lettres ce qui est verrouillé, sans compter sur la couleur', () => {
    const el = dom(mapHtml(emptySave()))
    const boutons = [...el.querySelectorAll<HTMLButtonElement>('.level')]
    expect(boutons[1].textContent).toContain('Verrouillé')
    expect(boutons[1].getAttribute('aria-label')).toContain('verrouillé')
  })
})

describe('fiche du niveau', () => {
  const session = new Session()

  it('montre le chemin en miniature', () => {
    const el = dom(pathThumb(levelDef(3)))
    const trace = el.querySelector('polyline')!
    expect(trace.getAttribute('points')!.split(' ')).toHaveLength(levelDef(3).path.length)
    // Une colline dessinée par niveau qui en a une.
    expect(el.querySelectorAll('rect')).toHaveLength(1 + levelDef(3).hills.length)
  })

  it('annonce les chimères avec le nom de leur classe, pas seulement sa couleur', () => {
    const el = dom(briefHtml(session, 3))
    const items = [...el.querySelectorAll('.enemy-list li')]
    expect(items).toHaveLength(session.announcedEnemies(3).length)
    for (const li of items) expect(li.querySelector('em')!.textContent).toBeTruthy()
    expect(el.querySelector('svg.thumb')).not.toBeNull()
    expect(el.querySelector('[data-draft="3"]')).not.toBeNull()
  })
})

describe('draft', () => {
  beforeEach(() => { try { localStorage.clear() } catch { /* ignoré */ } })

  it('affiche cinq emplacements et remplit ceux qui sont choisis', () => {
    const s = new Session()
    const el = dom(draftHtml(s, 3, [unlockedAxies(s.save)[0], unlockedAxies(s.save)[1]]))
    expect(el.querySelectorAll('.pick')).toHaveLength(5)
    expect(el.querySelectorAll('[data-unpick]')).toHaveLength(2)
    expect(el.querySelectorAll('.pick.is-empty')).toHaveLength(3)
  })

  it('ne propose que les Axies débloqués', () => {
    const s = new Session()
    const el = dom(draftHtml(s, 3, []))
    expect(el.querySelectorAll('[data-pick]')).toHaveLength(unlockedAxies(s.save).length)
  })

  it('refuse de lancer sans aucun Axie', () => {
    const s = new Session()
    expect(dom(draftHtml(s, 3, [])).querySelector<HTMLButtonElement>('[data-play]')!.disabled).toBe(true)
    const un = [unlockedAxies(s.save)[0]]
    expect(dom(draftHtml(s, 3, un)).querySelector<HTMLButtonElement>('[data-play]')!.disabled).toBe(false)
  })

  it('signale une équipe imposée', () => {
    const s = new Session()
    expect(dom(draftHtml(s, 1, s.suggestedDraft(1))).textContent).toContain('imposée')
    expect(dom(draftHtml(s, 3, s.suggestedDraft(3))).textContent).not.toContain('imposée')
  })
})

describe('résultat', () => {
  it('affiche les étoiles obtenues et mène au niveau suivant', () => {
    const el = dom(resultHtml(1, 3, recordResult(emptySave(), 1, 3), null))
    expect(el.querySelector('.big-stars')!.textContent).toBe('★★★')
    expect(el.querySelector('[data-level="2"]')).not.toBeNull()
    expect(el.querySelector('[data-retry="1"]')).not.toBeNull()
  })

  it('ne propose pas de suite après le dernier niveau', () => {
    const dernier = LEVELS.at(-1)!.id
    const el = dom(resultHtml(dernier, 2, emptySave(), null))
    expect(el.querySelector('[data-level]')).toBeNull()
    expect(el.textContent).toContain('Campagne terminée')
  })

  it('montre la fiche de l’Axie débloqué', () => {
    const el = dom(resultHtml(1, 2, recordResult(emptySave(), 1, 2), 'xia'))
    expect(el.querySelector('.unlock')!.textContent).toContain('Xia')
  })
})

describe('défaite', () => {
  it('dit à quelle vague les chimères sont passées et laisse changer le draft', () => {
    const el = dom(defeatHtml(3, 2))
    expect(el.textContent).toContain(`vague 2 sur ${levelDef(3).waves.length}`)
    expect(el.querySelector('[data-retry="3"]')).not.toBeNull()
    expect(el.querySelector('[data-draft="3"]')).not.toBeNull()
    expect(el.querySelector('[data-go="map"]')).not.toBeNull()
  })
})

describe('collection', () => {
  it('liste tous les Axies jouables, débloqués ou en silhouette', () => {
    const el = dom(collectionHtml(emptySave()))
    expect(el.querySelectorAll('[data-card]')).toHaveLength(6)
    expect(el.querySelectorAll('.collect')).toHaveLength(PLAYABLE.length)
    expect(el.querySelector('.collect.is-locked')!.textContent).toContain('★')
  })

  it('ouvre les Axies au fur et à mesure des étoiles', () => {
    const el = dom(collectionHtml(recordResult(emptySave(), 1, 3)))
    expect(el.querySelectorAll('[data-card]')).toHaveLength(8) // 6 de départ + Xia (2 ★) + Ena (3 ★)
  })
})
