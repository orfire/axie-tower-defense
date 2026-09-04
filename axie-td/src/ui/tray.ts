import { BALANCE, axieDef } from '../data/load'
import { spentEnergy } from '../sim/placement'
import { currentBudget, type World } from '../sim/world'

/** Bac du draft : les 5 Axies choisis, leur coût, leur état. */
export class Tray {
  readonly el = document.createElement('div')
  private pick?: (axieId: string, px: number, py: number) => void

  constructor() { this.el.className = 'tray' }

  mount(parent: HTMLElement): void { parent.append(this.el) }
  onPick(cb: (axieId: string, px: number, py: number) => void): void { this.pick = cb }

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
      slot.setAttribute('aria-label', `${def.name}, ${cls}, coût ${cost}${posed ? ', déjà posé' : ''}`)
      slot.innerHTML = `<span class="cost">${cost}</span><i class="ic ic-${cls}"></i><span class="nm">${def.name}</span>`
      slot.addEventListener('pointerdown', (e) => {
        if (slot.disabled) return
        this.pick?.(id, e.clientX, e.clientY)
      })
      return slot
    }))
  }
}
