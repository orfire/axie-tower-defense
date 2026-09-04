// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { BALANCE, levelDef } from '../../src/data/load'
import { Session, finishLevel } from '../../src/game/session'
import { starsFor } from '../../src/sim/game'
import { DT } from '../../src/sim/types'
import { place, spentEnergy } from '../../src/sim/placement'
import { currentBudget } from '../../src/sim/world'
import { recordResult, totalStars, unlockedAxies } from '../../src/save/storage'

describe('session', () => {
  beforeEach(() => { try { localStorage.clear() } catch { /* ignoré */ } })

  it('propose le draft imposé aux niveaux qui en ont un', () => {
    const s = new Session()
    expect(s.suggestedDraft(1)).toEqual(levelDef(1).draft.forced)
    expect(s.suggestedDraft(2)).toEqual(levelDef(2).draft.forced)
  })

  it('propose cinq Axies disponibles quand le draft est libre', () => {
    const s = new Session()
    expect(levelDef(3).draft.forced).toBeNull()
    const d = s.suggestedDraft(3)
    expect(d).toHaveLength(5)
    const open = new Set(unlockedAxies(s.save))
    for (const id of d) expect(open.has(id)).toBe(true)
  })

  it('repropose le dernier draft joué sur le même niveau', () => {
    const s = new Session()
    const open = unlockedAxies(s.save)
    const choix = [open[1], open[3]]
    s.begin(3, choix)
    expect(new Session().suggestedDraft(3)).toEqual(choix)
  })

  it('annonce les chimères du niveau, sans doublon, avec leur classe', () => {
    const s = new Session()
    const types = s.announcedEnemies(1)
    expect(types.length).toBeGreaterThan(0)
    expect(new Set(types).size).toBe(types.length)
    for (const t of types) expect(s.announcedClass(t)).toBe(BALANCE.enemies[t].class)
    // Une chimère inconnue ne fait pas planter la fiche du niveau.
    expect(s.announcedClass('inexistante')).toBe('beast')
  })

  it('avance la simulation à pas fixe et borne le rattrapage', () => {
    const s = new Session()
    s.begin(1, levelDef(1).draft.forced!)
    s.launchWave()
    s.advance(10) // un onglet resté 10 s en arrière-plan
    expect(s.world!.t).toBeCloseTo(0.5, 6)
    expect(Math.round(s.world!.t / DT)).toBe(15)
  })

  it('ne fait rien avant le lancement de la vague', () => {
    const s = new Session()
    s.begin(1, levelDef(1).draft.forced!)
    s.advance(1)
    expect(s.world!.t).toBe(0)
    expect(s.finish()).toBe(0)
  })

  it('enregistre les étoiles d’une victoire et rien d’une défaite', () => {
    const gagne = new Session()
    gagne.begin(1, levelDef(1).draft.forced!)
    gagne.world!.phase = 'won'
    gagne.world!.lives = BALANCE.level.lives
    expect(gagne.finish()).toBe(starsFor(BALANCE.level.lives))
    expect(gagne.save.stars['1']).toBe(starsFor(BALANCE.level.lives))

    const perdu = new Session()
    perdu.begin(2, levelDef(2).draft.forced!)
    perdu.world!.phase = 'lost'
    expect(perdu.finish()).toBe(0)
    expect(perdu.save.stars['2']).toBe(0)
  })

  it('rejoue le même niveau avec le même draft', () => {
    const s = new Session()
    s.begin(1, levelDef(1).draft.forced!)
    s.launchWave()
    s.advance(0.5)
    const draft = [...s.draft]
    s.retry()
    expect(s.levelId).toBe(1)
    expect(s.draft).toEqual(draft)
    expect(s.world!.t).toBe(0)
    expect(s.world!.phase).toBe('placement')
  })
})

