import { describe, expect, it } from 'vitest'
import { axieCardHtml, enemyCardHtml } from '../../src/ui/cards'

describe('fiche d’Axie', () => {
  const html = axieCardHtml('xia')

  it('nomme l’Axie, sa classe et son profil', () => {
    expect(html).toContain('Xia')
    expect(html).toContain('Bête')
    expect(html).toContain('DPS')
  })

  it('détaille les 6 parts avec leur classe', () => {
    for (const part of ['Yeux', 'Oreilles', 'Bouche', 'Corne', 'Dos', 'Queue']) {
      expect(html, part).toContain(part)
    }
    expect(html).toContain('Oiseau') // Xia a 2 parts Oiseau
  })

  it('affiche le bonus chiffré apporté par les parts', () => {
    expect(html).toMatch(/\+\d+\s*%/)
  })

  it('décrit l’aura de la classe', () => {
    expect(html).toContain('Fureur')
  })
})

describe('fiche de chimère', () => {
  const html = enemyCardHtml('treant-fighter')

  it('donne classe, PV, armure et comportement', () => {
    expect(html).toContain('Plante')
    expect(html).toContain('350')
    expect(html).toContain('40')
    expect(html).toContain('ligne')
  })
})
