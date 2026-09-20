// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../src/data/load'
import { axieCardHtml, enemyCardHtml } from '../src/ui/cards'
import { controlsHtml } from '../src/ui/controls'
import { CLASS_ICON, STATUS_EN, STATUS_GLYPH, injectIconStyles } from '../src/ui/icons'
import { kindAllowsLine } from '../src/sim/placement'
import { emptySave } from '../src/save/storage'
import { titleHtml } from '../src/ui/screens'

/** Analyse la chaîne produite : on interroge le DOM, pas des sous-chaînes. */
function dom(html: string): HTMLElement {
  const d = document.createElement('div')
  d.innerHTML = html
  return d
}

describe('accessibilité', () => {
  it('donne un glyphe et un nom français à chaque statut visible', () => {
    for (const id of ['wet', 'roots', 'feather', 'poison', 'bleed', 'fragile'] as const) {
      expect(STATUS_GLYPH[id], id).toBeTruthy()
      expect(STATUS_EN[id], id).toBeTruthy()
    }
  })

  it('couvre tous les statuts du fichier d’équilibrage', () => {
    // `blocked` et `rage` ne se posent pas sur une chimère : le premier est un
    // état du bloqueur, le second une pile de l'Axie Bête. Ils n'ont pas de
    // pastille à afficher au-dessus d'un ennemi.
    const visible = Object.keys(BALANCE.statuses).filter((k) => k !== 'blocked' && k !== 'rage')
    expect(visible.length).toBeGreaterThan(0)
    for (const id of visible) {
      expect(STATUS_GLYPH[id as keyof typeof STATUS_GLYPH], id).toBeTruthy()
      expect(STATUS_EN[id as keyof typeof STATUS_EN], id).toBeTruthy()
    }
  })

  it('donne un glyphe distinct à chaque statut', () => {
    const glyphes = Object.values(STATUS_GLYPH)
    expect(new Set(glyphes).size).toBe(glyphes.length)
  })

  it('décrit les contrôles, les règles et les appareils', () => {
    const html = controlsHtml()
    expect(html).toContain('Drag')
    expect(html).toContain('hill')
    expect(html).toContain('portrait')
    expect(html).toContain('360')
  })

  it('donne une sortie à la page des contrôles', () => {
    expect(dom(controlsHtml()).querySelector('[data-go="title"]')).not.toBeNull()
  })

  it('ouvre la page des contrôles depuis l’écran de titre', () => {
    // Le règlement demande que les contrôles soient consultables dans le jeu :
    // la page ne sert à rien si aucun écran n'y mène.
    expect(dom(titleHtml(emptySave())).querySelector('[data-go="controls"]')).not.toBeNull()
  })

  it('traduit chaque glyphe de statut dans la légende des contrôles', () => {
    const texte = dom(controlsHtml()).textContent ?? ''
    for (const [id, glyphe] of Object.entries(STATUS_GLYPH)) {
      expect(texte, id).toContain(glyphe)
      expect(texte, id).toContain(STATUS_EN[id as keyof typeof STATUS_EN])
    }
  })

  it('étiquette les fiches sans dépendre de la couleur', () => {
    expect(axieCardHtml('buba')).toContain('Beast')
    expect(enemyCardHtml('wolf-alpha')).toContain('Leader')
  })

  it('donne une icône à chacune des six classes', () => {
    for (const cls of ['beast', 'aquatic', 'plant', 'bird', 'bug', 'reptile']) {
      expect(CLASS_ICON[cls], cls).toMatch(/^data:image\/webp;base64,/)
    }
  })

  it('injecte une règle d’image par classe, jamais une couleur seule', () => {
    injectIconStyles()
    const css = [...document.head.querySelectorAll('style')].map((s) => s.textContent).join('\n')
    for (const cls of Object.keys(CLASS_ICON)) {
      expect(css, cls).toContain(`.ic-${cls}{background-image:`)
    }
  })
})

describe('cases refusées pendant un glissement', () => {
  it('sépare le refus de type du refus d’énergie', () => {
    // La croix des cases invalides se décide sur le type de case, jamais sur le
    // libellé français du refus : un texte reformulé ne doit pas éteindre le
    // marquage sans qu'un test s'en aperçoive.
    expect(kindAllowsLine('path', 'melee')).toBe(true)
    expect(kindAllowsLine('path', 'ranged')).toBe(false)
    expect(kindAllowsLine('plain', 'melee')).toBe(true)
    expect(kindAllowsLine('plain', 'ranged')).toBe(true)
    expect(kindAllowsLine('hill', 'melee')).toBe(false)
    expect(kindAllowsLine('hill', 'ranged')).toBe(true)
  })
})
