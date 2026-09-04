import type { StatusId } from '../data/types'
import { CLASS_FR } from './cards'
import { STATUS_EFFECT_FR, STATUS_FR, STATUS_GLYPH } from './icons'

/**
 * Page « contrôles et appareils supportés ».
 *
 * Exigée par le règlement du concours dans les livrables du round 1, et par la
 * ligne d'accessibilité « montrer les contrôles dans le jeu ». Elle porte aussi
 * la légende des pastilles de statut : les glyphes qui flottent au-dessus des
 * chimères ne veulent rien dire sans elle, et c'est le seul endroit du jeu où on
 * peut les lire au calme.
 */
export function controlsHtml(): string {
  const statuts = (Object.keys(STATUS_GLYPH) as StatusId[])
    .map((id) => `<li><b class="glyph">${STATUS_GLYPH[id]}</b> ${STATUS_FR[id]} — ${STATUS_EFFECT_FR[id]}.</li>`)
    .join('')

  const classes = (['plant', 'beast', 'bug'] as const)
    .map((c) => CLASS_FR[c]).join(', ')
  const distance = (['aquatic', 'bird', 'reptile'] as const)
    .map((c) => CLASS_FR[c]).join(', ')

  return `<div class="screen screen-controls">
    <header class="screen-top"><button type="button" class="ghost" data-go="title">Retour</button>
      <span>Contrôles</span></header>
    <h4>Au doigt ou à la souris</h4>
    <ul class="traits">
      <li>Glisse un Axie du bac vers une case pour le poser.</li>
      <li>Glisse-le hors du plateau pour le retirer et récupérer son énergie.</li>
      <li>Déplace un Axie posé autant que tu veux, c’est gratuit.</li>
      <li>Touche un Axie posé, ou une chimère pendant la vague, pour ouvrir sa fiche.</li>
      <li>Appui long sur le bac : la fiche s’ouvre sans poser l’Axie.</li>
      <li>Le bouton ×2 accélère la vague, le bouton ♪ coupe le son, ☰ revient à la carte.</li>
      <li>La touche Échap ferme une fiche ouverte.</li>
    </ul>
    <h4>Règles</h4>
    <ul class="traits">
      <li>Les classes de mêlée (${classes}) se posent sur le chemin et bloquent.</li>
      <li>Les classes à distance (${distance}) se posent en plaine ou sur une colline.</li>
      <li>Une colline est à l’abri, mais coûte une case de portée et coupe toutes les auras.</li>
      <li>Chaque Axie donne une aura aux quatre cases voisines, jamais aux diagonales. Le badge posé sur le liseré dit de quelle classe elle vient.</li>
      <li>Aucun Axie ne monte de niveau. La force vient de qui tu places et à côté de qui.</li>
      <li>Trois chimères passées et le niveau est perdu. Zéro fuite vaut trois étoiles.</li>
      <li>Les vagues sont identiques à chaque essai : après une défaite, seule ta disposition est à revoir.</li>
    </ul>
    <h4>Pastilles au-dessus des chimères</h4>
    <ul class="traits glyphs">${statuts}</ul>
    <h4>Appareils</h4>
    <ul class="traits">
      <li>Navigateur mobile en portrait, à partir de 360 × 640. Cible : iOS 15 et Android 10.</li>
      <li>Navigateur de bureau : le jeu s’affiche en cadre portrait centré, la souris remplace le doigt.</li>
      <li>Un seul point de contact, pas de zoom, pas de rotation.</li>
    </ul>
  </div>`
}
