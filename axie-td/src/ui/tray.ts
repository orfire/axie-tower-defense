import { BALANCE, axieDef } from '../data/load'
import { spentEnergy } from '../sim/placement'
import { currentBudget, type World } from '../sim/world'

/** Bac du draft : les 5 Axies choisis, leur coût, leur état. */
export class Tray {
  readonly el = document.createElement('div')
  private pick?: (axieId: string, px: number, py: number, e: PointerEvent) => void

  constructor() { this.el.className = 'tray' }

  mount(parent: HTMLElement): void { parent.append(this.el) }
  onPick(cb: (axieId: string, px: number, py: number, e: PointerEvent) => void): void { this.pick = cb }

  update(w: World, draft: string[]): void {
    const left = currentBudget(w) - spentEnergy(w)
    this.el.replaceChildren(...draft.map((id) => {
      const def = axieDef(id)
      const cls = def.class === 'dusk' ? 'beast' : def.class
      const cost = BALANCE.classes[cls].cost
      const posed = w.axies.some((a) => a.axieId === id)
      const tooExpensive = !posed && cost > left

      const slot = document.createElement('button')
      slot.type = 'button'
      slot.className = `slot cls-${cls}${posed ? ' is-posed' : ''}${tooExpensive ? ' is-dim' : ''}`
      slot.disabled = w.phase !== 'placement' || tooExpensive || posed
      // L'étiquette dit pourquoi le bouton est inactif : « indisponible » seul
      // ne renseigne pas, et la couleur ne doit jamais porter l'information.
      const etat = posed ? ', déjà posé'
        : tooExpensive ? `, trop cher, il reste ${left} d'énergie`
        : w.phase !== 'placement' ? ', vague en cours'
        : ''
      slot.setAttribute('aria-label', `${def.name}, ${cls}, coût ${cost}${etat}`)
      slot.innerHTML = `<span class="cost">${cost}</span><i class="ic ic-${cls}"></i><span class="nm">${def.name}</span>`
      // Porté par l'emplacement pour que l'appui long (câblé dans main.ts) sache
      // quel Axie ouvrir, sans dépendre de l'ordre du bac.
      slot.dataset.axieId = id
      slot.addEventListener('pointerdown', (e) => {
        if (slot.disabled) return
        this.pick?.(id, e.clientX, e.clientY, e)
      })
      return slot
    }))
  }
}
