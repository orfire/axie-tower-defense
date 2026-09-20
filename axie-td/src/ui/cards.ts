import { BALANCE, axieDef } from '../data/load'
import type { ClassId } from '../data/types'

export const CLASS_EN: Record<string, string> = {
  beast: 'Beast', aquatic: 'Aquatic', plant: 'Plant',
  bird: 'Bird', bug: 'Bug', reptile: 'Reptile', dusk: 'Dusk',
}

/**
 * Noms français des chimères.
 *
 * Les identifiants de `balance.json` sont en anglais et servaient de nom
 * affiché : la fiche annonçait « wolf-aquatic-alpha » et la fiche du niveau
 * l'aurait repris. Tout texte vu par le joueur est en français (contrainte
 * globale du plan). Les qualificatifs collent au comportement réel de la
 * chimère — cracheur pour un tir, cuirassé pour de l'armure, briseur pour un
 * `line_breaker` — pour qu'un nom ne promette rien que les données ne tiennent.
 * Un test vérifie qu'aucune chimère n'est oubliée.
 */
export const ENEMY_EN: Record<string, string> = {
  'slime': 'Slime',
  'slime-forest-a': 'Woodland Slime',
  'slime-forest-b': 'Swift Slime',
  'slime-attack': 'Spitter Slime',
  'slime-defense': 'Armoured Slime',
  'slime-support': 'Healer Slime',
  'slime-fusion': 'Fused Slime',
  'wolf-gray': 'Grey Wolf',
  'wolf-alpha': 'Alpha Wolf',
  'wolf-aquatic': 'Marsh Wolf',
  'wolf-aquatic-alpha': 'Marsh Alpha',
  'werewolf': 'Werewolf',
  'treant': 'Treant',
  'treant-fighter': 'Breaker Treant',
  'treant-flowering': 'Blooming Treant',
  'dryad-fighter': 'Dryad Warrior',
  'dryad-ranger': 'Dryad Archer',
  'dryad-mage': 'Dryad Mage',
  'bear-dad': 'Bear Patriarch',
  'bear-mom': 'Bear Matriarch',
}

/** Nom affiché d'une chimère. Repli sur l'identifiant si la table l'a oubliée. */
export function enemyName(type: string): string {
  return ENEMY_EN[type] ?? type
}

const PART_EN: Record<string, string> = {
  eyes: 'Eyes', ears: 'Ears', mouth: 'Mouth',
  horn: 'Horn', back: 'Back', tail: 'Tail',
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
  fury: { nom: 'Fury', texte: (v) => `Neighbours deal +${Math.round((v - 1) * 100)}% damage to targets below half HP.` },
  tide: { nom: 'Tide', texte: () => 'Targets hit by a neighbour become Wet.' },
  roots: { nom: 'Roots', texte: (v) => `Enemies on neighbouring tiles lose ${Math.round((1 - v) * 100)}% speed.` },
  wind: { nom: 'Wind', texte: (v) => `Neighbours gain ${v} tile${v > 1 ? 's' : ''} of range.` },
  swarm: { nom: 'Swarm', texte: (v) => `Poisons applied by neighbours tick ${v} times faster.` },
  scales: { nom: 'Scales', texte: (v) => `Enemies on neighbouring tiles lose ${Math.abs(v)} armour points.` },
}

/** Effet chiffré d'une part, calculé depuis `BALANCE.parts_bonus`. */
function partEffect(cls: ClassId): string {
  const b = BALANCE.parts_bonus[cls]
  const libelle: Record<string, string> = { damage: 'damage', rate: 'attack speed', hp: 'HP' }
  const lignes = (Object.entries(b) as [string, number][])
    .filter(([, v]) => v > 0)
    .sort((x, y) => y[1] - x[1]) // la statistique dominante en premier
    .map(([k, v]) => `+${Math.round(v * 100)}% ${libelle[k] ?? k}`)
  return lignes.join(', ') || '—'
}