describe('fin de niveau', () => {
  beforeEach(() => { try { localStorage.clear() } catch { /* ignoré */ } })

  it('ne rend rien tant que la partie court', () => {
    const s = new Session()
    expect(finishLevel(s)).toBeNull()
    s.begin(1, levelDef(1).draft.forced!)
    expect(finishLevel(s)).toBeNull()
    s.launchWave()
    expect(finishLevel(s)).toBeNull()
  })

  it('signale l’Axie que la victoire vient d’ouvrir', () => {
    const s = new Session()
    // Xia s'ouvre à 2 étoiles cumulées : une de plus suffit à le faire apparaître.
    s.save = recordResult(s.save, 2, 1)
    s.begin(1, levelDef(1).draft.forced!)
    s.world!.phase = 'won'
    s.world!.lives = 1
    const r = finishLevel(s)!
    expect(r).toMatchObject({ won: true, stars: 1, unlocked: 'xia' })
    expect(totalStars(s.save)).toBe(2)
  })

  it('ne débloque rien quand le seuil n’est pas franchi', () => {
    const s = new Session()
    s.begin(1, levelDef(1).draft.forced!)
    s.world!.phase = 'won'
    s.world!.lives = 1
    expect(finishLevel(s)!.unlocked).toBeNull()
  })

  it('rend la vague atteinte à la défaite, sans étoile', () => {
    const s = new Session()
    s.begin(3, ['buba', 'momo'])
    s.world!.waveIndex = 3
    s.world!.phase = 'lost'
    const r = finishLevel(s)!
    expect(r).toMatchObject({ won: false, stars: 0, wave: 4, unlocked: null })
  })
})

describe('partie complète', () => {
  beforeEach(() => { try { localStorage.clear() } catch { /* ignoré */ } })

  /**
   * Joue le niveau 1 de bout en bout par le chemin que suit le jeu réel :
   * `Session.advance` à pas fixe, une vague après l'autre.
   *
   * C'est le seul test qui couvre l'enchaînement complet placement → vague →
   * fin de niveau depuis la session. Aucune case n'est écrite à la main : elles
   * sont cherchées par type dans le plateau, sinon une case supposée en plaine
   * se révèle sur le chemin et l'Axie à distance ne se pose jamais.
   */
  it('enchaîne les cinq vagues du niveau 1 jusqu’à la fin', () => {
    const s = new Session()
    s.begin(1, levelDef(1).draft.forced!)
    const w = s.world!

    const libre = (c: readonly [number, number]) =>
      !w.axies.some((a) => a.cell[0] === c[0] && a.cell[1] === c[1])

    /** Première case du type demandé, encore libre. */
    function trouve(kind: 'path' | 'plain'): [number, number] {
      for (let row = 0; row < BALANCE.grid.rows; row++) {
        for (let col = 0; col < BALANCE.grid.cols; col++) {
          const c: [number, number] = [col, row]
          if (w.board.kindAt(c) === kind && libre(c)) return c
        }
      }
      throw new Error(`Aucune case ${kind} libre`)
    }

    /**
     * TypeScript garde le type littéral de `w.phase` à travers `launchWave` et
     * `advance`, et signale alors une comparaison impossible (TS2367). Passer par
     * une fonction casse cette déduction, sans rien changer au comportement.
     * Même contournement que dans tests/sim/game.test.ts.
     */
    const phase = (): string => w.phase

    let vagues = 0
    let garde = 0
    while (phase() === 'placement' && vagues < 20) {
      // Buba est en mêlée : il bloque sur le chemin. Momo et Puffy sont à
      // distance : la plaine. Le budget refuse silencieusement le surplus.
      place(w, 'buba', trouve('path'))
      place(w, 'momo', trouve('plain'))
      place(w, 'puffy', trouve('plain'))
      expect(spentEnergy(w)).toBeLessThanOrEqual(currentBudget(w))
      s.launchWave()
      vagues++
      while (phase() === 'wave' && garde++ < 30 * 600) s.advance(DT)
    }

    expect(garde).toBeLessThan(30 * 600) // aucune vague ne s'éternise
    expect(vagues).toBe(levelDef(1).waves.length)
    // Le niveau 1 est le tutoriel : il doit rester gagnable avec une disposition
    // quelconque mais légale. Si un rééquilibrage casse ça, c'est un vrai signal.
    expect(phase()).toBe('won')

    const r = finishLevel(s)!
    expect(r.won).toBe(true)
    expect(s.save.stars['1']).toBe(r.stars)
    expect(finishLevel(s)).not.toBeNull() // le monde reste terminé
  })
})
