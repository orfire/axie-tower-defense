import { LEVELS, MAX_STARS, PLAYABLE, axieDef, levelDef } from '../data/load'
import type { LevelDef } from '../data/types'
import { CLASS_EN, axieCardHtml, enemyName } from './cards'
import { draftHint } from './onboarding'
import { isLevelOpen, nextUnlock, totalStars, unlockedAxies, type SaveData } from '../save/storage'
import type { Session } from '../game/session'

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

/**
 * Rangée d'étoiles.
 *
 * Les étoiles vides sont dessinées, pas omises : trois glyphes distincts (★ et ☆)
 * disent le score sans dépendre d'une couleur, et l'étiquette le redit en toutes
 * lettres pour les lecteurs d'écran.
 */
const starRow = (n: number) =>
  `<span class="stars" aria-label="${n} stars out of 3">${'★'.repeat(n)}${'☆'.repeat(3 - n)}</span>`

/**
 * Miniature du chemin en SVG, pour la fiche du niveau.
 *
 * Une case fait 10 unités, le plateau 7 × 10 cases : la boîte fait donc 70 × 100.
 * Le tracé passe par le centre de chaque case du chemin, les collines sont des
 * carrés posés dessous. Le draft doit être un choix informé (GDD §11.5) : sans
 * cette vignette, choisir entre mêlée et distance revient à parier.
 */
export function pathThumb(level: LevelDef): string {
  const cells = level.path.map(([c, r]) => `${c * 10 + 5},${r * 10 + 5}`).join(' ')
  const hills = level.hills
    // Contour marqué : le gris de colline sur le vert de plaine se distinguait à
    // peine à 96 px de large, la vignette annonçait une colline qu'on ne voyait pas.
    .map(([c, r]) => `<rect x="${c * 10 + 2}" y="${r * 10 + 2}" width="6" height="6" rx="2" fill="#dcd6c6" stroke="#6f6a5c" stroke-width="1"/>`)
    .join('')
  return `<svg viewBox="0 0 70 100" class="thumb" role="img" aria-label="Path layout">
    <rect width="70" height="100" fill="#b6c4a5"/>
    ${hills}
    <polyline points="${cells}" fill="none" stroke="#9a7b5b" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`
}

export function titleHtml(save: SaveData): string {
  return `<div class="screen screen-title">
    <h1>Axie<br>Tower Defense</h1>
    <p class="tagline">Strength comes from bonds, not levels.</p>
    <button type="button" class="cta" data-go="map">Play</button>
    <button type="button" class="ghost" data-go="collection">Collection</button>
    <button type="button" class="ghost" data-go="controls">Controls &amp; devices</button>
    <p class="legal">${totalStars(save)} stars of ${MAX_STARS} · Assets Axie Infinity, Sky Mavis</p>
  </div>`
}

export function mapHtml(save: SaveData): string {
  const rows = LEVELS.map((l) => {
    const open = isLevelOpen(save, l.id)
    const stars = save.stars[String(l.id)] ?? 0
    return `<button type="button" class="level${open ? '' : ' is-locked'}" ${open ? `data-level="${l.id}"` : 'disabled'}
      aria-label="Level ${l.id}, ${esc(l.name)}${open ? `, ${stars} stars` : ', locked'}">
      <span class="level-num">${l.id}</span>
      <span class="level-name">${esc(l.name)}</span>
      ${open ? starRow(stars) : '<span class="stars">Locked</span>'}
    </button>`
  }).join('')
  const next = nextUnlock(save)
  return `<div class="screen screen-map">
    <header class="screen-top"><button type="button" class="ghost" data-go="title">Back</button>
      <span>${totalStars(save)} ★ / ${MAX_STARS}</span></header>
    <div class="levels">${rows}</div>
    ${next ? `<p class="hint">${next.missing} more star${next.missing > 1 ? 's' : ''} to unlock ${esc(next.name)}.</p>` : ''}
  </div>`
}

export function briefHtml(session: Session, levelId: number): string {
  const l = levelDef(levelId)
  const stars = session.save.stars[String(levelId)] ?? 0
  const enemies = session.announcedEnemies(levelId).map((type) => {
    const cls = session.announcedClass(type)
    return `<li><i class="ic ic-${cls}"></i><span>${esc(enemyName(type))}</span><em>${CLASS_EN[cls]}</em></li>`
  }).join('')
  return `<div class="screen screen-brief">
    <header class="screen-top"><button type="button" class="ghost" data-go="map">Back</button>
      <span>Level ${l.id}</span></header>
    <h2>${esc(l.name)}</h2>
    <div class="brief-body">
      ${pathThumb(l)}
      <div>
        <p>${l.waves.length} waves · ${l.hills.length} hill${l.hills.length > 1 ? 's' : ''} · best score ${starRow(stars)}</p>
        <h4>Chimeras ahead</h4>
        <ul class="enemy-list">${enemies}</ul>
      </div>
    </div>
    <button type="button" class="cta" data-draft="${l.id}">Pick my Axies</button>
  </div>`
}