const LINE_EN: Record<string, string> = {
  melee: 'Melee, can block on the path',
  ranged: 'Ranged, plains or hill',
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

/**
 * Fiche d'un Axie. Les 6 parts et leur effet sont le cœur de la fiche :
 * c'est là que le lien entre les traits d'un Axie et son jeu se lit.
 */
export function axieCardHtml(axieId: string): string {
  const def = axieDef(axieId)
  if (def.class === 'dusk') return `<h3>${esc(def.name)}</h3><p>This Axie arrives in a later version.</p>`
  const cls = def.class as ClassId
  const c = BALANCE.classes[cls]
  const aura = AURA_FR[c.aura]
  const pct = (v: number) => `${v >= 0 ? '+' : ''}${Math.round(v * 100)}%`

  const parts = Object.entries(def.parts).map(([slot, partCls]) => `
    <li class="part">
      <i class="ic ic-${partCls}"></i>
      <span class="part-slot">${PART_EN[slot]}</span>
      <span class="part-cls">${CLASS_EN[partCls]}</span>
      <span class="part-eff">${partEffect(partCls as ClassId)}</span>
    </li>`).join('')

  return `
    <h3 class="card-title"><i class="ic ic-${cls}"></i> ${esc(def.name)}</h3>
    <p class="card-sub">${CLASS_EN[cls]} · ${esc(def.profile ?? 'Hybrid')} · cost ${c.cost} · ${LINE_EN[c.line]}</p>
    <ul class="stats">
      <li><span>HP</span><b>${Math.round(c.hp * (1 + def.bonuses.hp))}</b></li>
      <li><span>Damage</span><b>${Math.round(c.damage * (1 + def.bonuses.damage))}</b></li>
      <li><span>Attack speed</span><b>${(c.rate * (1 + def.bonuses.rate)).toFixed(2)}/s</b></li>
      <li><span>Range</span><b>${c.range}</b></li>
    </ul>
    <h4>Aura: ${aura.nom}</h4>
    <p>${aura.texte(BALANCE.auras[c.aura].value ?? 0)}</p>
    <h4>Its 6 parts</h4>
    <ul class="parts">${parts}</ul>
    <p class="card-note">Total: ${pct(def.bonuses.hp)} HP, ${pct(def.bonuses.damage)} damage, ${pct(def.bonuses.rate)} attack speed.</p>`
}

/** Fiche d'une chimère : ce que le joueur doit savoir avant de drafter. */
export function enemyCardHtml(type: string): string {
  const e = BALANCE.enemies[type]
  if (!e) return `<p>Unknown chimera.</p>`
  const traits: string[] = []
  if (e.ranged) traits.push(`Shoots at ${e.ranged.range} tiles${e.ranged.hits_hill ? ', reaches hills' : ''}`)
  if (e.aoe) traits.push(`Area attack over ${e.aoe.radius} tiles${e.aoe.hits_hill ? ', reaches hills' : ''}`)
  if (e.heal) traits.push(`Heals its allies for ${e.heal.hps} HP per second`)
  if (e.leader) traits.push('Leader: speeds up its pack')
  if (e.enrage) traits.push('Enrages below half HP')
  if (e.on_death_spawn) traits.push(`Splits into ${e.on_death_spawn.count} on death`)
  if (e.line_breaker) traits.push('Line breaker: hits blockers three times harder')
  const tier = e.tier === 'boss' ? 'Boss' : e.tier === 'miniboss' ? 'Mini-boss' : 'Regular'

  return `
    <h3 class="card-title"><i class="ic ic-${e.class}"></i> ${esc(enemyName(type))}</h3>
    <p class="card-sub">${CLASS_EN[e.class]} · ${tier}</p>
    <ul class="stats">
      <li><span>HP</span><b>${e.hp}</b></li>
      <li><span>Speed</span><b>${e.speed}</b></li>
      <li><span>Armour</span><b>${Math.round(e.armor * 100)}%</b></li>
      <li><span>Melee</span><b>${e.melee_dps}/s</b></li>
    </ul>
    ${traits.length ? `<h4>Behaviour</h4><ul class="traits"><li>${traits.join('</li><li>')}</li></ul>` : ''}`
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
