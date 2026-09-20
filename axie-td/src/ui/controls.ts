import type { StatusId } from '../data/types'
import { CLASS_EN } from './cards'
import { STATUS_EFFECT_EN, STATUS_EN, STATUS_GLYPH } from './icons'

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
    .map((id) => `<li><b class="glyph">${STATUS_GLYPH[id]}</b> ${STATUS_EN[id]} — ${STATUS_EFFECT_EN[id]}.</li>`)
    .join('')

  const classes = (['plant', 'beast', 'bug'] as const)
    .map((c) => CLASS_EN[c]).join(', ')
  const distance = (['aquatic', 'bird', 'reptile'] as const)
    .map((c) => CLASS_EN[c]).join(', ')

  return `<div class="screen screen-controls">
    <header class="screen-top"><button type="button" class="ghost" data-go="title">Back</button>
      <span>Controls</span></header>
    <h4>Touch or mouse</h4>
    <ul class="traits">
      <li>Drag an Axie from the tray onto a tile to place it.</li>
      <li>Drag it off the board to remove it and get its energy back.</li>
      <li>Move a placed Axie as often as you like, it is free.</li>
      <li>Tap a placed Axie, or a chimera during a wave, to open its card.</li>
      <li>Tap an Axie in the tray: its card opens without placing it.</li>
      <li>The ×2 button speeds the wave up, ♪ mutes the sound, ☰ goes back to the map.</li>
      <li>The Esc key closes an open card.</li>
    </ul>
    <h4>Rules</h4>
    <ul class="traits">
      <li>Melee classes (${classes}) stand on the path and block.</li>
      <li>Ranged classes (${distance}) stand on plains or on a hill.</li>
      <li>A hill is safe, but costs one tile of range and cuts every aura.</li>
      <li>Every Axie gives an aura to its four neighbouring tiles, never the diagonals. The badge on the link says which class it comes from.</li>
      <li>No Axie ever levels up. Strength comes from who you place, and next to whom.</li>
      <li>You start a level with three life points. A chimera that reaches the exit costs one, two or three of them depending on its tier, so a single boss leak ends the level. Zero leaks is three stars.</li>
      <li>Waves are identical every try: after a defeat, only your layout is in question.</li>
    </ul>
    <h4>Pips above chimeras</h4>
    <ul class="traits glyphs">${statuts}</ul>
    <h4>Devices</h4>
    <ul class="traits">
      <li>Mobile browser in portrait, from 360 × 640 up. Target: iOS 15 and Android 10.</li>
      <li>Desktop browser: the game runs in a centred portrait frame, the mouse replaces the finger.</li>
      <li>One touch point, no zoom, no rotation.</li>
    </ul>
  </div>`
}