export function draftHtml(session: Session, levelId: number, picked: string[]): string {
  const forced = levelDef(levelId).draft.forced
  const open = unlockedAxies(session.save)

  /*
   * Bulle unique de l'écran de draft (GDD §12), au niveau 3, le premier où
   * l'équipe se choisit. Elle s'efface dès que le niveau est réussi : le joueur
   * a fait le geste, on ne le lui redemande pas. Après une défaite elle revient,
   * ce qui est précisément le moment où le conseil sert.
   */
  const hint = (session.save.stars[String(levelId)] ?? 0) === 0 ? draftHint(levelId) : null
  const slots = Array.from({ length: 5 }, (_, i) => {
    const id = picked[i]
    if (!id) return `<span class="pick is-empty">${i + 1}</span>`
    const def = axieDef(id)
    const cls = def.class === 'dusk' ? 'beast' : def.class
    return `<button type="button" class="pick cls-${cls}" data-unpick="${id}" aria-label="Remove ${esc(def.name)}">
      <i class="ic ic-${cls}"></i><span>${esc(def.name)}</span></button>`
  }).join('')

  return `<div class="screen screen-draft">
    <header class="screen-top"><button type="button" class="ghost" data-go="brief">Back</button>
      <span>${forced ? 'Fixed team' : 'Pick 5 Axies'}</span></header>
    <div class="picks">${slots}</div>
    ${forced ? '<p class="hint">This level lends you a team. Free picking opens at level 3.</p>' : ''}
    ${hint ? `<p class="draft-hint" role="status">${esc(hint.text)}</p>` : ''}
    <div class="collection">${open.map((id) => collectTile(id, picked.includes(id))).join('')}</div>
    <button type="button" class="cta" data-play="${levelId}" ${picked.length === 0 ? 'disabled' : ''}>Play</button>
  </div>`
}

/**
 * Vignette d'un Axie de la collection.
 *
 * La classe est écrite sous le nom et pas seulement portée par la couleur de la
 * vignette : le règlement du concours interdit qu'une information ne passe que
 * par la couleur, et c'est ici la seule chose qui distingue deux Axies au premier
 * coup d'œil. `action` porte l'attribut de délégation : `data-pick` sur l'écran
 * de draft, `data-card` sur la collection, où le tap ouvre la fiche.
 */
function collectTile(id: string, on: boolean, action: 'pick' | 'card' = 'pick'): string {
  const def = axieDef(id)
  const cls = def.class === 'dusk' ? 'beast' : def.class
  const profil = def.profile ?? 'Hybrid'
  return `<button type="button" class="collect cls-${cls}${on ? ' is-on' : ''}" data-${action}="${id}"
    aria-label="${esc(def.name)}, ${CLASS_EN[cls]}, ${esc(profil)}${on ? ', picked' : ''}">
    <i class="ic ic-${cls}"></i><span class="nm">${esc(def.name)}</span>
    <span class="pr">${CLASS_EN[cls]} · ${esc(profil)}</span></button>`
}

export function resultHtml(levelId: number, stars: number, save: SaveData, unlocked: string | null): string {
  const l = levelDef(levelId)
  const last = levelId >= LEVELS.at(-1)!.id
  return `<div class="screen screen-result">
    <h2>${esc(l.name)}</h2>
    <div class="big-stars">${starRow(stars)}</div>
    <p>${stars === 3 ? 'No leaks. Perfect formation.' : `${3 - stars} chimera${3 - stars > 1 ? 's' : ''} got through.`}</p>
    ${unlocked ? `<div class="unlock"><p class="hint">New Axie unlocked</p>${axieCardHtml(unlocked)}</div>` : ''}
    <p class="hint">${totalStars(save)} ★ / ${MAX_STARS}</p>
    ${last ? '<p class="hint">Campaign complete. Thanks for playing.</p>'
      : `<button type="button" class="cta" data-level="${levelId + 1}">Next level</button>`}
    <button type="button" class="ghost" data-retry="${levelId}">Play again</button>
    <button type="button" class="ghost" data-go="map">Map</button>
  </div>`
}

export function defeatHtml(levelId: number, wave: number): string {
  const l = levelDef(levelId)
  return `<div class="screen screen-defeat">
    <h2>${esc(l.name)}</h2>
    <p>Chimeras got through on wave ${wave} of ${l.waves.length}.</p>
    <p class="hint">Waves are identical every try. Change your layout.</p>
    <button type="button" class="cta" data-retry="${levelId}">Retry</button>
    <button type="button" class="ghost" data-draft="${levelId}">Change team</button>
    <button type="button" class="ghost" data-go="map">Map</button>
  </div>`
}

export function collectionHtml(save: SaveData): string {
  const open = new Set(unlockedAxies(save))
  const stars = totalStars(save)

  const unlockedList = PLAYABLE
    .filter((a) => open.has(a.id))
    .map((a) => collectTile(a.id, false, 'card'))
    .join('')

  // Les verrouillés restent en silhouette avec leur seuil (GDD §11.5) : le
  // joueur voit ce qu'il lui reste à gagner sans pouvoir consulter la fiche.
  const lockedList = PLAYABLE
    .filter((a) => !open.has(a.id) && a.unlock.type === 'stars')
    .sort((a, b) => (a.unlock.stars ?? 0) - (b.unlock.stars ?? 0))
    .map((a) => `<span class="collect is-locked" aria-label="Axie locked, ${a.unlock.stars} stars required">
      <i class="ic"></i><span class="nm">${a.unlock.stars} ★</span><span class="pr">Locked</span></span>`)
    .join('')

  return `<div class="screen screen-collection">
    <header class="screen-top"><button type="button" class="ghost" data-go="title">Back</button>
      <span>${open.size} / ${PLAYABLE.length} Axies · ${stars} ★</span></header>
    <div class="collection">${unlockedList}${lockedList}</div>
  </div>`
}
