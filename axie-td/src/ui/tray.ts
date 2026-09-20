import { BALANCE, axieDef } from '../data/load'
import { CLASS_EN } from './cards'
import { spentEnergy } from '../sim/placement'
import { currentBudget, type World } from '../sim/world'

/** Bac du draft : les 5 Axies choisis, leur coût, leur état. */
export class Tray {
  readonly el = document.createElement('div')
  private pick?: (axieId: string, px: number, py: number, e: PointerEvent) => void

  constructor() { this.el.className = 'tray' }

  mount(parent: HTMLElement): void { parent.append(this.el) }
  onPick(cb: (axieId: string, px: number, py: number, e: PointerEvent) => void): void { this.pick = cb }

  private slots: HTMLButtonElement[] = []
  private builtFor: string[] = []

  /**
   * Construit les emplacements quand le draft change, puis ne met à jour que ce
   * qui varie.
   *
   * Cette méthode tourne à chaque frame. Tout reconstruire y créerait trois cents
   * boutons par seconde, avec leurs écouteurs, mais surtout le focus clavier serait
   * perdu à chaque image : le bac deviendrait inutilisable sans écran tactile, alors
   * que le concours demande de tester la navigation au clavier. Une référence gardée
   * vers un bouton deviendrait aussi périmée en une frame.
   */
  update(w: World, draft: string[]): void {
    if (this.builtFor.length !== draft.length || this.builtFor.some((id, i) => id !== draft[i])) {
      this.build(draft)
    }

    const left = currentBudget(w) - spentEnergy(w)
    draft.forEach((id, i) => {
      const slot = this.slots[i]
      const def = axieDef(id)
      const cls = def.class === 'dusk' ? 'beast' : def.class
      const cost = BALANCE.classes[cls].cost
      const posed = w.axies.some((a) => a.axieId === id)
      const tooExpensive = !posed && cost > left

      slot.classList.toggle('is-posed', posed)
      slot.classList.toggle('is-dim', tooExpensive)
      slot.disabled = w.phase !== 'placement' || tooExpensive || posed

      // L'étiquette dit pourquoi le bouton est inactif : « indisponible » seul
      // ne renseigne pas, et la couleur ne doit jamais porter l'information.
      const etat = posed ? ', already placed'
        : tooExpensive ? `, too expensive, ${left} energy left`
        : w.phase !== 'placement' ? ', wave running'
        : ''
      const label = `${def.name}, ${CLASS_EN[cls]}, cost ${cost}${etat}`
      if (slot.getAttribute('aria-label') !== label) slot.setAttribute('aria-label', label)
    })
  }

  private build(draft: string[]): void {
    this.builtFor = [...draft]
    this.slots = draft.map((id) => {
      const def = axieDef(id)
      const cls = def.class === 'dusk' ? 'beast' : def.class

      const slot = document.createElement('button')
      slot.type = 'button'
      slot.className = `slot cls-${cls}`
      // Porté par l'emplacement pour que l'appui long, câblé dans main.ts, sache
      // quel Axie ouvrir sans dépendre de l'ordre du bac.
      slot.dataset.axieId = id

      // Éléments construits plutôt qu'une chaîne HTML : le nom d'un Axie viendra
      // du réseau en v2, et rien ne doit pouvoir s'y injecter.
      const cost = document.createElement('span')
      cost.className = 'cost'
      cost.textContent = String(BALANCE.classes[cls].cost)
      const icon = document.createElement('i')
      icon.className = `ic ic-${cls}`
      const name = document.createElement('span')
      name.className = 'nm'
      name.textContent = def.name
      slot.append(cost, icon, name)

      slot.addEventListener('pointerdown', (e) => {
        if (slot.disabled) return
        this.pick?.(id, e.clientX, e.clientY, e)
      })
      return slot
    })
    this.el.replaceChildren(...this.slots)
  }
}
