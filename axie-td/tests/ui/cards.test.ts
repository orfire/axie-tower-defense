import { describe, expect, it } from 'vitest'
import { BALANCE } from '../../src/data/load'
import { ENEMY_EN, axieCardHtml, enemyCardHtml } from '../../src/ui/cards'

describe('fiche d’Axie', () => {
  const html = axieCardHtml('xia')

  it('nomme l’Axie, sa classe et son profil', () => {
    expect(html).toContain('Xia')
    expect(html).toContain('Beast')
    expect(html).toContain('DPS')
  })

  it('détaille les 6 parts avec leur classe', () => {
    for (const part of ['Eyes', 'Ears', 'Mouth', 'Horn', 'Back', 'Tail']) {
      expect(html, part).toContain(part)
    }
    expect(html).toContain('Bird') // Xia a 2 parts Oiseau
  })

  it('affiche le bonus chiffré apporté par les parts', () => {
    expect(html).toMatch(/\+\d+\s*%/)
  })

  it('décrit l’aura de la classe', () => {
    expect(html).toContain('Fury')
  })

  it('tire ses chiffres des données et non d’une recopie', () => {
    // La tâche 20 modifiera balance.json en boucle. Si la fiche recopiait ses
    // valeurs, elle mentirait sur le lien traits → jeu dès le premier ajustement,
    // et c'est précisément ce lien que le concours note à 35 %.
    const bonus = BALANCE.parts_bonus.bird.rate!
    expect(html).toContain(`+${Math.round(bonus * 100)}% attack speed`)

    const fury = BALANCE.auras.fury.value!
    expect(axieCardHtml('buba')).toContain(`+${Math.round((fury - 1) * 100)}% damage`)
  })
})

describe('fiche de chimère', () => {
  const html = enemyCardHtml('treant-fighter')

  it('donne classe, PV, armure et comportement', () => {
    expect(html).toContain('Plant')
    expect(html).toContain('350')
    expect(html).toContain('40')
    expect(html).toContain('Line breaker')
  })
})

describe('noms de chimères', () => {
  it('donne un nom français à chaque chimère du jeu', () => {
    for (const type of Object.keys(BALANCE.enemies)) {
      expect(ENEMY_EN[type], type).toBeTruthy()
      // Les identifiants du kit sont en anglais et à tirets : le nom affiché
      // ne doit jamais être une simple recopie.
      expect(ENEMY_EN[type], type).not.toBe(type)
    }
  })

  it('affiche ce nom sur la fiche plutôt que l’identifiant', () => {
    const html = enemyCardHtml('wolf-aquatic-alpha')
    expect(html).toContain('Marsh Alpha')
    expect(html).not.toContain('wolf-aquatic-alpha')
  })
})
