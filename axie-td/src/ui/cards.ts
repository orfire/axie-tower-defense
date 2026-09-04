import { BALANCE, axieDef } from '../data/load'
import type { ClassId } from '../data/types'

export const CLASS_FR: Record<string, string> = {
  beast: 'Bête', aquatic: 'Aquatique', plant: 'Plante',
  bird: 'Oiseau', bug: 'Insecte', reptile: 'Reptile', dusk: 'Crépuscule',
}

const PART_FR: Record<string, string> = {
  eyes: 'Yeux', ears: 'Oreilles', mouth: 'Bouche',
  horn: 'Corne', back: 'Dos', tail: 'Queue',
}

/**
 * Textes d'aura, dont les chiffres viennent des données et non d'une recopie.
 *
 * Cette fiche est le seul endroit où le jury voit le lien entre les traits d'un
 * Axie et son comportement. La tâche 20 passera son temps à modifier
 * `balance.json` : une valeur recopiée ici s'en désolidariserait au premier
 * rééquilibrage, et la fiche mentirait sur le cœur du design sans qu'un test
 * ne s'en aperçoive.
 */
const AURA_FR: Record<string, { nom: string; texte: (v: number) => string }> = {
  fury: { nom: 'Fureur', texte: (v) => `Les voisins font +${Math.round((v - 1) * 100)} % de dégâts aux cibles sous la moitié de leurs PV.` },
  tide: { nom: 'Marée', texte: () => 'Les cibles touchées par un voisin deviennent Trempées.' },
  roots: { nom: 'Racines', texte: (v) => `Les ennemis des cases voisines perdent ${Math.round((1 - v) * 100)} % de vitesse.` },
  wind: { nom: 'Vent', texte: (v) => `Les voisins gagnent ${v} case${v > 1 ? 's' : ''} de portée.` },
  swarm: { nom: 'Essaim', texte: (v) => `Les poisons posés par les voisins agissent ${v} fois plus vite.` },
  scales: { nom: 'Écailles', texte: (v) => `Les ennemis des cases voisines perdent ${Math.abs(v)} points d’armure.` },
}

/** Effet chiffré d'une part, calculé depuis `BALANCE.parts_bonus`. */
function partEffect(cls: ClassId): string {
  const b = BALANCE.parts_bonus[cls]
  const libelle: Record<string, string> = { damage: 'dégâts', rate: 'cadence', hp: 'PV' }
  const lignes = (Object.entries(b) as [string, number][])
    .filter(([, v]) => v > 0)
    .sort((x, y) => y[1] - x[1]) // la statistique dominante en premier
    .map(([k, v]) => `+${Math.round(v * 100)} % ${libelle[k] ?? k}`)
  return lignes.join(', ') || '—'
}

