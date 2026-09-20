import type { Cell, LevelDef } from '../data/types'
import { auraSources } from '../sim/auras'
import type { World } from '../sim/world'

/**
 * Où la bulle se pose.
 *
 * `cell` désigne une case du chemin par son index, jamais par ses coordonnées :
 * les chemins changent d'un niveau à l'autre et une case écrite en dur finit
 * toujours par tomber à côté. `hintCell` fait la conversion.
 *
 * `draft` sort du plateau : c'est la seule bulle qui vit sur un écran HTML, celui
 * du draft (GDD §12). Elle n'est jamais affichée par `Onboarding`.
 */
export type HintAnchor =
  | { at: 'cell'; pathIndex: number }
  | { at: 'launch' }
  | { at: 'board' }
  | { at: 'draft' }

export type Hint = {
  id: string
  level: number
  wave: number
  text: string
  anchor: HintAnchor
  /** La bulle disparaît dès que ceci est vrai : au premier geste correct, pas au bout d'un délai. */
  done: (w: World) => boolean
}

/**
 * Six bulles pour toute la campagne (GDD §12) : trois au niveau 1, deux au
 * niveau 2, une au niveau 3. Au-delà, plus rien — le reste s'apprend par les
 * fiches au tap et par les effets visuels distincts.
 *
 * Les Axies nommés ici sont ceux des drafts imposés des niveaux 1 et 2
 * (`data/levels/01.json` et `02.json`) : Buba, Momo et Puffy au niveau 1, Olek,
 * Pomodoro, Puffy et Momo au niveau 2. Changer un draft imposé sans relire ces
 * textes ferait mentir l'onboarding.
 */
const HINTS: Hint[] = [
  {
    id: 'l1-block', level: 1, wave: 0, anchor: { at: 'cell', pathIndex: 6 },
    text: 'Drag Buba onto the path. He blocks chimeras.',
    done: (w) => w.axies.some((a) => a.pathIndex >= 0),
  },
  {
    id: 'l1-launch', level: 1, wave: 0, anchor: { at: 'launch' },
    text: 'Start the wave when your formation looks right.',
    done: (w) => w.phase !== 'placement' || w.waveIndex > 0,
  },
  {
    id: 'l1-range', level: 1, wave: 1, anchor: { at: 'board' },
    text: 'Momo shoots far. Put him beside the path, where he covers the most tiles.',
    done: (w) => w.axies.some((a) => a.cls === 'bird' && a.pathIndex < 0),
  },
  {
    id: 'l2-aura', level: 2, wave: 0, anchor: { at: 'board' },
    text: 'Tiles next to Olek slow chimeras down.',
    done: (w) => w.axies.some((a) => a.cls === 'plant' && !a.ko),
  },
  {
    id: 'l2-chain', level: 2, wave: 1, anchor: { at: 'board' },
    // Réaction « Enracinement » (balance.json) : l'Insecte qui frappe une cible
    // ralentie par les Racines double la durée de son poison. « Dure deux fois
    // plus longtemps » décrit donc bien `dot_duration_mult`, pas l'aura Essaim,
    // qui elle accélère les ticks. C'est la seule réaction en chaîne expliquée.
    text: 'Pomodoro next to Olek: his poison lasts twice as long.',
    done: (w) => w.axies.some((a) => a.cls === 'bug' && auraSources(w, a).some((s) => s.cls === 'plant')),
  },
  {
    id: 'l3-read', level: 3, wave: 0, anchor: { at: 'draft' },
    text: 'Check the chimeras ahead before you pick your team.',
    done: (w) => w.waveIndex > 0,
  },
]

/** Bulles dues pour un niveau et une vague. Vide à partir du niveau 4. */
export function hintsFor(levelId: number, waveIndex: number): Hint[] {
  return HINTS.filter((h) => h.level === levelId && h.wave === waveIndex)
}

/** Case du plateau désignée par une bulle, `null` si elle n'en désigne aucune. */
export function hintCell(hint: Hint | undefined, level: LevelDef): Cell | null {
  if (!hint || hint.anchor.at !== 'cell') return null
  return level.path[hint.anchor.pathIndex] ?? null
}

/**
 * Bulle de l'écran de draft (GDD §12 : « bulle unique sur l'écran de draft »).
 *
 * Elle ne passe pas par `Onboarding`, qui ne vit que sur le plateau : au moment
 * du draft il n'existe pas encore de `World` à interroger. C'est aussi pourquoi
 * le niveau 3 n'a pas `onboarding: true` dans ses données — ce drapeau ne
 * concerne que les bulles de jeu.
 */
export function draftHint(levelId: number): Hint | null {
  return HINTS.find((h) => h.level === levelId && h.anchor.at === 'draft') ?? null
}

/** Affiche au plus une bulle de plateau à la fois et la retire au premier geste correct. */
export class Onboarding {
  readonly el = document.createElement('div')
  private dismissed = new Set<string>()
  private showing: Hint | null = null

  constructor() {
    this.el.className = 'hint-bubble'
    // Annoncée aux lecteurs d'écran : la bulle apparaît et disparaît sans qu'on
    // la touche, rien d'autre ne signale son contenu.
    this.el.setAttribute('role', 'status')
    this.el.setAttribute('aria-live', 'polite')
    this.el.hidden = true
  }

  mount(parent: HTMLElement): void { parent.append(this.el) }

  /** Efface la mémoire des bulles vues : appelé quand on démarre un niveau. */
  reset(): void {
    this.dismissed.clear()
    this.showing = null
    this.el.hidden = true
    this.el.textContent = ''
  }

  /** Écarte une bulle sans attendre son geste. */
  dismiss(id: string): void {
    this.dismissed.add(id)
    if (this.showing?.id === id) this.showing = null
  }

  /** Bulle affichée à cet instant, pour que le plateau puisse marquer sa case. */
  get current(): Hint | null { return this.showing }

  update(w: World): void {
    if (this.showing && this.showing.done(w)) {
      this.dismissed.add(this.showing.id)
      this.showing = null
    }
    if (!this.showing) {
      this.showing = hintsFor(w.level.id, w.waveIndex)
        .find((h) => h.anchor.at !== 'draft' && !this.dismissed.has(h.id) && !h.done(w)) ?? null
    }
    if (!this.showing) { this.el.hidden = true; return }
    if (this.el.textContent !== this.showing.text) this.el.textContent = this.showing.text
    this.el.dataset.anchor = this.showing.anchor.at
    this.el.hidden = false
  }
}
