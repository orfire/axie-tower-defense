import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const css = readFileSync(join(process.cwd(), 'src', 'style.css'), 'utf8')

/**
 * Le calque de jeu rend le doigt à tous ses enfants avec `.game-ui > *`. Une
 * règle qui veut rendre un enfant transparent a exactement la même spécificité :
 * elle ne l'emporte que si elle est déclarée APRÈS.
 *
 * Deux enfants couvrent tout l'écran et doivent laisser passer le geste : le
 * voile rouge de fuite et la bulle d'apprentissage. Le voile était déclaré plus
 * haut dans le fichier : `pointer-events: auto` gagnait, il avalait chaque
 * appui, et le jeu déployé était entièrement injouable — ni le bac ni le
 * plateau ne répondaient. Un test de simulation ne l'avait pas vu, parce qu'un
 * événement envoyé directement sur un élément court-circuite le test de survol.
 */
describe('calque de jeu', () => {
  const auto = css.indexOf('.game-ui > * { pointer-events: auto')

  it('rend le doigt aux enfants du calque', () => {
    expect(auto, '.game-ui > * introuvable dans style.css').toBeGreaterThan(-1)
  })

  for (const regle of ['.game-ui > .leak-flash {', '.hint-bubble {']) {
    it(`laisse passer le doigt à travers ${regle.replace(' {', '')}`, () => {
      const i = css.indexOf(regle)
      expect(i, `${regle} absent de style.css`).toBeGreaterThan(-1)
      const bloc = css.slice(i, css.indexOf('}', i))
      expect(bloc, `${regle} doit déclarer pointer-events: none`).toContain('pointer-events: none')
      expect(i, `${regle} doit être déclaré après .game-ui > *, sinon il perd`).toBeGreaterThan(auto)
    })
  }
})
