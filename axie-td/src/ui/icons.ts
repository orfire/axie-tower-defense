import type { StatusId } from '../data/types'
import { CLASS_ICON } from './icons.generated'

export { CLASS_ICON }

/**
 * Un glyphe par statut, affiché en pastille au-dessus de la chimère.
 *
 * L'information ne passe jamais par la seule couleur : c'est une exigence
 * d'accessibilité du concours, et ça aide aussi la lisibilité à 43 px la case,
 * où un halo coloré autour d'un sprite déjà coloré ne se voit pas.
 * La légende de la page des contrôles traduit chaque glyphe : un test échoue si
 * un statut y manque.
 */
export const STATUS_GLYPH: Record<StatusId, string> = {
  wet: '💧',
  roots: '🌿',
  feather: '🎯',
  poison: '☠',
  bleed: '🩸',
  fragile: '💠',
}

export const STATUS_FR: Record<StatusId, string> = {
  wet: 'Trempé', roots: 'Racines', feather: 'Marqué',
  poison: 'Poison', bleed: 'Saignement', fragile: 'Fragile',
}

/** Ce que le statut fait, en une ligne, pour la légende de la page des contrôles. */
export const STATUS_EFFECT_FR: Record<StatusId, string> = {
  wet: 'la chimère encaisse plus de dégâts',
  roots: 'la chimère avance moins vite',
  feather: 'les Axies visent cette chimère en priorité',
  poison: 'dégâts continus, l’armure n’y fait rien',
  bleed: 'dégâts continus, posés sur une cible empoisonnée',
  fragile: 'l’armure de la chimère est réduite de moitié',
}

/**
 * Règle CSS des icônes de classe, injectée une fois au démarrage.
 *
 * Les images sont des données URI générées par `tools/copy-assets.mjs` : elles
 * partent avec le bundle et s'affichent dès la première frame, sans requête qui
 * laisserait un rond vide sur l'écran de draft. `style.css` garde en dessous une
 * couleur pleine par classe, qui sert de repli si l'image ne décode pas.
 */
export function injectIconStyles(): void {
  const css = Object.entries(CLASS_ICON)
    .map(([cls, uri]) => `.ic-${cls}{background-image:url(${uri})}`)
    .join('\n')
  const style = document.createElement('style')
  style.textContent = `.ic{background-size:cover;background-position:center;border-radius:50%;display:inline-block}\n${css}`
  document.head.append(style)
}
