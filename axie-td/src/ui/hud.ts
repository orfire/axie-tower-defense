import { BALANCE } from '../data/load'
import { spentEnergy } from '../sim/placement'
import { currentBudget, type World } from '../sim/world'

/** Barre haute : PV du niveau, vague en cours, énergie, mute. */
export class Hud {
  readonly el = document.createElement('div')
  private hearts = document.createElement('span')
  private wave = document.createElement('span')
  private energy = document.createElement('span')
  readonly muteBtn = document.createElement('button')

  constructor() {
    this.el.className = 'hud'
    this.hearts.className = 'hud-hearts'
    this.wave.className = 'hud-wave'
    this.energy.className = 'hud-energy'
    this.muteBtn.className = 'hud-mute'
    this.muteBtn.type = 'button'
    this.muteBtn.setAttribute('aria-label', 'Couper le son')
    this.muteBtn.textContent = '♪'
    const right = document.createElement('span')
    right.className = 'hud-right'
    right.append(this.energy, this.muteBtn)
    this.el.append(this.hearts, this.wave, right)
  }

  mount(parent: HTMLElement): void { parent.append(this.el) }

  update(w: World): void {
    const max = BALANCE.level.lives
    // Le nombre est écrit à côté des cœurs : l'information ne passe pas que par la couleur.
    this.hearts.textContent = '♥'.repeat(Math.max(0, w.lives)) + '♡'.repeat(Math.max(0, max - w.lives))
    this.hearts.setAttribute('aria-label', `${Math.max(0, w.lives)} points de vie sur ${max}`)
    this.wave.textContent = `Vague ${Math.min(w.waveIndex + 1, w.level.waves.length)}/${w.level.waves.length}`
    this.energy.textContent = `⚡ ${currentBudget(w) - spentEnergy(w)}/${currentBudget(w)}`
  }
}