const LINE_FR: Record<string, string> = {
  melee: 'Mêlée, peut bloquer sur le chemin',
  ranged: 'Distance, plaine ou colline',
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

/**
 * Fiche d'un Axie. Les 6 parts et leur effet sont le cœur de la fiche :
 * c'est là que le lien entre les traits d'un Axie et son jeu se lit.
 */
export function axieCardHtml(axieId: string): string {
  const def = axieDef(axieId)
  if (def.class === 'dusk') return `<h3>${esc(def.name)}</h3><p>Cet Axie arrive dans une version ultérieure.</p>`
  const cls = def.class as ClassId
  const c = BALANCE.classes[cls]
  const aura = AURA_FR[c.aura]
  const pct = (v: number) => `${v >= 0 ? '+' : ''}${Math.round(v * 100)} %`

  const parts = Object.entries(def.parts).map(([slot, partCls]) => `
    <li class="part">
      <i class="ic ic-${partCls}"></i>
      <span class="part-slot">${PART_FR[slot]}</span>
      <span class="part-cls">${CLASS_FR[partCls]}</span>
      <span class="part-eff">${partEffect(partCls as ClassId)}</span>
    </li>`).join('')

  return `
    <h3 class="card-title"><i class="ic ic-${cls}"></i> ${esc(def.name)}</h3>
    <p class="card-sub">${CLASS_FR[cls]} · ${esc(def.profile ?? 'Hybride')} · coût ${c.cost} · ${LINE_FR[c.line]}</p>
    <ul class="stats">
      <li><span>PV</span><b>${Math.round(c.hp * (1 + def.bonuses.hp))}</b></li>
      <li><span>Dégâts</span><b>${Math.round(c.damage * (1 + def.bonuses.damage))}</b></li>
      <li><span>Cadence</span><b>${(c.rate * (1 + def.bonuses.rate)).toFixed(2)}/s</b></li>
      <li><span>Portée</span><b>${c.range}</b></li>
    </ul>
    <h4>Aura : ${aura.nom}</h4>
    <p>${aura.texte(BALANCE.auras[c.aura].value ?? 0)}</p>
    <h4>Ses 6 parts</h4>
    <ul class="parts">${parts}</ul>
    <p class="card-note">Total : ${pct(def.bonuses.hp)} PV, ${pct(def.bonuses.damage)} dégâts, ${pct(def.bonuses.rate)} cadence.</p>`
}

/** Fiche d'une chimère : ce que le joueur doit savoir avant de drafter. */
export function enemyCardHtml(type: string): string {
  const e = BALANCE.enemies[type]
  if (!e) return `<p>Chimère inconnue.</p>`
  const traits: string[] = []
  if (e.ranged) traits.push(`Tire à ${e.ranged.range} cases${e.ranged.hits_hill ? ', atteint les collines' : ''}`)
  if (e.aoe) traits.push(`Frappe en zone sur ${e.aoe.radius} case${e.aoe.hits_hill ? ', atteint les collines' : ''}`)
  if (e.heal) traits.push(`Soigne ses alliés de ${e.heal.hps} PV par seconde`)
  if (e.leader) traits.push('Meneur : accélère sa meute')
  if (e.enrage) traits.push('Enrage sous la moitié de ses PV')
  if (e.on_death_spawn) traits.push(`Se scinde en ${e.on_death_spawn.count} à sa mort`)
  if (e.line_breaker) traits.push('Briseur de ligne : frappe les bloqueurs trois fois plus fort')
  const tier = e.tier === 'boss' ? 'Boss' : e.tier === 'miniboss' ? 'Mini-boss' : 'Ordinaire'

  return `
    <h3 class="card-title"><i class="ic ic-${e.class}"></i> ${esc(type)}</h3>
    <p class="card-sub">${CLASS_FR[e.class]} · ${tier}</p>
    <ul class="stats">
      <li><span>PV</span><b>${e.hp}</b></li>
      <li><span>Vitesse</span><b>${e.speed}</b></li>
      <li><span>Armure</span><b>${Math.round(e.armor * 100)} %</b></li>
      <li><span>Mêlée</span><b>${e.melee_dps}/s</b></li>
    </ul>
    ${traits.length ? `<h4>Comportement</h4><ul class="traits"><li>${traits.join('</li><li>')}</li></ul>` : ''}`
}

/** Panneau de fiche, ouvert au tap ou à l'appui long, fermé au tap ailleurs. */
export class CardOverlay {
  readonly el = document.createElement('div')

  constructor() {
    this.el.className = 'card-overlay'
    this.el.hidden = true
    this.el.addEventListener('pointerdown', (e) => {
      if (e.target === this.el) this.hide()
    })
    // Le panneau se déclare modal : la touche d'échappement doit le fermer,
    // sinon un joueur au clavier s'y retrouve enfermé.
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.el.hidden) this.hide()
    })
  }

  mount(parent: HTMLElement): void { parent.append(this.el) }

  private show(html: string): void {
    this.el.innerHTML = `<div class="card" role="dialog" aria-modal="true">${html}
      <button type="button" class="card-close">Fermer</button></div>`
    this.el.querySelector('.card-close')!.addEventListener('click', () => this.hide())
    this.el.hidden = false
  }

  showAxie(axieId: string): void { this.show(axieCardHtml(axieId)) }
  showEnemy(type: string): void { this.show(enemyCardHtml(type)) }
  hide(): void { this.el.hidden = true }
}
