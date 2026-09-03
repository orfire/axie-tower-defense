# Axie Tower Defense — Plan d'implémentation

> **Pour les agents :** SOUS-COMPÉTENCE REQUISE : utiliser `superpowers:subagent-driven-development` (recommandé) ou `superpowers:executing-plans` pour exécuter ce plan tâche par tâche. Les étapes utilisent des cases à cocher (`- [ ]`).

**Objectif :** livrer avant le 21/09/2026 un tower defense mobile web jouable, 8 niveaux, où la victoire vient du choix des Axies et de leur disposition, jamais de leur montée en niveau.

**Architecture :** une simulation pure en TypeScript, sans aucune dépendance au rendu, tourne à pas fixe de 30 Hz et ne contient aucun aléa. Le rendu PixiJS lit l'état de cette simulation et n'écrit jamais dedans. L'interface produit des intentions (poser, retirer, lancer la vague) que la simulation applique. Cette séparation rend le jeu testable en Node, ce qui est le seul moyen d'équilibrer 6 auras et 20 chimères en deux semaines.

**Stack :** Vite 6, TypeScript 5.9, Vitest, PixiJS 7.2.4, pixi-spine 4.0.3, Spine 3.8.79, hébergement statique Vercel.

## Contraintes globales

Ces règles s'appliquent à **toutes** les tâches. Elles viennent du GDD (`design/GDD.md`), qui reste la source de vérité du design.

- **Répertoire de travail : `axie-td/`.** Toutes les commandes `npm` s'exécutent depuis là. Il contient déjà `tools/gen-data.mjs` et `data/`.
- **Le dépôt git est à la racine du projet** (`C:/Users/edoua/Documents/Axie_infinity`), pas dans `axie-td/`, et la branche de travail est `round1`. Il suit `axie-td/`, `design/` et `docs/`. Les deux kits d'assets officiels en sont exclus : la charte du concours interdit de les redistribuer. **Ne jamais lancer `git init`**, et lancer les commandes `git` depuis la racine.
- **Aucun aléa.** `Math.random`, `Date.now`, `performance.now` sont **interdits** dans `src/sim/`. Le temps vient du pas fixe. Un test le vérifie par lecture de fichiers (tâche 11).
- **Pas fixe : `DT = 1/30` seconde.** Jamais de `deltaTime` variable dans la simulation.
- **`src/sim/` n'importe jamais depuis `pixi.js`, `pixi-spine`, `src/render/`, `src/ui/`.** Un test le vérifie (tâche 11).
- **Les JSON de `data/` ne se modifient jamais à la main.** On modifie `tools/gen-data.mjs` puis on relance `node tools/gen-data.mjs`.
- **Grille 7 colonnes × 10 lignes.** Une cellule est `[col, row]`, `col` de 0 à 6, `row` de 0 à 9.
- **Adjacence des auras : les 4 cases orthogonales uniquement.** Jamais les diagonales.
- **Portrait uniquement.** Pas de zoom, pas de pan, un seul doigt.
- **Aucune information transmise par la couleur seule** (exigence d'accessibilité de l'organisateur).
- **Français** pour tout texte affiché au joueur. Anglais pour les identifiants de code.
- **Commits fréquents**, un par tâche au minimum, en français, préfixés `feat:`, `test:`, `chore:`, `fix:`.

---

## Structure des fichiers

| Fichier | Responsabilité |
|---|---|
| `tools/gen-data.mjs` | *(existe)* Génère et valide `data/`. Source des règles chiffrées. |
| `tools/copy-assets.mjs` | Copie et convertit les assets Spine, VFX et SFX vers `public/`. |
| `tools/balance-run.mjs` | Rejoue les 8 niveaux sans rendu et imprime les étoiles obtenues. |
| `src/data/types.ts` | Types TypeScript de `balance.json`, `axies.json`, `levels/*.json`, `vfx-map.json`. |
| `src/data/load.ts` | Charge et valide ces JSON au démarrage. |
| `src/sim/types.ts` | Types des entités de simulation et des événements. |
| `src/sim/grid.ts` | Géométrie : centre d'une case, distance, voisins, position le long du chemin. |
| `src/sim/world.ts` | Construction et remise à zéro du monde. |
| `src/sim/spawn.ts` | Fait apparaître les ennemis aux temps prévus. |
| `src/sim/movement.ts` | Avance les ennemis, applique le blocage et la file d'attente. |
| `src/sim/targeting.ts` | Choisit la cible d'un Axie ou d'un ennemi. |
| `src/sim/combat.ts` | Dégâts, armure, triangle de classes, morts. |
| `src/sim/status.ts` | Application, tick et expiration des statuts. |
| `src/sim/auras.ts` | Calcul des auras et anti-empilement. |
| `src/sim/reactions.ts` | Les 4 réactions en chaîne. |
| `src/sim/enemies.ts` | Comportements : tir, zone, soin, meneur, enrage, scission. |
| `src/sim/placement.ts` | Poser, déplacer, retirer un Axie ; budget d'énergie. |
| `src/sim/game.ts` | Boucle : phases, vagues, PV du niveau, étoiles. |
| `src/render/app.ts` | Application Pixi, mise en page portrait, calcul de la taille de case. |
| `src/render/board.ts` | Dessin du plateau : plaine, chemin, collines, entrée, sortie. |
| `src/render/sprites.ts` | Chargement et mise en cache des squelettes Spine. |
| `src/render/view.ts` | Miroir visuel de l'état de simulation, tick de rendu. |
| `src/render/vfx.ts` | Lecture des atlas d'effets en mode additif. |
| `src/render/floats.ts` | Nombres de dégâts flottants. |
| `src/ui/hud.ts` | Barre haute : cœurs, vague, énergie, mute. |
| `src/ui/tray.ts` | Bac du draft, coûts, états. |
| `src/ui/dragdrop.ts` | Glisser-déposer, aimantation, surbrillances. |
| `src/ui/cards.ts` | Fiches d'Axie (les 6 parts) et de chimère. |
| `src/ui/screens.ts` | Titre, carte, fiche de niveau, draft, résultat, défaite, collection. |
| `src/ui/onboarding.ts` | Bulles des niveaux 1 à 3. |
| `src/save/storage.ts` | `localStorage`, étoiles, déblocages. |
| `src/audio/sfx.ts` | Sons du kit, mute. |
| `src/main.ts` | Point d'entrée, assemblage. |

---

## Tâche 1 : Squelette du projet et pipeline d'assets

**Fichiers :**
- Créer : `axie-td/package.json`, `axie-td/tsconfig.json`, `axie-td/vite.config.ts`, `axie-td/index.html`, `axie-td/src/main.ts`, `axie-td/src/style.css`
- Créer : `axie-td/tools/copy-assets.mjs`
- Test : `axie-td/tests/assets.test.ts`

**Interfaces :**
- Consomme : rien.
- Produit : un projet Vite qui démarre, `npm test` qui passe, et `public/spine/`, `public/vfx/`, `public/sfx/` remplis et sous 15 Mo au total.

**Pourquoi la conversion en WebP :** les PNG bruts du toolkit pèsent 35 Mo pour les squelettes et 39 Mo pour les 21 atlas d'effets dont on a besoin. C'est intenable au premier chargement sur mobile. La conversion en WebP divise le poids par sept environ sans toucher aux coordonnées des atlas, à condition de réécrire la première ligne du fichier `.atlas` qui nomme l'image.

- [ ] **Étape 1 : Créer `package.json`**

```json
{
  "name": "axie-td",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "data": "node tools/gen-data.mjs",
    "assets": "node tools/copy-assets.mjs",
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "balance": "node --experimental-strip-types tools/balance-run.mjs"
  },
  "dependencies": {
    "pixi-spine": "4.0.3",
    "pixi.js": "7.2.4"
  },
  "devDependencies": {
    "sharp": "^0.34.0",
    "typescript": "~5.9.2",
    "vite": "^6.3.5",
    "vitest": "^3.2.0"
  }
}
```

- [ ] **Étape 2 : Créer `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": false
  },
  "include": ["src", "tests"]
}
```

- [ ] **Étape 3 : Créer `vite.config.ts`**

```ts
import { defineConfig } from 'vite'

export default defineConfig({
  server: { host: true, port: 5179, strictPort: true },
  build: { target: 'es2022', assetsInlineLimit: 0 },
  optimizeDeps: { include: ['pixi.js', 'pixi-spine'] },
})
```

- [ ] **Étape 4 : Créer `index.html`, `src/style.css` et `src/main.ts`**

`index.html` :

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no" />
    <meta name="theme-color" content="#2b3a33" />
    <title>Axie Tower Defense</title>
    <link rel="stylesheet" href="/src/style.css" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`src/style.css` :

```css
:root { color-scheme: dark; }
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; overflow: hidden; background: #1b221e; }
body { font-family: Fredoka, "Trebuchet MS", system-ui, sans-serif; -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; touch-action: none; }
#app { position: relative; width: 100vw; height: 100dvh; overflow: hidden; }
```

`src/main.ts` :

```ts
const app = document.querySelector<HTMLElement>('#app')
if (!app) throw new Error('#app introuvable')
app.textContent = 'Axie Tower Defense'
```

Pas de `.gitignore` à créer ici : celui de la racine du dépôt couvre déjà `node_modules/` et `dist/`. Les assets convertis dans `public/` **sont versionnés**, parce que Vercel construit depuis le dépôt et que les deux kits sources en sont exclus. Leur poids reste sous 15 Mo, plafond vérifié par le test de l'étape 7.

- [ ] **Étape 5 : Écrire `tools/copy-assets.mjs`**

```js
// Copie les assets nécessaires depuis les kits officiels vers public/.
// Les PNG deviennent des WebP et les fichiers .atlas.txt sont réécrits en .atlas.
// Usage : node tools/copy-assets.mjs
import { readFileSync, readdirSync, writeFileSync, mkdirSync, copyFileSync, existsSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const KIT2D = join(ROOT, '..', 'unity-axie-gtk2d', 'Assets', 'AxieInfinity', 'AxieStandardAssets')
const WEBVFX = join(ROOT, '..', 'axie-origins-asset-kit', 'web-vfx', 'public')
const PUB = join(ROOT, 'public')

const axies = JSON.parse(readFileSync(join(ROOT, 'data', 'axies.json'), 'utf8')).axies
const balance = JSON.parse(readFileSync(join(ROOT, 'data', 'balance.json'), 'utf8'))
const vfxMap = JSON.parse(readFileSync(join(ROOT, 'data', 'vfx-map.json'), 'utf8'))

// --- quels assets sont nécessaires ---
const spineDirs = []
for (const a of axies) {
  if (a.class === 'dusk') continue // hors v1
  spineDirs.push({ src: join(KIT2D, 'Spines', a.spine), out: join(PUB, 'spine', 'axies', a.id) })
}
for (const type of Object.keys(balance.enemies)) {
  spineDirs.push({ src: join(KIT2D, 'Spines', 'chimeras', type), out: join(PUB, 'spine', 'chimeras', type) })
}

function collect(value, into) {
  if (typeof value === 'string') into.add(value)
  else if (Array.isArray(value)) value.forEach((v) => collect(v, into))
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => collect(v, into))
}
const named = new Set()
collect(vfxMap, named)

const vfxAll = new Set(JSON.parse(readFileSync(join(WEBVFX, 'vfx', 'index.json'), 'utf8')).items.map((i) => i.id))
const vfxNeeded = [...named].filter((n) => vfxAll.has(n)).sort()
const sfxNeeded = [...named].filter((n) => existsSync(join(WEBVFX, 'sfx', `${n}.wav`))).sort()

// --- copie ---
async function webp(srcPng, outWebp) {
  mkdirSync(dirname(outWebp), { recursive: true })
  await sharp(srcPng).webp({ quality: 88, effort: 5 }).toFile(outWebp)
}

let bytes = 0
const size = (p) => (existsSync(p) ? readFileSync(p).length : 0)

rmSync(join(PUB, 'spine'), { recursive: true, force: true })
rmSync(join(PUB, 'vfx'), { recursive: true, force: true })
rmSync(join(PUB, 'sfx'), { recursive: true, force: true })

for (const { src, out } of spineDirs) {
  if (!existsSync(src)) throw new Error(`Source Spine absente : ${src}`)

  // Les noms de fichiers du kit ne suivent aucune convention : le dossier
  // 03-puffy-aquatic contient 03-puffy-aquatic.json, 01-buba-beast contient buba.json,
  // 07-venoki-reptile contient 07-dps-reptile.json et 04-support-plant contient
  // 04-support-plan.json, avec une faute de frappe. On lit donc le dossier au lieu
  // de deviner, et on prend le nom de l'image dans l'atlas lui-même.
  const files = readdirSync(src)
  const jsonName = files.find((f) => f.endsWith('.json'))
  const atlasName = files.find((f) => f.endsWith('.atlas.txt'))
  if (!jsonName || !atlasName) throw new Error(`Fichiers Spine introuvables dans ${src}`)

  const atlasText = readFileSync(join(src, atlasName), 'utf8')
  // Première ligne non vide de l'atlas : le nom du PNG.
  const pngName = atlasText.split(/\r?\n/).map((l) => l.trim()).find((l) => l.endsWith('.png'))
  if (!pngName || !existsSync(join(src, pngName))) throw new Error(`Image introuvable pour ${src} (${pngName})`)

  mkdirSync(out, { recursive: true })
  copyFileSync(join(src, jsonName), join(out, 'skeleton.json'))
  writeFileSync(join(out, 'skeleton.atlas'), atlasText.replace(pngName, 'skeleton.webp'))
  await webp(join(src, pngName), join(out, 'skeleton.webp'))
  bytes += size(join(out, 'skeleton.json')) + size(join(out, 'skeleton.atlas')) + size(join(out, 'skeleton.webp'))
}

for (const id of vfxNeeded) {
  const out = join(PUB, 'vfx', id)
  mkdirSync(out, { recursive: true })
  const clip = JSON.parse(readFileSync(join(WEBVFX, 'vfx', id, 'clip.json'), 'utf8'))
  await webp(join(WEBVFX, 'vfx', id, clip.atlas.file), join(out, 'atlas.webp'))
  clip.atlas.file = 'atlas.webp'
  writeFileSync(join(out, 'clip.json'), JSON.stringify(clip))
  bytes += size(join(out, 'atlas.webp')) + size(join(out, 'clip.json'))
}

mkdirSync(join(PUB, 'sfx'), { recursive: true })
for (const id of sfxNeeded) {
  copyFileSync(join(WEBVFX, 'sfx', `${id}.wav`), join(PUB, 'sfx', `${id}.wav`))
  bytes += size(join(PUB, 'sfx', `${id}.wav`))
}

writeFileSync(join(PUB, 'assets-manifest.json'), JSON.stringify({
  spine: spineDirs.length, vfx: vfxNeeded, sfx: sfxNeeded, bytes,
}, null, 2))

const mb = (bytes / 1024 / 1024).toFixed(1)
console.log(`Spine ${spineDirs.length} · VFX ${vfxNeeded.length} · SFX ${sfxNeeded.length} · total ${mb} Mo`)
if (bytes > 15 * 1024 * 1024) {
  console.error(`Budget d'assets dépassé : ${mb} Mo > 15 Mo`)
  process.exit(1)
}
```

Les messages d'erreur nomment le dossier fautif. Si l'un d'eux se déclenche, lister le dossier en cause et adapter la lecture : ne jamais coder en dur un nom de fichier du kit.

- [ ] **Étape 6 : Installer et lancer le pipeline**

```bash
cd axie-td && npm install && npm run data && npm run assets
```

Attendu : une ligne du type `Spine 39 · VFX 21 · SFX 20 · total 11.4 Mo`, sans erreur. Si le total dépasse 15 Mo, baisser `quality` à 80 dans `webp()` et relancer.

- [ ] **Étape 7 : Écrire le test de fumée `tests/assets.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const PUB = join(process.cwd(), 'public')
const manifest = JSON.parse(readFileSync(join(PUB, 'assets-manifest.json'), 'utf8'))

describe('assets', () => {
  it('reste sous le budget de 15 Mo', () => {
    expect(manifest.bytes).toBeLessThan(15 * 1024 * 1024)
  })

  it('fournit les trois fichiers Spine de Buba', () => {
    for (const f of ['skeleton.json', 'skeleton.atlas', 'skeleton.webp']) {
      expect(existsSync(join(PUB, 'spine', 'axies', 'buba', f))).toBe(true)
    }
  })

  it("nomme l'image WebP dans l'atlas de Buba", () => {
    const atlas = readFileSync(join(PUB, 'spine', 'axies', 'buba', 'skeleton.atlas'), 'utf8')
    expect(atlas).toContain('skeleton.webp')
    expect(atlas).not.toContain('buba.png')
  })

  it('fournit les 20 chimères', () => {
    for (const type of ['slime', 'wolf-gray', 'treant', 'bear-dad', 'dryad-mage']) {
      expect(existsSync(join(PUB, 'spine', 'chimeras', type, 'skeleton.json'))).toBe(true)
    }
  })
})
```

- [ ] **Étape 8 : Lancer les tests**

```bash
cd axie-td && npm test
```

Attendu : 4 tests passent.

- [ ] **Étape 9 : Vérifier que le serveur démarre**

```bash
cd axie-td && npm run dev
```

Attendu : Vite écoute sur `http://localhost:5179/`, la page affiche « Axie Tower Defense ». Arrêter avec Ctrl+C.

- [ ] **Étape 10 : Commiter**

Le dépôt existe déjà, à la racine du projet, sur la branche `round1`. Ne pas lancer `git init`.

```bash
cd "C:/Users/edoua/Documents/Axie_infinity" && git add -A && git commit -m "chore: squelette Vite + TypeScript + Vitest et pipeline d'assets"
```

---

## Tâche 2 : Types de données et chargement validé

**Fichiers :**
- Créer : `src/data/types.ts`, `src/data/load.ts`
- Test : `tests/data.test.ts`

**Interfaces :**
- Consomme : `data/balance.json`, `data/axies.json`, `data/levels/0N.json` produits par `tools/gen-data.mjs`.
- Produit :
  - `type ClassId = 'beast'|'aquatic'|'plant'|'bird'|'bug'|'reptile'`
  - `type Line = 'melee'|'ranged'`
  - `type Cell = readonly [number, number]`
  - `interface Balance`, `interface AxieDef`, `interface LevelDef`, `interface WaveDef`, `interface EnemyDef`
  - `const BALANCE: Balance`, `const AXIES: AxieDef[]`, `function levelDef(id: number): LevelDef`
  - `function axieDef(id: string): AxieDef`

- [ ] **Étape 1 : Écrire `src/data/types.ts`**

```ts
export type ClassId = 'beast' | 'aquatic' | 'plant' | 'bird' | 'bug' | 'reptile'
export type Line = 'melee' | 'ranged'
export type Cell = readonly [number, number]
export type Tier = 'normal' | 'miniboss' | 'boss'
export type StatusId = 'wet' | 'roots' | 'feather' | 'poison' | 'bleed' | 'fragile'
export type AuraId = 'fury' | 'tide' | 'roots' | 'wind' | 'swarm' | 'scales'
export type ReactionId = 'ricochet' | 'rooting' | 'shatter' | 'burst'

export interface ClassDef {
  line: Line
  cost: number
  hp: number
  damage: number
  rate: number
  range: number
  attack_vfx: string
  on_hit_status: StatusId | null
  self_status: 'rage' | null
  aura: AuraId
  ignores_armor?: boolean
}

export interface EnemyDef {
  class: ClassId
  hp: number
  speed: number
  armor: number
  melee_dps: number
  tier: Tier
  ranged?: { range: number; period: number; damage: number; hits_hill: boolean }
  aoe?: { radius: number; period: number; damage: number; hits_hill: boolean }
  heal?: { radius: number; hps: number; only?: string[] }
  leader?: { radius: number; speed_mult: number; affects: string[] }
  enrage?: { hp_below: number; speed_mult: number; vfx: string }
  on_death_spawn?: { enemy: string; count: number }
  line_breaker?: boolean
}

export interface Balance {
  version: string
  sim: { tick_hz: number; no_randomness: boolean }
  grid: { cols: number; rows: number }
  level: {
    lives: number
    leak_damage: Record<Tier, number>
    stars_by_lives: Record<string, number>
  }
  triangle: { advantage: number; disadvantage: number; beats: Record<ClassId, ClassId[]> }
  cells: {
    path: { allowed_lines: Line[]; blocks: boolean }
    plain: { allowed_lines: Line[] }
    hill: { allowed_lines: Line[]; range_penalty: number; auras: boolean; max_per_level: number; hit_only_by: string[] }
  }
  classes: Record<ClassId, ClassDef>
  auras: Record<AuraId, { class: ClassId; target: 'allies' | 'enemies'; effect: string; value?: number; status?: StatusId; hp_threshold?: number }> & { anti_stack: string }
  statuses: Record<StatusId | 'blocked' | 'rage', {
    duration: number | null | 'wave'
    effect: string
    value?: number
    dps?: number
    ignores_armor?: boolean
    max_stacks?: number
  }>
  reactions: Record<ReactionId, Record<string, unknown>>
  parts_bonus: Record<ClassId, { hp?: number; damage?: number; rate?: number }>
  enemies: Record<string, EnemyDef>
}

export interface AxieDef {
  id: string
  name: string
  class: ClassId | 'dusk'
  spine: string
  parts: Record<'eyes' | 'ears' | 'mouth' | 'horn' | 'back' | 'tail', ClassId | 'dusk'>
  bonuses: { hp: number; damage: number; rate: number }
  profile: string | null
  unlock: { type: 'start' | 'stars' | 'v2'; stars?: number }
}

export interface SpawnDef { t: number; enemy: string }
export interface WaveDef { budget: number; spawns: SpawnDef[] }

export interface LevelDef {
  id: number
  name: string
  biome: string
  path: Cell[]
  hills: Cell[]
  entry: Cell
  exit: Cell
  draft: { forced: string[] | null }
  onboarding?: boolean
  waves: WaveDef[]
}
```

- [ ] **Étape 2 : Écrire `src/data/load.ts`**

```ts
import balanceJson from '../../data/balance.json'
import axiesJson from '../../data/axies.json'
import l01 from '../../data/levels/01.json'
import l02 from '../../data/levels/02.json'
import l03 from '../../data/levels/03.json'
import l04 from '../../data/levels/04.json'
import l05 from '../../data/levels/05.json'
import l06 from '../../data/levels/06.json'
import l07 from '../../data/levels/07.json'
import l08 from '../../data/levels/08.json'
import type { AxieDef, Balance, LevelDef } from './types'

export const BALANCE = balanceJson as unknown as Balance
export const AXIES = (axiesJson as unknown as { axies: AxieDef[] }).axies
export const LEVELS = [l01, l02, l03, l04, l05, l06, l07, l08] as unknown as LevelDef[]

/** Axies jouables en v1 : Dusk est exclu (GDD §9.3). */
export const PLAYABLE = AXIES.filter((a) => a.class !== 'dusk')

const byId = new Map(AXIES.map((a) => [a.id, a]))

export function axieDef(id: string): AxieDef {
  const a = byId.get(id)
  if (!a) throw new Error(`Axie inconnu : ${id}`)
  return a
}

export function levelDef(id: number): LevelDef {
  const l = LEVELS.find((x) => x.id === id)
  if (!l) throw new Error(`Niveau inconnu : ${id}`)
  return l
}

/** Nombre total d'étoiles possibles sur la campagne. */
export const MAX_STARS = LEVELS.length * 3
```

- [ ] **Étape 3 : Écrire le test `tests/data.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { AXIES, BALANCE, LEVELS, MAX_STARS, PLAYABLE, axieDef, levelDef } from '../src/data/load'

describe('données', () => {
  it('charge 20 Axies dont 19 jouables', () => {
    expect(AXIES).toHaveLength(20)
    expect(PLAYABLE).toHaveLength(19)
  })

  it('donne 6 Axies au départ, un par classe', () => {
    const start = PLAYABLE.filter((a) => a.unlock.type === 'start')
    expect(start).toHaveLength(6)
    expect(new Set(start.map((a) => a.class)).size).toBe(6)
  })

  it('charge 8 niveaux et 24 étoiles au maximum', () => {
    expect(LEVELS).toHaveLength(8)
    expect(MAX_STARS).toBe(24)
  })

  it('déclare 6 classes et 20 chimères', () => {
    expect(Object.keys(BALANCE.classes)).toHaveLength(6)
    expect(Object.keys(BALANCE.enemies)).toHaveLength(20)
  })

  it('rend le triangle cohérent : chaque classe bat exactement deux classes', () => {
    for (const [cls, beaten] of Object.entries(BALANCE.triangle.beats)) {
      expect(beaten, cls).toHaveLength(2)
      expect(beaten).not.toContain(cls)
    }
  })

  it('utilise un pas fixe de 30 Hz sans aléa', () => {
    expect(BALANCE.sim.tick_hz).toBe(30)
    expect(BALANCE.sim.no_randomness).toBe(true)
  })

  it('lève une erreur nommée sur un identifiant inconnu', () => {
    expect(() => axieDef('inconnu')).toThrow('Axie inconnu : inconnu')
    expect(() => levelDef(99)).toThrow('Niveau inconnu : 99')
  })

  it('ne référence que des chimères connues dans les vagues', () => {
    for (const level of LEVELS) {
      for (const wave of level.waves) {
        for (const spawn of wave.spawns) {
          expect(BALANCE.enemies[spawn.enemy], `${level.id}/${spawn.enemy}`).toBeDefined()
        }
      }
    }
  })
})
```

- [ ] **Étape 4 : Lancer les tests**

```bash
cd axie-td && npm test
```

Attendu : 8 tests passent en plus des 4 de la tâche 1.

- [ ] **Étape 5 : Vérifier la compilation TypeScript**

```bash
cd axie-td && npx tsc --noEmit
```

Attendu : aucune erreur. Si `resolveJsonModule` se plaint de la profondeur du type, c'est normal : les `as unknown as` de `load.ts` sont là pour ça.

- [ ] **Étape 6 : Commiter**

```bash
cd axie-td && git add -A && git commit -m "feat: types et chargement validé des données de jeu"
```

---

## Tâche 3 : Grille, chemin et géométrie

**Fichiers :**
- Créer : `src/sim/grid.ts`
- Test : `tests/sim/grid.test.ts`

**Interfaces :**
- Consomme : `Cell`, `LevelDef` de `src/data/types.ts`.
- Produit :
  - `type Vec = { x: number; y: number }`
  - `function center(cell: Cell): Vec` — centre d'une case, en unités de case
  - `function dist(a: Vec, b: Vec): number`
  - `function sameCell(a: Cell, b: Cell): boolean`
  - `function orthNeighbors(cell: Cell, cols: number, rows: number): Cell[]`
  - `function isOrthAdjacent(a: Cell, b: Cell): boolean`
  - `class Board` avec `kindAt(cell): CellKind | null`, `pathIndexOf(cell): number`, `posAt(d): Vec`, `cellAt(d): Cell`, `length: number`

**Conventions posées ici, valables pour tout le projet :**
- Le centre de la case `[c, r]` est `(c + 0.5, r + 0.5)`. Une unité = une case.
- La progression d'un ennemi est un nombre `d` de 0 à `path.length - 1`. À `d = 0` il est sur la case d'entrée, à `d = path.length - 1` il atteint la sortie et fuit.
- `posAt(d)` interpole linéairement entre `center(path[i])` et `center(path[i+1])`.

- [ ] **Étape 1 : Écrire le test `tests/sim/grid.test.ts` (il doit échouer)**

```ts
import { describe, expect, it } from 'vitest'
import { Board, center, dist, isOrthAdjacent, orthNeighbors } from '../../src/sim/grid'
import { levelDef } from '../../src/data/load'

describe('géométrie', () => {
  it('place le centre d’une case à un demi-pas', () => {
    expect(center([0, 0])).toEqual({ x: 0.5, y: 0.5 })
    expect(center([3, 6])).toEqual({ x: 3.5, y: 6.5 })
  })

  it('mesure la distance en cases', () => {
    expect(dist(center([0, 0]), center([3, 0]))).toBe(3)
    expect(dist(center([0, 0]), center([3, 4]))).toBe(5)
  })

  it('ne compte que les 4 voisins orthogonaux', () => {
    expect(orthNeighbors([3, 3], 7, 10)).toHaveLength(4)
    expect(orthNeighbors([0, 0], 7, 10)).toHaveLength(2)
    expect(isOrthAdjacent([3, 3], [3, 4])).toBe(true)
    expect(isOrthAdjacent([3, 3], [4, 4])).toBe(false)
    expect(isOrthAdjacent([3, 3], [3, 3])).toBe(false)
  })
})

describe('plateau', () => {
  const board = new Board(levelDef(3))

  it('classe chaque case', () => {
    expect(board.kindAt(levelDef(3).path[0])).toBe('path')
    expect(board.kindAt(levelDef(3).hills[0])).toBe('hill')
    expect(board.kindAt([6, 6])).toBe('plain')
    expect(board.kindAt([9, 9])).toBeNull()
  })

  it('donne l’index d’une case de chemin, -1 sinon', () => {
    expect(board.pathIndexOf(levelDef(3).path[4])).toBe(4)
    expect(board.pathIndexOf([6, 6])).toBe(-1)
  })

  it('interpole la position le long du chemin', () => {
    const p = levelDef(3).path
    expect(board.posAt(0)).toEqual(center(p[0]))
    expect(board.posAt(1)).toEqual(center(p[1]))
    const half = board.posAt(0.5)
    expect(half.x).toBeCloseTo((center(p[0]).x + center(p[1]).x) / 2, 10)
    expect(half.y).toBeCloseTo((center(p[0]).y + center(p[1]).y) / 2, 10)
  })

  it('borne la progression aux deux extrémités', () => {
    expect(board.posAt(-5)).toEqual(center(levelDef(3).path[0]))
    expect(board.posAt(999)).toEqual(center(levelDef(3).path.at(-1)!))
    expect(board.cellAt(999)).toEqual(levelDef(3).path.at(-1))
  })
})
```

- [ ] **Étape 2 : Lancer le test pour vérifier qu'il échoue**

```bash
cd axie-td && npx vitest run tests/sim/grid.test.ts
```

Attendu : ÉCHEC avec `Failed to resolve import "../../src/sim/grid"`.

- [ ] **Étape 3 : Écrire `src/sim/grid.ts`**

```ts
import type { Cell, LevelDef } from '../data/types'

export type Vec = { x: number; y: number }
export type CellKind = 'path' | 'plain' | 'hill'

export function center(cell: Cell): Vec {
  return { x: cell[0] + 0.5, y: cell[1] + 0.5 }
}

export function dist(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function sameCell(a: Cell, b: Cell): boolean {
  return a[0] === b[0] && a[1] === b[1]
}

export function isOrthAdjacent(a: Cell, b: Cell): boolean {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1
}

export function orthNeighbors(cell: Cell, cols: number, rows: number): Cell[] {
  const out: Cell[] = []
  for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const c = cell[0] + dc
    const r = cell[1] + dr
    if (c >= 0 && c < cols && r >= 0 && r < rows) out.push([c, r])
  }
  return out
}

const key = (cell: Cell) => `${cell[0]},${cell[1]}`

/** Vue immuable d'un niveau : type de chaque case et géométrie du chemin. */
export class Board {
  readonly path: Cell[]
  readonly length: number
  private readonly pathIndex = new Map<string, number>()
  private readonly hills = new Set<string>()

  constructor(readonly level: LevelDef, readonly cols = 7, readonly rows = 10) {
    this.path = level.path
    this.length = level.path.length
    level.path.forEach((cell, i) => this.pathIndex.set(key(cell), i))
    for (const h of level.hills) this.hills.add(key(h))
  }

  /** `null` si la case est hors grille. */
  kindAt(cell: Cell): CellKind | null {
    const [c, r] = cell
    if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) return null
    const k = key(cell)
    if (this.pathIndex.has(k)) return 'path'
    if (this.hills.has(k)) return 'hill'
    return 'plain'
  }

  /** Index de la case sur le chemin, ou -1. */
  pathIndexOf(cell: Cell): number {
    return this.pathIndex.get(key(cell)) ?? -1
  }

  private clamp(d: number): number {
    return Math.min(Math.max(d, 0), this.length - 1)
  }

  /** Position continue à la progression `d`, bornée aux extrémités. */
  posAt(d: number): Vec {
    const c = this.clamp(d)
    const i = Math.min(Math.floor(c), this.length - 1)
    const t = c - i
    const a = center(this.path[i])
    if (t === 0 || i + 1 >= this.length) return a
    const b = center(this.path[i + 1])
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
  }

  /** Case occupée à la progression `d`. */
  cellAt(d: number): Cell {
    return this.path[Math.min(Math.floor(this.clamp(d)), this.length - 1)]
  }
}
```

- [ ] **Étape 4 : Lancer le test pour vérifier qu'il passe**

```bash
cd axie-td && npx vitest run tests/sim/grid.test.ts
```

Attendu : 7 tests passent.

- [ ] **Étape 5 : Commiter**

```bash
cd axie-td && git add -A && git commit -m "feat: géométrie de la grille et du chemin"
```

---

## Tâche 4 : Monde, apparition et déplacement des ennemis

**Fichiers :**
- Créer : `src/sim/types.ts`, `src/sim/world.ts`, `src/sim/spawn.ts`, `src/sim/movement.ts`
- Test : `tests/sim/movement.test.ts`

**Interfaces :**
- Consomme : `Board` de `src/sim/grid.ts`, `BALANCE`/`levelDef` de `src/data/load.ts`.
- Produit :
  - `const DT = 1 / 30`
  - `type AxieUnit`, `type EnemyUnit`, `type SimEvent`, `type World` (voir le code de l'étape 1, les tâches suivantes s'appuient sur ces champs exacts)
  - `function createWorld(levelId: number): World`
  - `function startWave(w: World): void`
  - `function spawnDue(w: World): void`
  - `function moveEnemies(w: World): void`
  - `function effectiveSpeed(w: World, e: EnemyUnit): number`

**Règle de fuite :** un ennemi fuit quand `d >= board.length - 1`. Il retire `leak_damage[tier]` PV au niveau, soit 1, 2 ou 3.

- [ ] **Étape 1 : Écrire `src/sim/types.ts`**

```ts
import type { Cell, ClassId, EnemyDef, Line, StatusId, Tier } from '../data/types'
import type { CellKind } from './grid'

export const DT = 1 / 30

export type StatusInstance = {
  id: StatusId
  /** Secondes restantes. `Infinity` pour un statut recalculé chaque tick (Racines). */
  remaining: number
  /** Multiplicateur de cadence de tick, 2 sous l'aura Essaim. */
  tickMult: number
  /** Dégâts par seconde, pour Poison et Saignement. */
  dps: number
}

export type EffectiveStats = {
  damage: number
  rate: number
  range: number
  /** 1.3 si un voisin Bête donne Fureur, 1 sinon. */
  fury: number
  /** vrai si un voisin Aquatique donne Marée. */
  tide: boolean
  /** 2 si un voisin Insecte donne Essaim, 1 sinon. */
  swarm: number
}

export type AxieUnit = {
  uid: number
  axieId: string
  cls: ClassId
  line: Line
  cell: Cell
  kind: CellKind
  /** Index sur le chemin si l'Axie bloque, -1 sinon. */
  pathIndex: number
  cost: number
  maxHp: number
  hp: number
  baseDamage: number
  baseRate: number
  baseRange: number
  cooldown: number
  rageStacks: number
  ko: boolean
  eff: EffectiveStats
}

export type EnemyUnit = {
  uid: number
  type: string
  def: EnemyDef
  cls: ClassId
  tier: Tier
  maxHp: number
  hp: number
  /** Progression le long du chemin, en cases. */
  d: number
  statuses: StatusInstance[]
  shootCd: number
  aoeCd: number
  enraged: boolean
  /** uid de l'Axie qui le bloque, -1 sinon. */
  blockedBy: number
  alive: boolean
}

export type SimEvent =
  | { k: 'attack'; from: number; to: number; cls: ClassId }
  | { k: 'damage'; uid: number; amount: number; kind: 'normal' | 'crit' | 'poison' | 'bleed' }
  | { k: 'status'; uid: number; id: StatusId }
  | { k: 'reaction'; id: 'ricochet' | 'rooting' | 'shatter' | 'burst'; uid: number }
  | { k: 'enemyAttack'; uid: number; target: number }
  | { k: 'death'; uid: number }
  | { k: 'ko'; uid: number }
  | { k: 'leak'; uid: number; damage: number }
  | { k: 'waveEnd' }
  | { k: 'levelEnd'; stars: number }

export type Phase = 'placement' | 'wave' | 'won' | 'lost'
```

- [ ] **Étape 2 : Écrire `src/sim/world.ts`**

```ts
import { BALANCE, levelDef } from '../data/load'
import type { LevelDef, SpawnDef } from '../data/types'
import { Board } from './grid'
import type { AxieUnit, EnemyUnit, Phase, SimEvent } from './types'

export type World = {
  level: LevelDef
  board: Board
  /** Temps écoulé dans la vague en cours, en secondes. */
  t: number
  waveIndex: number
  lives: number
  axies: AxieUnit[]
  enemies: EnemyUnit[]
  /** Spawns de la vague en cours pas encore sortis, triés par temps croissant. */
  pending: SpawnDef[]
  /** Vidé par le rendu à chaque frame. */
  events: SimEvent[]
  nextUid: number
  phase: Phase
}

export function createWorld(levelId: number): World {
  const level = levelDef(levelId)
  return {
    level,
    board: new Board(level, BALANCE.grid.cols, BALANCE.grid.rows),
    t: 0,
    waveIndex: 0,
    lives: BALANCE.level.lives,
    axies: [],
    enemies: [],
    pending: [],
    events: [],
    nextUid: 1,
    phase: 'placement',
  }
}

/** Budget d'énergie de la vague à venir. */
export function currentBudget(w: World): number {
  return w.level.waves[Math.min(w.waveIndex, w.level.waves.length - 1)].budget
}

/** Passe de la phase de placement à la vague. Appelé par le bouton « Lancer ». */
export function startWave(w: World): void {
  if (w.phase !== 'placement') return
  const wave = w.level.waves[w.waveIndex]
  w.t = 0
  w.pending = [...wave.spawns].sort((a, b) => a.t - b.t)
  w.enemies = []
  w.phase = 'wave'
  for (const a of w.axies) {
    a.hp = a.maxHp
    a.ko = false
    a.cooldown = 0
    a.rageStacks = 0
  }
}
```

- [ ] **Étape 3 : Écrire `src/sim/spawn.ts`**

```ts
import { BALANCE } from '../data/load'
import type { EnemyUnit } from './types'
import type { World } from './world'

export function makeEnemy(w: World, type: string, d = 0): EnemyUnit {
  const def = BALANCE.enemies[type]
  if (!def) throw new Error(`Chimère inconnue : ${type}`)
  return {
    uid: w.nextUid++,
    type,
    def,
    cls: def.class,
    tier: def.tier,
    maxHp: def.hp,
    hp: def.hp,
    d,
    statuses: [],
    shootCd: def.ranged ? def.ranged.period : 0,
    aoeCd: def.aoe ? def.aoe.period : 0,
    enraged: false,
    blockedBy: -1,
    alive: true,
  }
}

/** Sort les ennemis dont l'heure d'apparition est passée. */
export function spawnDue(w: World): void {
  while (w.pending.length > 0 && w.pending[0].t <= w.t) {
    const spawn = w.pending.shift()!
    w.enemies.push(makeEnemy(w, spawn.enemy))
  }
}
```

- [ ] **Étape 4 : Écrire `src/sim/movement.ts`**

```ts
import { BALANCE } from '../data/load'
import { center, dist, isOrthAdjacent } from './grid'
import { DT, type EnemyUnit } from './types'
import type { World } from './world'

/** Vitesse de l'ennemi après meneur, Racines et enrage. */
export function effectiveSpeed(w: World, e: EnemyUnit): number {
  let speed = e.def.speed

  // Meneur : un allié voisin accélère les types qu'il commande.
  for (const other of w.enemies) {
    if (!other.alive || other.uid === e.uid || !other.def.leader) continue
    if (!other.def.leader.affects.includes(e.type)) continue
    if (dist(w.board.posAt(other.d), w.board.posAt(e.d)) <= other.def.leader.radius) {
      speed *= other.def.leader.speed_mult
      break
    }
  }

  if (e.enraged && e.def.enrage) speed *= e.def.enrage.speed_mult

  // Racines : un Axie Plante voisin de la case occupée ralentit.
  const cell = w.board.cellAt(e.d)
  for (const a of w.axies) {
    if (a.ko || a.cls !== 'plant' || a.kind === 'hill') continue
    if (isOrthAdjacent(a.cell, cell)) {
      speed *= BALANCE.auras.roots.value!
      break
    }
  }

  return speed
}

/**
 * Progression maximale autorisée par les bloqueurs.
 * Le premier de la file s'arrête sur la case précédant le bloqueur, le suivant une case
 * plus tôt, et ainsi de suite. Ordre déterministe : par progression décroissante.
 */
export function blockLimits(w: World): Map<number, number> {
  const blockers = w.axies
    .filter((a) => !a.ko && a.pathIndex >= 0)
    .map((a) => a.pathIndex)
    .sort((a, b) => a - b)

  const limits = new Map<number, number>()
  if (blockers.length === 0) return limits

  const queued = new Map<number, number>()
  const ordered = [...w.enemies].filter((e) => e.alive).sort((a, b) => b.d - a.d || a.uid - b.uid)

  for (const e of ordered) {
    const k = blockers.find((idx) => idx > e.d)
    if (k === undefined) continue
    const slot = queued.get(k) ?? 0
    queued.set(k, slot + 1)
    limits.set(e.uid, Math.max(0, k - 1 - slot))
  }
  return limits
}

export function moveEnemies(w: World): void {
  const limits = blockLimits(w)
  const blockerAt = new Map<number, number>()
  for (const a of w.axies) if (!a.ko && a.pathIndex >= 0) blockerAt.set(a.pathIndex, a.uid)

  for (const e of w.enemies) {
    if (!e.alive) continue

    if (e.def.enrage && !e.enraged && e.hp <= e.maxHp * e.def.enrage.hp_below) {
      e.enraged = true
    }

    const limit = limits.get(e.uid)
    const target = e.d + effectiveSpeed(w, e) * DT
    e.d = limit === undefined ? target : Math.min(target, limit)

    // Bloqué si arrivé à sa limite et juste devant un bloqueur.
    if (limit !== undefined && e.d >= limit - 1e-9) {
      const uid = blockerAt.get(Math.round(limit) + 1)
      e.blockedBy = uid ?? -1
    } else {
      e.blockedBy = -1
    }

    if (e.d >= w.board.length - 1) {
      e.alive = false
      const damage = BALANCE.level.leak_damage[e.tier]
      w.lives -= damage
      w.events.push({ k: 'leak', uid: e.uid, damage })
    }
  }
}

/** Position visuelle d'un ennemi, en unités de case. */
export function enemyPos(w: World, e: EnemyUnit) {
  return w.board.posAt(e.d)
}

/** Position d'un Axie, en unités de case. */
export function axiePos(a: { cell: readonly [number, number] }) {
  return center(a.cell)
}
```

- [ ] **Étape 5 : Écrire le test `tests/sim/movement.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { createWorld, startWave } from '../../src/sim/world'
import { makeEnemy, spawnDue } from '../../src/sim/spawn'
import { blockLimits, moveEnemies } from '../../src/sim/movement'
import { DT } from '../../src/sim/types'
import { placeTestAxie } from './helpers'

describe('apparition', () => {
  it('sort les ennemis à leur heure, pas avant', () => {
    const w = createWorld(1)
    startWave(w)
    spawnDue(w)
    expect(w.enemies).toHaveLength(1) // le spawn à t = 0
    w.t = 1.4
    spawnDue(w)
    expect(w.enemies).toHaveLength(2) // celui de t = 1.5 n'est pas encore là
    w.t = 1.5
    spawnDue(w)
    expect(w.enemies).toHaveLength(2)
  })
})

describe('déplacement', () => {
  it('avance un slime à sa vitesse et le fait fuir au bout du chemin', () => {
    const w = createWorld(1)
    startWave(w)
    spawnDue(w)
    const slime = w.enemies[0]
    const steps = Math.ceil((w.board.length - 1) / (slime.def.speed * DT))
    for (let i = 0; i < steps; i++) {
      w.t += DT
      moveEnemies(w)
    }
    expect(slime.alive).toBe(false)
    expect(w.lives).toBe(2)
    expect(w.events.some((e) => e.k === 'leak')).toBe(true)
  })

  it('retire 3 PV quand un boss fuit', () => {
    const w = createWorld(8)
    startWave(w)
    w.enemies = [makeEnemy(w, 'bear-dad')]
    w.enemies[0].d = w.board.length - 1
    moveEnemies(w)
    expect(w.lives).toBe(0)
  })
})

describe('blocage', () => {
  it('arrête un ennemi devant le bloqueur', () => {
    const w = createWorld(1)
    placeTestAxie(w, 'olek', w.level.path[6])
    startWave(w)
    spawnDue(w)
    const slime = w.enemies[0]
    for (let i = 0; i < 300; i++) {
      w.t += DT
      moveEnemies(w)
    }
    expect(slime.alive).toBe(true)
    expect(slime.d).toBeCloseTo(5, 5) // s'arrête sur la case 5, le bloqueur est en 6
    expect(slime.blockedBy).toBeGreaterThan(0)
  })

  it('met les suivants en file, une case par ennemi', () => {
    const w = createWorld(1)
    placeTestAxie(w, 'olek', w.level.path[6])
    startWave(w)
    w.t = 10
    spawnDue(w)
    for (let i = 0; i < 600; i++) {
      w.t += DT
      moveEnemies(w)
    }
    const stopped = w.enemies.filter((e) => e.alive).sort((a, b) => b.d - a.d)
    expect(stopped[0].d).toBeCloseTo(5, 5)
    expect(stopped[1].d).toBeCloseTo(4, 5)
    expect(stopped[2].d).toBeCloseTo(3, 5)
  })

  it('libère le passage quand le bloqueur est KO', () => {
    const w = createWorld(1)
    const olek = placeTestAxie(w, 'olek', w.level.path[6])
    startWave(w)
    spawnDue(w)
    for (let i = 0; i < 300; i++) { w.t += DT; moveEnemies(w) }
    expect(blockLimits(w).size).toBe(1)
    olek.ko = true
    expect(blockLimits(w).size).toBe(0)
    for (let i = 0; i < 60; i++) { w.t += DT; moveEnemies(w) }
    expect(w.enemies[0].d).toBeGreaterThan(5)
  })
})
```

- [ ] **Étape 6 : Écrire l'aide de test `tests/sim/helpers.ts`**

```ts
import { BALANCE, axieDef } from '../../src/data/load'
import type { Cell, ClassId } from '../../src/data/types'
import type { AxieUnit } from '../../src/sim/types'
import type { World } from '../../src/sim/world'

/**
 * Pose un Axie sans passer par les règles de budget, pour isoler ce qu'un test mesure.
 * Les tests de budget et de validité de case sont dans tests/sim/placement.test.ts.
 */
export function placeTestAxie(w: World, axieId: string, cell: Cell): AxieUnit {
  const def = axieDef(axieId)
  const cls = def.class as ClassId
  const c = BALANCE.classes[cls]
  const unit: AxieUnit = {
    uid: w.nextUid++,
    axieId,
    cls,
    line: c.line,
    cell,
    kind: w.board.kindAt(cell) ?? 'plain',
    pathIndex: w.board.pathIndexOf(cell),
    cost: c.cost,
    maxHp: Math.round(c.hp * (1 + def.bonuses.hp)),
    hp: Math.round(c.hp * (1 + def.bonuses.hp)),
    baseDamage: c.damage * (1 + def.bonuses.damage),
    baseRate: c.rate * (1 + def.bonuses.rate),
    baseRange: c.range,
    cooldown: 0,
    rageStacks: 0,
    ko: false,
    eff: { damage: 0, rate: 0, range: 0, fury: 1, tide: false, swarm: 1 },
  }
  unit.eff = {
    damage: unit.baseDamage,
    rate: unit.baseRate,
    range: unit.baseRange,
    fury: 1,
    tide: false,
    swarm: 1,
  }
  w.axies.push(unit)
  return unit
}
```

- [ ] **Étape 7 : Lancer les tests**

```bash
cd axie-td && npx vitest run tests/sim/movement.test.ts
```

Attendu : 6 tests passent. Si le test de file échoue avec des valeurs décalées d'une case, vérifier `blockLimits` : la limite du premier de la file est `k - 1`, pas `k`.

- [ ] **Étape 8 : Commiter**

```bash
cd axie-td && git add -A && git commit -m "feat: monde, apparition, déplacement et blocage des ennemis"
```

---

## Tâche 5 : Ciblage, dégâts, armure et triangle

**Fichiers :**
- Créer : `src/sim/targeting.ts`, `src/sim/combat.ts`
- Test : `tests/sim/combat.test.ts`

**Interfaces :**
- Consomme : `World`, `AxieUnit`, `EnemyUnit`, `Board`.
- Produit :
  - `function triangleMult(attacker: ClassId, target: ClassId): number`
  - `function effectiveArmor(e: EnemyUnit, w: World): number`
  - `function pickTarget(w: World, a: AxieUnit): EnemyUnit | null`
  - `function pickAxieTarget(w: World, e: EnemyUnit, range: number, hitsHill: boolean): AxieUnit | null`
  - `function damageEnemy(w: World, e: EnemyUnit, raw: number, opts): boolean` — renvoie `true` si l'ennemi meurt
  - `function damageAxie(w: World, a: AxieUnit, raw: number, from: ClassId | null): void`

**Ordre de ciblage d'un Axie (déterministe) :** parmi les ennemis vivants à portée, d'abord ceux marqués par Plume, puis le plus avancé (`d` le plus grand), puis le plus petit `uid` en cas d'égalité.

- [ ] **Étape 1 : Écrire le test `tests/sim/combat.test.ts` (il doit échouer)**

```ts
import { describe, expect, it } from 'vitest'
import { createWorld, startWave } from '../../src/sim/world'
import { makeEnemy } from '../../src/sim/spawn'
import { damageAxie, damageEnemy, effectiveArmor, triangleMult } from '../../src/sim/combat'
import { pickTarget } from '../../src/sim/targeting'
import { placeTestAxie } from './helpers'

describe('triangle', () => {
  it('donne 1.15 en avantage, 0.85 en désavantage, 1 sinon', () => {
    expect(triangleMult('beast', 'plant')).toBeCloseTo(1.15)
    expect(triangleMult('plant', 'beast')).toBeCloseTo(0.85)
    expect(triangleMult('beast', 'bug')).toBe(1)
  })
})

describe('armure', () => {
  it('réduit les dégâts directs', () => {
    const w = createWorld(5)
    const treant = makeEnemy(w, 'treant') // 40 % d'armure
    expect(effectiveArmor(treant, w)).toBeCloseTo(0.4)
    damageEnemy(w, treant, 100, { from: null })
    expect(treant.hp).toBeCloseTo(300 - 60)
  })

  it('est ignorée par le poison', () => {
    const w = createWorld(5)
    const treant = makeEnemy(w, 'treant')
    damageEnemy(w, treant, 100, { from: null, ignoresArmor: true })
    expect(treant.hp).toBeCloseTo(200)
  })
})

describe('ciblage', () => {
  it('vise le plus avancé à portée', () => {
    const w = createWorld(1)
    const momo = placeTestAxie(w, 'momo', [3, 3])
    startWave(w)
    const a = makeEnemy(w, 'slime'); a.d = 2
    const b = makeEnemy(w, 'slime'); b.d = 5
    w.enemies.push(a, b)
    const target = pickTarget(w, momo)
    expect(target).not.toBeNull()
    expect(target!.d).toBeGreaterThanOrEqual(a.d)
  })

  it('ne vise rien hors de portée', () => {
    const w = createWorld(1)
    const olek = placeTestAxie(w, 'olek', [6, 9]) // portée 1
    startWave(w)
    const e = makeEnemy(w, 'slime'); e.d = 0
    w.enemies.push(e)
    expect(pickTarget(w, olek)).toBeNull()
  })

  it('donne la priorité à une cible marquée par Plume', () => {
    const w = createWorld(1)
    const momo = placeTestAxie(w, 'momo', [3, 3])
    startWave(w)
    const far = makeEnemy(w, 'slime'); far.d = 6
    const marked = makeEnemy(w, 'slime'); marked.d = 3
    marked.statuses.push({ id: 'feather', remaining: 3, tickMult: 1, dps: 0 })
    w.enemies.push(far, marked)
    // les deux à portée : la marque gagne sur l'avancement
    const t = pickTarget(w, momo)
    expect(t!.uid).toBe(marked.uid)
  })
})

describe('mort et KO', () => {
  it('marque un ennemi mort et émet l’événement', () => {
    const w = createWorld(1)
    const e = makeEnemy(w, 'slime')
    w.enemies.push(e)
    const died = damageEnemy(w, e, 999, { from: null })
    expect(died).toBe(true)
    expect(e.alive).toBe(false)
    expect(w.events.some((ev) => ev.k === 'death' && ev.uid === e.uid)).toBe(true)
  })

  it('met un Axie KO à 0 PV sans le supprimer', () => {
    const w = createWorld(1)
    const olek = placeTestAxie(w, 'olek', w.level.path[4])
    damageAxie(w, olek, 9999, null)
    expect(olek.ko).toBe(true)
    expect(olek.hp).toBe(0)
    expect(w.axies).toHaveLength(1)
    expect(w.events.some((ev) => ev.k === 'ko')).toBe(true)
  })
})
```

- [ ] **Étape 2 : Lancer le test pour vérifier qu'il échoue**

```bash
cd axie-td && npx vitest run tests/sim/combat.test.ts
```

Attendu : ÉCHEC sur l'import de `../../src/sim/combat`.

- [ ] **Étape 3 : Écrire `src/sim/targeting.ts`**

```ts
import { BALANCE } from '../data/load'
import { center, dist } from './grid'
import type { AxieUnit, EnemyUnit } from './types'
import type { World } from './world'

function hasFeather(e: EnemyUnit): boolean {
  return e.statuses.some((s) => s.id === 'feather')
}

/** Cible d'un Axie : marquée par Plume d'abord, puis la plus avancée, puis le plus petit uid. */
export function pickTarget(w: World, a: AxieUnit): EnemyUnit | null {
  if (a.ko) return null
  const from = center(a.cell)
  let best: EnemyUnit | null = null
  for (const e of w.enemies) {
    if (!e.alive) continue
    if (dist(from, w.board.posAt(e.d)) > a.eff.range) continue
    if (best === null) { best = e; continue }
    const fe = hasFeather(e)
    const fb = hasFeather(best)
    if (fe !== fb) { if (fe) best = e; continue }
    if (e.d !== best.d) { if (e.d > best.d) best = e; continue }
    if (e.uid < best.uid) best = e
  }
  return best
}

/** Cible d'un ennemi à distance : l'Axie le plus proche à portée, puis le plus petit uid. */
export function pickAxieTarget(w: World, e: EnemyUnit, range: number, hitsHill: boolean): AxieUnit | null {
  const from = w.board.posAt(e.d)
  let best: AxieUnit | null = null
  let bestD = Infinity
  for (const a of w.axies) {
    if (a.ko) continue
    if (a.kind === 'hill' && !hitsHill) continue
    const d = dist(from, center(a.cell))
    if (d > range) continue
    if (d < bestD || (d === bestD && best !== null && a.uid < best.uid)) {
      best = a
      bestD = d
    }
  }
  return best
}

/** Ennemis vivants dans un rayon autour d'un point, hors `exceptUid`. */
export function enemiesInRadius(w: World, at: { x: number; y: number }, radius: number, exceptUid = -1): EnemyUnit[] {
  return w.enemies
    .filter((e) => e.alive && e.uid !== exceptUid && dist(at, w.board.posAt(e.d)) <= radius)
    .sort((a, b) => b.d - a.d || a.uid - b.uid)
}

export const GRID = BALANCE.grid
```

- [ ] **Étape 4 : Écrire `src/sim/combat.ts`**

```ts
import { BALANCE } from '../data/load'
import type { ClassId } from '../data/types'
import type { AxieUnit, EnemyUnit } from './types'
import { isOrthAdjacent } from './grid'
import type { World } from './world'

export function triangleMult(attacker: ClassId, target: ClassId): number {
  const beats = BALANCE.triangle.beats
  if (beats[attacker]?.includes(target)) return BALANCE.triangle.advantage
  if (beats[target]?.includes(attacker)) return BALANCE.triangle.disadvantage
  return 1
}

/** Armure de l'ennemi après Fragile et après l'aura Écailles des Reptiles voisins. */
export function effectiveArmor(e: EnemyUnit, w: World): number {
  let armor = e.def.armor
  if (e.statuses.some((s) => s.id === 'fragile')) {
    armor *= BALANCE.statuses.fragile.value ?? 0.5
  }
  const cell = w.board.cellAt(e.d)
  for (const a of w.axies) {
    if (a.ko || a.cls !== 'reptile' || a.kind === 'hill') continue
    if (isOrthAdjacent(a.cell, cell)) {
      armor += (BALANCE.auras.scales.value ?? -15) / 100
      break
    }
  }
  return Math.min(1, Math.max(0, armor))
}

export type DamageOpts = {
  /** Classe de l'attaquant, pour le triangle. `null` pour un dégât sans classe. */
  from: ClassId | null
  ignoresArmor?: boolean
  kind?: 'normal' | 'crit' | 'poison' | 'bleed'
}

/** Applique des dégâts à un ennemi. Renvoie `true` s'il meurt de ce coup. */
export function damageEnemy(w: World, e: EnemyUnit, raw: number, opts: DamageOpts): boolean {
  if (!e.alive) return false
  let amount = raw
  if (opts.from) amount *= triangleMult(opts.from, e.cls)
  if (!opts.ignoresArmor) amount *= 1 - effectiveArmor(e, w)
  if (e.statuses.some((s) => s.id === 'wet')) {
    amount *= BALANCE.statuses.wet.value ?? 1.2
  }
  e.hp -= amount
  w.events.push({ k: 'damage', uid: e.uid, amount, kind: opts.kind ?? 'normal' })
  if (e.hp <= 0) {
    e.hp = 0
    e.alive = false
    w.events.push({ k: 'death', uid: e.uid })
    return true
  }
  return false
}

/** Applique des dégâts à un Axie. Un Axie à 0 PV est KO, pas supprimé. */
export function damageAxie(w: World, a: AxieUnit, raw: number, from: ClassId | null): void {
  if (a.ko) return
  let amount = raw
  if (from) amount *= triangleMult(from, a.cls)
  a.hp -= amount
  if (a.hp <= 0) {
    a.hp = 0
    a.ko = true
    w.events.push({ k: 'ko', uid: a.uid })
  }
}
```

- [ ] **Étape 5 : Lancer le test**

```bash
cd axie-td && npx vitest run tests/sim/combat.test.ts
```

Attendu : 8 tests passent.

- [ ] **Étape 6 : Commiter**

```bash
cd axie-td && git add -A && git commit -m "feat: ciblage, dégâts, armure et triangle de classes"
```

---

## Tâche 6 : Statuts et dégâts sur la durée

**Fichiers :**
- Créer : `src/sim/status.ts`
- Test : `tests/sim/status.test.ts`

**Interfaces :**
- Consomme : `damageEnemy` de `src/sim/combat.ts`.
- Produit : `applyStatus(w, e, id, opts?)`, `hasStatus(e, id)`, `tickStatuses(w)`, `refreshRoots(w)`.

**Règles (GDD §6.1) :** Trempé 4 s et +20 % de dégâts subis. Racines recalculé chaque tick selon la présence d'une Plante voisine. Plume 3 s. Poison 4 s à 4 dégâts par seconde, ignore l'armure. Saignement 3 s à 6 par seconde, seulement sur une cible déjà empoisonnée. Fragile 5 s, armure divisée par deux. Un statut réappliqué rafraîchit sa durée, il ne s'empile pas. L'aura Essaim double la cadence des DoT posés par un voisin de l'Insecte : le multiplicateur est figé au moment de l'application.

- [ ] **Étape 1 : Écrire le test `tests/sim/status.test.ts` (il doit échouer)**

```ts
import { describe, expect, it } from 'vitest'
import { createWorld, startWave } from '../../src/sim/world'
import { makeEnemy } from '../../src/sim/spawn'
import { applyStatus, hasStatus, refreshRoots, tickStatuses } from '../../src/sim/status'
import { DT } from '../../src/sim/types'
import { placeTestAxie } from './helpers'

function ticks(w: ReturnType<typeof createWorld>, seconds: number) {
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    w.t += DT
    tickStatuses(w)
  }
}

describe('statuts', () => {
  it('fait expirer Trempé au bout de 4 secondes', () => {
    const w = createWorld(1)
    const e = makeEnemy(w, 'slime'); w.enemies.push(e)
    applyStatus(w, e, 'wet')
    expect(hasStatus(e, 'wet')).toBe(true)
    ticks(w, 3.8)
    expect(hasStatus(e, 'wet')).toBe(true)
    ticks(w, 0.4)
    expect(hasStatus(e, 'wet')).toBe(false)
  })

  it('rafraîchit la durée au lieu de s’empiler', () => {
    const w = createWorld(1)
    const e = makeEnemy(w, 'slime'); w.enemies.push(e)
    applyStatus(w, e, 'poison')
    ticks(w, 3)
    applyStatus(w, e, 'poison')
    expect(e.statuses.filter((s) => s.id === 'poison')).toHaveLength(1)
    ticks(w, 3)
    expect(hasStatus(e, 'poison')).toBe(true)
  })

  it('inflige 4 dégâts par seconde en poison, sans tenir compte de l’armure', () => {
    const w = createWorld(5)
    const treant = makeEnemy(w, 'treant'); w.enemies.push(treant) // 40 % d'armure
    applyStatus(w, treant, 'poison')
    ticks(w, 1)
    expect(treant.maxHp - treant.hp).toBeCloseTo(4, 4)
  })

  it('double la cadence du poison sous l’aura Essaim', () => {
    const w = createWorld(1)
    const e = makeEnemy(w, 'slime'); w.enemies.push(e)
    applyStatus(w, e, 'poison', { tickMult: 2 })
    ticks(w, 1)
    expect(e.maxHp - e.hp).toBeCloseTo(8, 4)
  })

  it('pose Racines quand une Plante est voisine et le retire sinon', () => {
    const w = createWorld(1)
    const cell = w.level.path[3]
    const olek = placeTestAxie(w, 'olek', [cell[0] + 1, cell[1]])
    startWave(w)
    const e = makeEnemy(w, 'slime'); e.d = 3; w.enemies.push(e)
    refreshRoots(w)
    expect(hasStatus(e, 'roots')).toBe(true)
    olek.ko = true
    refreshRoots(w)
    expect(hasStatus(e, 'roots')).toBe(false)
  })

  it('n’applique pas Saignement sur une cible non empoisonnée', () => {
    const w = createWorld(1)
    const e = makeEnemy(w, 'slime'); w.enemies.push(e)
    applyStatus(w, e, 'bleed')
    expect(hasStatus(e, 'bleed')).toBe(false)
    applyStatus(w, e, 'poison')
    applyStatus(w, e, 'bleed')
    expect(hasStatus(e, 'bleed')).toBe(true)
  })

  it('tue un ennemi par le poison seul', () => {
    const w = createWorld(1)
    const e = makeEnemy(w, 'slime-forest-b'); w.enemies.push(e) // 30 PV
    for (let i = 0; i < 3; i++) { applyStatus(w, e, 'poison'); ticks(w, 4) }
    expect(e.alive).toBe(false)
  })
})
```

Si le test des Racines échoue parce que `[cell[0] + 1, cell[1]]` tombe sur le chemin ou hors grille, prendre `[cell[0] - 1, cell[1]]`. La case exacte n'a pas d'importance, seule compte l'adjacence orthogonale.

- [ ] **Étape 2 : Lancer le test pour vérifier qu'il échoue**

```bash
cd axie-td && npx vitest run tests/sim/status.test.ts
```

Attendu : ÉCHEC sur l'import de `../../src/sim/status`.

- [ ] **Étape 3 : Écrire `src/sim/status.ts`**

```ts
import { BALANCE } from '../data/load'
import type { StatusId } from '../data/types'
import { damageEnemy } from './combat'
import { isOrthAdjacent } from './grid'
import { DT, type EnemyUnit } from './types'
import type { World } from './world'

export function hasStatus(e: EnemyUnit, id: StatusId): boolean {
  return e.statuses.some((s) => s.id === id)
}

export type ApplyOpts = {
  /** 2 sous l'aura Essaim. Figé au moment de l'application. */
  tickMult?: number
  /** 2 sous la réaction Enracinement. */
  durationMult?: number
}

/**
 * Pose un statut ou rafraîchit sa durée. Saignement exige une cible déjà empoisonnée.
 * Racines n'est jamais posé par ici : il est recalculé par `refreshRoots`.
 */
export function applyStatus(w: World, e: EnemyUnit, id: StatusId, opts: ApplyOpts = {}): void {
  if (!e.alive) return
  if (id === 'bleed' && !hasStatus(e, 'poison')) return
  if (id === 'roots') return

  const def = BALANCE.statuses[id]
  const base = typeof def.duration === 'number' ? def.duration : 0
  const remaining = base * (opts.durationMult ?? 1)
  const tickMult = opts.tickMult ?? 1

  const existing = e.statuses.find((s) => s.id === id)
  if (existing) {
    existing.remaining = Math.max(existing.remaining, remaining)
    existing.tickMult = Math.max(existing.tickMult, tickMult)
  } else {
    e.statuses.push({ id, remaining, tickMult, dps: def.dps ?? 0 })
  }
  w.events.push({ k: 'status', uid: e.uid, id })
}

/**
 * Racines dépend de la position : recalculé à chaque tick.
 * Un Axie Plante sur une colline ne donne aucune aura (GDD §4).
 */
export function refreshRoots(w: World): void {
  const plants = w.axies.filter((a) => !a.ko && a.cls === 'plant' && a.kind !== 'hill')
  for (const e of w.enemies) {
    if (!e.alive) continue
    const cell = w.board.cellAt(e.d)
    const rooted = plants.some((a) => isOrthAdjacent(a.cell, cell))
    const idx = e.statuses.findIndex((s) => s.id === 'roots')
    if (rooted && idx < 0) {
      e.statuses.push({ id: 'roots', remaining: Infinity, tickMult: 1, dps: 0 })
      w.events.push({ k: 'status', uid: e.uid, id: 'roots' })
    } else if (!rooted && idx >= 0) {
      e.statuses.splice(idx, 1)
    }
  }
}

/** Applique les DoT et fait expirer les statuts à durée finie. */
export function tickStatuses(w: World): void {
  for (const e of w.enemies) {
    if (!e.alive) continue
    for (const s of [...e.statuses]) {
      if (s.dps > 0) {
        damageEnemy(w, e, s.dps * s.tickMult * DT, {
          from: null,
          ignoresArmor: true,
          kind: s.id === 'poison' ? 'poison' : 'bleed',
        })
        if (!e.alive) break
      }
      if (Number.isFinite(s.remaining)) {
        s.remaining -= DT
        if (s.remaining <= 0) {
          const i = e.statuses.indexOf(s)
          if (i >= 0) e.statuses.splice(i, 1)
        }
      }
    }
  }
}
```

- [ ] **Étape 4 : Lancer le test**

```bash
cd axie-td && npx vitest run tests/sim/status.test.ts
```

Attendu : 7 tests passent. Si le poison sur le treant retire moins de 4 PV, c'est que `ignoresArmor` n'est pas transmis.

- [ ] **Étape 5 : Commiter**

```bash
cd axie-td && git add -A && git commit -m "feat: statuts, dégâts sur la durée et racines"
```

---

## Tâche 7 : Auras et anti-empilement

**Fichiers :**
- Créer : `src/sim/auras.ts`
- Test : `tests/sim/auras.test.ts`

**Interfaces :**
- Consomme : `isOrthAdjacent`, `axieDef`.
- Produit : `recomputeAuras(w)` qui met à jour `a.eff` de chaque Axie, et `auraSources(w, a)` qui donne les voisins retenus.

**Quand l'appeler :** après chaque pose, déplacement, retrait, KO et gain de Rage. Jamais à chaque tick : les auras ne dépendent que du placement. Les deux auras qui visent les ennemis, Racines et Écailles, vivent ailleurs, dans `refreshRoots` et `effectiveArmor`, parce qu'elles dépendent de la position des ennemis.

**Anti-empilement (GDD §5.3) :** deux voisins de la même classe ne donnent qu'une instance de leur aura. On retient le plus fort : la plus grande somme de bonus de parts, et à égalité le plus petit `uid`. La règle est déterministe et ne dépend pas de l'ordre du tableau.

**Colline :** un Axie posé là ne reçoit ni ne donne d'aura, et perd une case de portée.

- [ ] **Étape 1 : Écrire le test `tests/sim/auras.test.ts` (il doit échouer)**

```ts
import { describe, expect, it } from 'vitest'
import { BALANCE } from '../../src/data/load'
import { createWorld } from '../../src/sim/world'
import { auraSources, recomputeAuras } from '../../src/sim/auras'
import { placeTestAxie } from './helpers'

describe('auras', () => {
  it('donne +1 case de portée à un voisin sous Vent', () => {
    const w = createWorld(1)
    const puffy = placeTestAxie(w, 'puffy', [3, 3])
    placeTestAxie(w, 'momo', [3, 4])
    recomputeAuras(w)
    expect(puffy.eff.range).toBeCloseTo(puffy.baseRange + 1)
  })

  it('ne traverse pas la diagonale', () => {
    const w = createWorld(1)
    const puffy = placeTestAxie(w, 'puffy', [3, 3])
    placeTestAxie(w, 'momo', [4, 4])
    recomputeAuras(w)
    expect(puffy.eff.range).toBeCloseTo(puffy.baseRange)
  })

  it('n’empile pas deux voisins de la même classe', () => {
    const w = createWorld(1)
    const puffy = placeTestAxie(w, 'puffy', [3, 3])
    placeTestAxie(w, 'momo', [3, 4])
    placeTestAxie(w, 'dps-bird', [2, 3])
    recomputeAuras(w)
    expect(puffy.eff.range).toBeCloseTo(puffy.baseRange + 1) // +1, pas +2
  })

  it('cumule deux auras de classes différentes', () => {
    const w = createWorld(1)
    const momo = placeTestAxie(w, 'momo', [3, 3])
    placeTestAxie(w, 'puffy', [3, 4]) // Marée
    placeTestAxie(w, 'buba', [2, 3]) // Fureur
    recomputeAuras(w)
    expect(momo.eff.tide).toBe(true)
    expect(momo.eff.fury).toBeCloseTo(BALANCE.auras.fury.value!)
  })

  it('double la cadence des DoT sous Essaim', () => {
    const w = createWorld(1)
    const momo = placeTestAxie(w, 'momo', [3, 3])
    placeTestAxie(w, 'pomodoro', [3, 4])
    recomputeAuras(w)
    expect(momo.eff.swarm).toBe(2)
  })

  it('ignore un voisin KO', () => {
    const w = createWorld(1)
    const puffy = placeTestAxie(w, 'puffy', [3, 3])
    const momo = placeTestAxie(w, 'momo', [3, 4])
    momo.ko = true
    recomputeAuras(w)
    expect(puffy.eff.range).toBeCloseTo(puffy.baseRange)
  })

  it('coupe l’Axie sur colline de toute aura et lui retire une case de portée', () => {
    const w = createWorld(3)
    const hill = w.level.hills[0]
    const momo = placeTestAxie(w, 'momo', hill)
    placeTestAxie(w, 'buba', [hill[0], hill[1] - 1])
    recomputeAuras(w)
    expect(momo.kind).toBe('hill')
    expect(momo.eff.range).toBeCloseTo(momo.baseRange - 1)
    expect(momo.eff.fury).toBe(1)
    expect(auraSources(w, momo)).toHaveLength(0)
  })

  it('empêche un Axie sur colline de donner son aura', () => {
    const w = createWorld(3)
    const hill = w.level.hills[0]
    placeTestAxie(w, 'momo', hill)
    const puffy = placeTestAxie(w, 'puffy', [hill[0], hill[1] - 1])
    recomputeAuras(w)
    expect(puffy.eff.range).toBeCloseTo(puffy.baseRange)
  })
})
```

- [ ] **Étape 2 : Lancer le test pour vérifier qu'il échoue**

```bash
cd axie-td && npx vitest run tests/sim/auras.test.ts
```

Attendu : ÉCHEC sur l'import de `../../src/sim/auras`.

- [ ] **Étape 3 : Écrire `src/sim/auras.ts`**

```ts
import { BALANCE, axieDef } from '../data/load'
import type { ClassId } from '../data/types'
import { isOrthAdjacent } from './grid'
import type { AxieUnit } from './types'
import type { World } from './world'

/** Force d'un Axie comme source d'aura : somme de ses bonus de parts. */
function auraStrength(a: AxieUnit): number {
  const b = axieDef(a.axieId).bonuses
  return b.hp + b.damage + b.rate
}

/**
 * Voisins qui donnent effectivement une aura : un seul par classe, le plus fort.
 * Un Axie sur colline ne reçoit rien et ne donne rien.
 */
export function auraSources(w: World, a: AxieUnit): AxieUnit[] {
  if (a.ko || a.kind === 'hill') return []
  const best = new Map<ClassId, AxieUnit>()
  for (const other of w.axies) {
    if (other.uid === a.uid || other.ko || other.kind === 'hill') continue
    if (!isOrthAdjacent(a.cell, other.cell)) continue
    const cur = best.get(other.cls)
    if (!cur) { best.set(other.cls, other); continue }
    const sc = auraStrength(cur)
    const so = auraStrength(other)
    if (so > sc || (so === sc && other.uid < cur.uid)) best.set(other.cls, other)
  }
  return [...best.values()].sort((x, y) => x.uid - y.uid)
}

/** Recalcule `eff` de chaque Axie. À appeler après toute pose, retrait, KO ou gain de Rage. */
export function recomputeAuras(w: World): void {
  for (const a of w.axies) {
    const eff = {
      damage: a.baseDamage,
      rate: a.baseRate,
      range: a.baseRange,
      fury: 1,
      tide: false,
      swarm: 1,
    }

    // La colline coûte une case de portée, quoi qu'il arrive (GDD §4).
    if (a.kind === 'hill') eff.range -= BALANCE.cells.hill.range_penalty

    for (const src of auraSources(w, a)) {
      switch (src.cls) {
        case 'bird': eff.range += BALANCE.auras.wind.value ?? 1; break
        case 'beast': eff.fury = BALANCE.auras.fury.value ?? 1.3; break
        case 'aquatic': eff.tide = true; break
        case 'bug': eff.swarm = BALANCE.auras.swarm.value ?? 2; break
        // Plante (Racines) et Reptile (Écailles) visent les ennemis :
        // traitées dans refreshRoots et effectiveArmor.
        default: break
      }
    }

    // La Rage de l'Axie Bête s'ajoute à sa propre cadence.
    if (a.cls === 'beast' && a.rageStacks > 0) {
      eff.rate *= Math.pow(BALANCE.statuses.rage.value ?? 1.1, a.rageStacks)
    }

    eff.range = Math.max(0.5, eff.range)
    a.eff = eff
  }
}
```

- [ ] **Étape 4 : Lancer le test**

```bash
cd axie-td && npx vitest run tests/sim/auras.test.ts
```

Attendu : 8 tests passent. Si la case voisine de la colline tombe hors grille pour le niveau 3, remplacer `[hill[0], hill[1] - 1]` par `[hill[0] + 1, hill[1]]`.

- [ ] **Étape 5 : Commiter**

```bash
cd axie-td && git add -A && git commit -m "feat: auras d'adjacence et anti-empilement"
```

---

## Tâche 8 : Attaques des Axies et réactions en chaîne

**Fichiers :**
- Créer : `src/sim/reactions.ts`, `src/sim/axieActions.ts`
- Test : `tests/sim/reactions.test.ts`

**Interfaces :**
- Consomme : `pickTarget`, `enemiesInRadius`, `damageEnemy`, `applyStatus`, `recomputeAuras`.
- Produit : `axieAttack(w, a, target)` et `axieActions(w)`.

**Les 4 réactions (GDD §6.2) :** Oiseau sur cible Trempée donne Ricochet, jusqu'à 2 ennemis dans 1,5 case à 50 % des dégâts. Insecte sur cible sous Racines donne Enracinement, DoT de durée doublée. Bête sur cible Fragile donne Brisure, critique garanti ×2, seule source de critique du jeu. Bête qui achève une cible qui saigne donne Éclatement, 30 dégâts dans un rayon d'une case.

**Ordre à respecter dans `axieAttack` :** lire les statuts de la cible **avant** de frapper, appliquer les dégâts, poser les statuts de l'attaque, déclencher les réactions liées à la mort. Une réaction qui lit un statut posé par sa propre attaque serait un bug.

- [ ] **Étape 1 : Écrire le test `tests/sim/reactions.test.ts` (il doit échouer)**

```ts
import { describe, expect, it } from 'vitest'
import { createWorld, startWave } from '../../src/sim/world'
import { makeEnemy } from '../../src/sim/spawn'
import { recomputeAuras } from '../../src/sim/auras'
import { applyStatus, hasStatus } from '../../src/sim/status'
import { axieAttack } from '../../src/sim/axieActions'
import { placeTestAxie } from './helpers'

describe('réactions en chaîne', () => {
  it('fait ricocher l’Oiseau sur une cible Trempée', () => {
    const w = createWorld(1)
    const momo = placeTestAxie(w, 'momo', [3, 3])
    recomputeAuras(w)
    startWave(w)
    const main = makeEnemy(w, 'slime'); main.d = 3
    const near = makeEnemy(w, 'slime'); near.d = 3.5
    w.enemies.push(main, near)
    applyStatus(w, main, 'wet')
    const before = near.hp
    axieAttack(w, momo, main)
    expect(near.hp).toBeLessThan(before)
    expect(w.events.some((e) => e.k === 'reaction' && e.id === 'ricochet')).toBe(true)
  })

  it('ne ricoche pas sur une cible sèche', () => {
    const w = createWorld(1)
    const momo = placeTestAxie(w, 'momo', [3, 3])
    recomputeAuras(w)
    startWave(w)
    const main = makeEnemy(w, 'slime'); main.d = 3
    const near = makeEnemy(w, 'slime'); near.d = 3.5
    w.enemies.push(main, near)
    const before = near.hp
    axieAttack(w, momo, main)
    expect(near.hp).toBe(before)
  })

  it('double la durée du poison sur une cible enracinée', () => {
    const w = createWorld(1)
    const pomo = placeTestAxie(w, 'pomodoro', [3, 3])
    recomputeAuras(w)
    startWave(w)
    const e = makeEnemy(w, 'slime'); e.d = 3
    e.statuses.push({ id: 'roots', remaining: Infinity, tickMult: 1, dps: 0 })
    w.enemies.push(e)
    axieAttack(w, pomo, e)
    expect(e.statuses.find((s) => s.id === 'poison')!.remaining).toBeCloseTo(8)
    expect(w.events.some((ev) => ev.k === 'reaction' && ev.id === 'rooting')).toBe(true)
  })

  it('fait un critique de la Bête sur une cible Fragile', () => {
    const w = createWorld(5)
    const buba = placeTestAxie(w, 'buba', [3, 3])
    recomputeAuras(w)
    startWave(w)
    const plain = makeEnemy(w, 'treant'); plain.d = 3
    const frag = makeEnemy(w, 'treant'); frag.d = 3
    w.enemies.push(plain, frag)
    axieAttack(w, buba, plain)
    const normalLoss = plain.maxHp - plain.hp
    applyStatus(w, frag, 'fragile')
    axieAttack(w, buba, frag)
    const critLoss = frag.maxHp - frag.hp
    expect(critLoss).toBeGreaterThan(normalLoss * 1.9)
    expect(w.events.some((ev) => ev.k === 'reaction' && ev.id === 'shatter')).toBe(true)
  })

  it('fait exploser une cible qui saigne quand la Bête l’achève', () => {
    const w = createWorld(1)
    const buba = placeTestAxie(w, 'buba', [3, 3])
    recomputeAuras(w)
    startWave(w)
    const dying = makeEnemy(w, 'slime'); dying.d = 3; dying.hp = 1
    const near = makeEnemy(w, 'slime'); near.d = 3.4
    w.enemies.push(dying, near)
    applyStatus(w, dying, 'poison')
    applyStatus(w, dying, 'bleed')
    axieAttack(w, buba, dying)
    expect(dying.alive).toBe(false)
    expect(near.hp).toBeLessThan(near.maxHp)
    expect(w.events.some((ev) => ev.k === 'reaction' && ev.id === 'burst')).toBe(true)
  })

  it('applique Trempé via l’aura Marée d’un voisin Aquatique', () => {
    const w = createWorld(1)
    const momo = placeTestAxie(w, 'momo', [3, 3])
    placeTestAxie(w, 'puffy', [3, 4])
    recomputeAuras(w)
    startWave(w)
    const e = makeEnemy(w, 'slime'); e.d = 3
    w.enemies.push(e)
    axieAttack(w, momo, e)
    expect(hasStatus(e, 'wet')).toBe(true)
  })

  it('donne une charge de Rage à la Bête qui tue', () => {
    const w = createWorld(1)
    const buba = placeTestAxie(w, 'buba', [3, 3])
    recomputeAuras(w)
    startWave(w)
    const e = makeEnemy(w, 'slime'); e.d = 3; e.hp = 1
    w.enemies.push(e)
    axieAttack(w, buba, e)
    expect(buba.rageStacks).toBe(1)
    expect(buba.eff.rate).toBeGreaterThan(buba.baseRate)
  })
})
```

- [ ] **Étape 2 : Lancer le test pour vérifier qu'il échoue**

```bash
cd axie-td && npx vitest run tests/sim/reactions.test.ts
```

Attendu : ÉCHEC sur l'import de `../../src/sim/axieActions`.

- [ ] **Étape 3 : Écrire `src/sim/reactions.ts`**

```ts
import { BALANCE } from '../data/load'
import { damageEnemy } from './combat'
import { applyStatus } from './status'
import { enemiesInRadius } from './targeting'
import type { AxieUnit, EnemyUnit } from './types'
import type { World } from './world'

const R = BALANCE.reactions as unknown as {
  ricochet: { max_targets: number; radius: number; damage_mult: number }
  rooting: { value: number }
  shatter: { damage_mult: number }
  burst: { damage: number; radius: number }
}

/** Ricochet : l'Oiseau frappe une cible Trempée, le tir rebondit. */
export function ricochet(w: World, a: AxieUnit, target: EnemyUnit, baseDamage: number): void {
  const hit = enemiesInRadius(w, w.board.posAt(target.d), R.ricochet.radius, target.uid)
    .slice(0, R.ricochet.max_targets)
  if (hit.length === 0) return
  w.events.push({ k: 'reaction', id: 'ricochet', uid: target.uid })
  for (const e of hit) {
    damageEnemy(w, e, baseDamage * R.ricochet.damage_mult, { from: a.cls })
    if (a.eff.tide) applyStatus(w, e, 'wet')
  }
}

/** Éclatement : la Bête achève une cible qui saigne. */
export function burst(w: World, target: EnemyUnit): void {
  w.events.push({ k: 'reaction', id: 'burst', uid: target.uid })
  for (const e of enemiesInRadius(w, w.board.posAt(target.d), R.burst.radius, target.uid)) {
    damageEnemy(w, e, R.burst.damage, { from: null })
  }
}

export const ROOTING_MULT = R.rooting.value
export const SHATTER_MULT = R.shatter.damage_mult
```

- [ ] **Étape 4 : Écrire `src/sim/axieActions.ts`**

```ts
import { BALANCE } from '../data/load'
import { recomputeAuras } from './auras'
import { damageEnemy } from './combat'
import { ROOTING_MULT, SHATTER_MULT, burst, ricochet } from './reactions'
import { applyStatus, hasStatus } from './status'
import { pickTarget } from './targeting'
import { DT, type AxieUnit, type EnemyUnit } from './types'
import type { World } from './world'

const MAX_RAGE = BALANCE.statuses.rage.max_stacks ?? 5

/** Une attaque complète : dégâts, statuts posés, réactions déclenchées. */
export function axieAttack(w: World, a: AxieUnit, target: EnemyUnit): void {
  if (a.ko || !target.alive) return

  // On lit les statuts avant de frapper : une réaction dépend de l'état d'avant.
  const wasWet = hasStatus(target, 'wet')
  const wasRooted = hasStatus(target, 'roots')
  const wasFragile = hasStatus(target, 'fragile')
  const wasBleeding = hasStatus(target, 'bleed')

  let damage = a.eff.damage

  // Fureur : +30 % contre une cible sous la moitié de ses PV.
  if (a.eff.fury > 1 && target.hp <= target.maxHp * (BALANCE.auras.fury.hp_threshold ?? 0.5)) {
    damage *= a.eff.fury
  }

  // Brisure : la Bête sur une cible Fragile fait un critique garanti.
  const crit = a.cls === 'beast' && wasFragile
  if (crit) {
    damage *= SHATTER_MULT
    w.events.push({ k: 'reaction', id: 'shatter', uid: target.uid })
  }

  const cls = BALANCE.classes[a.cls]
  w.events.push({ k: 'attack', from: a.uid, to: target.uid, cls: a.cls })

  const died = damageEnemy(w, target, damage, {
    from: a.cls,
    ignoresArmor: cls.ignores_armor === true,
    kind: crit ? 'crit' : 'normal',
  })

  // Enracinement : l'Insecte sur une cible ralentie double la durée de ses DoT.
  const durationMult = a.cls === 'bug' && wasRooted ? ROOTING_MULT : 1
  if (a.cls === 'bug' && wasRooted) {
    w.events.push({ k: 'reaction', id: 'rooting', uid: target.uid })
  }

  if (!died && cls.on_hit_status) {
    applyStatus(w, target, cls.on_hit_status, { tickMult: a.eff.swarm, durationMult })
    // L'Insecte pose Saignement dès que la cible est empoisonnée.
    if (a.cls === 'bug') applyStatus(w, target, 'bleed', { tickMult: a.eff.swarm, durationMult })
  }
  // Marée : un voisin Aquatique trempe les cibles touchées.
  if (!died && a.eff.tide) applyStatus(w, target, 'wet')

  // Ricochet : l'Oiseau sur une cible qui était Trempée.
  if (a.cls === 'bird' && wasWet) ricochet(w, a, target, damage)

  if (died) {
    if (a.cls === 'beast' && wasBleeding) burst(w, target)
    if (a.cls === 'beast' && a.rageStacks < MAX_RAGE) {
      a.rageStacks++
      recomputeAuras(w)
    }
  }
}

/** Fait tourner les cooldowns et déclenche les attaques dues. */
export function axieActions(w: World): void {
  for (const a of w.axies) {
    if (a.ko) continue
    a.cooldown -= DT
    if (a.cooldown > 0) continue
    const target = pickTarget(w, a)
    if (!target) { a.cooldown = 0; continue }
    axieAttack(w, a, target)
    a.cooldown += 1 / a.eff.rate
  }
}
```

- [ ] **Étape 5 : Lancer le test**

```bash
cd axie-td && npx vitest run tests/sim/reactions.test.ts
```

Attendu : 7 tests passent. Si la durée du poison vaut 4 au lieu de 8, `durationMult` n'arrive pas jusqu'à `applyStatus`.

- [ ] **Étape 6 : Commiter**

```bash
cd axie-td && git add -A && git commit -m "feat: attaques des Axies et quatre réactions en chaîne"
```

---

## Tâche 9 : Comportements des chimères

**Fichiers :**
- Modifier : `src/sim/spawn.ts` (copie de `def`, étape 4)
- Créer : `src/sim/enemies.ts`
- Test : `tests/sim/enemies.test.ts`

**Interfaces :**
- Consomme : `damageAxie`, `pickAxieTarget`, `makeEnemy`.
- Produit : `enemyActions(w)` et `resolveDeaths(w)`.

**Comportements (GDD §7.2) :** un ennemi bloqué inflige `melee_dps × dt` au bloqueur, triangle compris, et seul le premier de la file frappe. Le tir se fait en marchant, toutes les `period` secondes, sur l'Axie le plus proche à portée, `hits_hill` décidant si les collines sont atteignables. La zone du mage frappe tous les Axies de son rayon. Le soin est continu et plafonné aux PV maximum. `on_death_spawn` fait apparaître les scissions à la progression du mort. Le briseur de ligne n'a pas de code : son ×3 est déjà dans `melee_dps`.

- [ ] **Étape 1 : Écrire le test `tests/sim/enemies.test.ts` (il doit échouer)**

```ts
import { describe, expect, it } from 'vitest'
import { createWorld, startWave } from '../../src/sim/world'
import { makeEnemy } from '../../src/sim/spawn'
import { moveEnemies } from '../../src/sim/movement'
import { enemyActions, resolveDeaths } from '../../src/sim/enemies'
import { DT } from '../../src/sim/types'
import { placeTestAxie } from './helpers'

const near = (c: readonly [number, number]): [number, number] => [c[0] + 1, c[1]]

describe('chimères', () => {
  it('fait frapper le bloqueur par l’ennemi bloqué', () => {
    const w = createWorld(1)
    const olek = placeTestAxie(w, 'olek', w.level.path[6])
    startWave(w)
    const e = makeEnemy(w, 'slime'); e.d = 4; w.enemies.push(e)
    for (let i = 0; i < 120; i++) { w.t += DT; moveEnemies(w); enemyActions(w) }
    expect(olek.hp).toBeLessThan(olek.maxHp)
  })

  it('épargne les Axies en plaine de toute mêlée', () => {
    const w = createWorld(1)
    const olek = placeTestAxie(w, 'olek', w.level.path[6])
    const puffy = placeTestAxie(w, 'puffy', near(w.level.path[6]))
    startWave(w)
    const e = makeEnemy(w, 'slime'); e.d = 4; w.enemies.push(e)
    for (let i = 0; i < 120; i++) { w.t += DT; moveEnemies(w); enemyActions(w) }
    expect(olek.hp).toBeLessThan(olek.maxHp)
    expect(puffy.hp).toBe(puffy.maxHp)
  })

  it('fait tirer slime-attack sur un Axie à portée', () => {
    const w = createWorld(4)
    const puffy = placeTestAxie(w, 'puffy', near(w.level.path[3]))
    startWave(w)
    const e = makeEnemy(w, 'slime-attack'); e.d = 3; w.enemies.push(e)
    for (let i = 0; i < 90; i++) { w.t += DT; enemyActions(w) }
    expect(puffy.hp).toBeLessThan(puffy.maxHp)
  })

  it('empêche slime-attack d’atteindre une colline', () => {
    const w = createWorld(4)
    const momo = placeTestAxie(w, 'momo', w.level.hills[0])
    startWave(w)
    for (let d = 0; d < w.board.length; d++) {
      const e = makeEnemy(w, 'slime-attack'); e.d = d; w.enemies.push(e)
    }
    for (let i = 0; i < 120; i++) { w.t += DT; enemyActions(w) }
    expect(momo.hp).toBe(momo.maxHp)
  })

  it('laisse dryad-mage atteindre une colline', () => {
    const w = createWorld(6)
    const hill = w.level.hills[0]
    const momo = placeTestAxie(w, 'momo', hill)
    startWave(w)
    const e = makeEnemy(w, 'dryad-mage')
    e.d = nearestIndex(w, hill)
    w.enemies.push(e)
    for (let i = 0; i < 200; i++) { w.t += DT; enemyActions(w) }
    expect(momo.hp).toBeLessThan(momo.maxHp)
  })

  it('soigne les alliés proches sans dépasser leurs PV maximum', () => {
    const w = createWorld(4)
    startWave(w)
    const healer = makeEnemy(w, 'slime-support'); healer.d = 3
    const hurt = makeEnemy(w, 'slime'); hurt.d = 3; hurt.hp = 10
    w.enemies.push(healer, hurt)
    for (let i = 0; i < 300; i++) { w.t += DT; enemyActions(w) }
    expect(hurt.hp).toBe(hurt.maxHp)
  })

  it('scinde slime-fusion en deux slimes à sa mort', () => {
    const w = createWorld(8)
    startWave(w)
    const fusion = makeEnemy(w, 'slime-fusion'); fusion.d = 5
    w.enemies.push(fusion)
    fusion.alive = false
    resolveDeaths(w)
    const spawned = w.enemies.filter((e) => e.type === 'slime')
    expect(spawned).toHaveLength(2)
    expect(spawned[0].d).toBeCloseTo(5)
  })

  it('ne scinde pas deux fois le même mort', () => {
    const w = createWorld(8)
    startWave(w)
    const fusion = makeEnemy(w, 'slime-fusion'); fusion.d = 5; fusion.alive = false
    w.enemies.push(fusion)
    resolveDeaths(w)
    resolveDeaths(w)
    expect(w.enemies.filter((e) => e.type === 'slime')).toHaveLength(2)
  })

  it('retire les morts de la liste', () => {
    const w = createWorld(1)
    startWave(w)
    const a = makeEnemy(w, 'slime')
    const b = makeEnemy(w, 'slime'); b.alive = false
    w.enemies.push(a, b)
    resolveDeaths(w)
    expect(w.enemies).toHaveLength(1)
    expect(w.enemies[0].uid).toBe(a.uid)
  })
})

/** Index du chemin le plus proche d'une case, pour placer un tireur à portée. */
function nearestIndex(w: ReturnType<typeof createWorld>, cell: readonly [number, number]): number {
  let best = 0
  let bestD = Infinity
  for (let i = 0; i < w.board.length; i++) {
    const p = w.board.posAt(i)
    const d = Math.hypot(p.x - (cell[0] + 0.5), p.y - (cell[1] + 0.5))
    if (d < bestD) { bestD = d; best = i }
  }
  return best
}
```

- [ ] **Étape 2 : Lancer le test pour vérifier qu'il échoue**

```bash
cd axie-td && npx vitest run tests/sim/enemies.test.ts
```

Attendu : ÉCHEC sur l'import de `../../src/sim/enemies`.

- [ ] **Étape 3 : Écrire `src/sim/enemies.ts`**

```ts
import { damageAxie } from './combat'
import { center, dist } from './grid'
import { makeEnemy } from './spawn'
import { pickAxieTarget } from './targeting'
import { DT } from './types'
import type { World } from './world'

export function enemyActions(w: World): void {
  for (const e of w.enemies) {
    if (!e.alive) continue
    const from = w.board.posAt(e.d)

    // Mêlée : seulement contre le bloqueur qui l'arrête.
    if (e.blockedBy > 0) {
      const blocker = w.axies.find((a) => a.uid === e.blockedBy)
      if (blocker && !blocker.ko) {
        damageAxie(w, blocker, e.def.melee_dps * DT, e.cls)
        w.events.push({ k: 'enemyAttack', uid: e.uid, target: blocker.uid })
      }
    }

    // Tir : en marchant, sans s'arrêter.
    const ranged = e.def.ranged
    if (ranged) {
      e.shootCd -= DT
      if (e.shootCd <= 0) {
        const target = pickAxieTarget(w, e, ranged.range, ranged.hits_hill)
        if (target) {
          damageAxie(w, target, ranged.damage, e.cls)
          w.events.push({ k: 'enemyAttack', uid: e.uid, target: target.uid })
          e.shootCd += ranged.period
        } else {
          e.shootCd = 0
        }
      }
    }

    // Zone : le mage frappe tous les Axies de son rayon.
    const aoe = e.def.aoe
    if (aoe) {
      e.aoeCd -= DT
      if (e.aoeCd <= 0) {
        const hit = w.axies.filter(
          (a) => !a.ko && (a.kind !== 'hill' || aoe.hits_hill) && dist(from, center(a.cell)) <= aoe.radius,
        )
        if (hit.length > 0) {
          for (const a of hit) {
            damageAxie(w, a, aoe.damage, e.cls)
            w.events.push({ k: 'enemyAttack', uid: e.uid, target: a.uid })
          }
          e.aoeCd += aoe.period
        } else {
          e.aoeCd = 0
        }
      }
    }

    // Soin : continu, sur les alliés du rayon.
    const heal = e.def.heal
    if (heal) {
      for (const other of w.enemies) {
        if (!other.alive || other.uid === e.uid) continue
        if (heal.only && !heal.only.includes(other.type)) continue
        if (dist(from, w.board.posAt(other.d)) > heal.radius) continue
        other.hp = Math.min(other.maxHp, other.hp + heal.hps * DT)
      }
    }
  }
}

/** Applique les scissions puis retire les morts. À appeler en fin de tick. */
export function resolveDeaths(w: World): void {
  const spawned = []
  for (const e of w.enemies) {
    if (e.alive || !e.def.on_death_spawn) continue
    for (let i = 0; i < e.def.on_death_spawn.count; i++) {
      spawned.push(makeEnemy(w, e.def.on_death_spawn.enemy, e.d))
    }
    // `def` est une copie par instance (voir spawn.ts) : effacer ici n'affecte
    // que ce mort, pas les autres chimères du même type.
    e.def.on_death_spawn = undefined
  }
  w.enemies = w.enemies.filter((e) => e.alive)
  w.enemies.push(...spawned)
}
```

- [ ] **Étape 4 : Donner à chaque ennemi sa propre copie de `def`**

Sans cette copie, effacer `on_death_spawn` dans `resolveDeaths` casserait la scission de **tous** les slime-fusion suivants, puisque `def` vient de `BALANCE.enemies` et serait partagé. Dans `src/sim/spawn.ts`, remplacer la ligne `def,` par :

```ts
    def: { ...def },
```

- [ ] **Étape 5 : Lancer le test**

```bash
cd axie-td && npx vitest run tests/sim/enemies.test.ts
```

Attendu : 9 tests passent. Si le test du mage sur colline échoue, c'est que la colline est hors de son rayon d'une case depuis le chemin : prendre la seconde colline du niveau 6, `w.level.hills[1]`.

- [ ] **Étape 6 : Lancer toute la suite pour vérifier la non-régression**

```bash
cd axie-td && npm test
```

Attendu : tous les tests des tâches 1 à 9 passent.

- [ ] **Étape 7 : Commiter**

```bash
cd axie-td && git add -A && git commit -m "feat: comportements des chimères, tir, zone, soin et scission"
```

---

## Tâche 10 : Placement, budget et boucle de jeu

**Fichiers :**
- Créer : `src/sim/placement.ts`, `src/sim/game.ts`
- Test : `tests/sim/placement.test.ts`, `tests/sim/game.test.ts`

**Interfaces :**
- Consomme : tout ce qui précède.
- Produit : `canPlace`, `place`, `move`, `remove`, `spentEnergy`, `trimToBudget`, `step`, `runWave`, `runLevel`, `starsFor`.

**Ordre des systèmes dans un tick, à respecter :** `spawnDue`, `refreshRoots`, `tickStatuses`, `moveEnemies`, `enemyActions`, `axieActions`, `resolveDeaths`, puis le test de fin de vague. Changer cet ordre change le résultat des parties : c'est une décision de design, pas un détail.

**Règles de placement :** une case par Axie. Mêlée sur chemin ou plaine, distance sur plaine ou colline. Le total posé ne dépasse jamais le budget de la vague à venir. Rien ne se pose pendant une vague. Déplacer est gratuit, retirer rend l'énergie.

- [ ] **Étape 1 : Écrire `src/sim/placement.ts`**

```ts
import { BALANCE, axieDef } from '../data/load'
import type { Cell, ClassId } from '../data/types'
import { recomputeAuras } from './auras'
import type { AxieUnit } from './types'
import { currentBudget, type World } from './world'

export function spentEnergy(w: World): number {
  return w.axies.reduce((sum, a) => sum + a.cost, 0)
}

export type PlaceCheck = { ok: true } | { ok: false; reason: string }

/** `movingUid` >= 0 quand on déplace un Axie déjà posé : sa case et son coût sont ignorés. */
export function canPlace(w: World, axieId: string, cell: Cell, movingUid = -1): PlaceCheck {
  if (w.phase !== 'placement') return { ok: false, reason: 'La vague est en cours' }

  const def = axieDef(axieId)
  if (def.class === 'dusk') return { ok: false, reason: 'Cet Axie arrive plus tard' }
  const cls = def.class as ClassId
  const line = BALANCE.classes[cls].line

  const kind = w.board.kindAt(cell)
  if (kind === null) return { ok: false, reason: 'Hors du plateau' }
  if (!BALANCE.cells[kind].allowed_lines.includes(line)) {
    return {
      ok: false,
      reason: kind === 'path'
        ? 'Seules les classes de mêlée bloquent sur le chemin'
        : 'Seules les classes à distance tiennent une colline',
    }
  }

  const occupied = w.axies.some(
    (a) => a.uid !== movingUid && a.cell[0] === cell[0] && a.cell[1] === cell[1],
  )
  if (occupied) return { ok: false, reason: 'Case déjà occupée' }

  if (movingUid < 0 && spentEnergy(w) + BALANCE.classes[cls].cost > currentBudget(w)) {
    return { ok: false, reason: "Pas assez d'énergie" }
  }

  return { ok: true }
}

export function place(w: World, axieId: string, cell: Cell): AxieUnit | null {
  if (!canPlace(w, axieId, cell).ok) return null
  const def = axieDef(axieId)
  const cls = def.class as ClassId
  const c = BALANCE.classes[cls]
  const maxHp = Math.round(c.hp * (1 + def.bonuses.hp))

  const unit: AxieUnit = {
    uid: w.nextUid++,
    axieId,
    cls,
    line: c.line,
    cell,
    kind: w.board.kindAt(cell)!,
    pathIndex: w.board.pathIndexOf(cell),
    cost: c.cost,
    maxHp,
    hp: maxHp,
    baseDamage: c.damage * (1 + def.bonuses.damage),
    baseRate: c.rate * (1 + def.bonuses.rate),
    baseRange: c.range,
    cooldown: 0,
    rageStacks: 0,
    ko: false,
    eff: { damage: 0, rate: 0, range: 0, fury: 1, tide: false, swarm: 1 },
  }
  w.axies.push(unit)
  recomputeAuras(w)
  return unit
}

export function move(w: World, uid: number, cell: Cell): boolean {
  const a = w.axies.find((x) => x.uid === uid)
  if (!a || !canPlace(w, a.axieId, cell, uid).ok) return false
  a.cell = cell
  a.kind = w.board.kindAt(cell)!
  a.pathIndex = w.board.pathIndexOf(cell)
  recomputeAuras(w)
  return true
}

export function remove(w: World, uid: number): boolean {
  if (w.phase !== 'placement') return false
  const i = w.axies.findIndex((a) => a.uid === uid)
  if (i < 0) return false
  w.axies.splice(i, 1)
  recomputeAuras(w)
  return true
}

/**
 * Renvoie au bac les Axies qui ne rentrent plus dans le budget.
 * Les budgets sont croissants par design, donc ce cas ne devrait jamais arriver :
 * c'est un garde-fou contre une erreur de données.
 */
export function trimToBudget(w: World): void {
  while (spentEnergy(w) > currentBudget(w) && w.axies.length > 0) w.axies.pop()
  recomputeAuras(w)
}
```

- [ ] **Étape 2 : Écrire `src/sim/game.ts`**

```ts
import { BALANCE } from '../data/load'
import { recomputeAuras } from './auras'
import { axieActions } from './axieActions'
import { enemyActions, resolveDeaths } from './enemies'
import { moveEnemies } from './movement'
import { trimToBudget } from './placement'
import { spawnDue } from './spawn'
import { refreshRoots, tickStatuses } from './status'
import { DT } from './types'
import { startWave, type World } from './world'

export function starsFor(lives: number): number {
  return BALANCE.level.stars_by_lives[String(Math.max(0, lives))] ?? 0
}

/** Un pas de simulation de 1/30 seconde. L'ordre des appels fait partie du design. */
export function step(w: World): void {
  if (w.phase !== 'wave') return

  w.t += DT
  spawnDue(w)
  refreshRoots(w)
  tickStatuses(w)
  moveEnemies(w)
  enemyActions(w)
  axieActions(w)
  resolveDeaths(w)

  if (w.lives <= 0) {
    w.phase = 'lost'
    w.events.push({ k: 'levelEnd', stars: 0 })
    return
  }

  if (w.pending.length === 0 && w.enemies.length === 0) {
    w.events.push({ k: 'waveEnd' })
    w.waveIndex++
    if (w.waveIndex >= w.level.waves.length) {
      w.phase = 'won'
      w.events.push({ k: 'levelEnd', stars: starsFor(w.lives) })
    } else {
      w.phase = 'placement'
      // Les Axies KO reviennent, PV pleins, gratuitement (GDD §7.2).
      for (const a of w.axies) { a.ko = false; a.hp = a.maxHp; a.rageStacks = 0 }
      trimToBudget(w)
      recomputeAuras(w)
    }
  }
}

/** Joue la vague en cours jusqu'à sa fin. Le garde-fou attrape une boucle infinie. */
export function runWave(w: World, maxSeconds = 180): void {
  startWave(w)
  const limit = Math.round(maxSeconds / DT)
  for (let i = 0; i < limit && w.phase === 'wave'; i++) step(w)
  if (w.phase === 'wave') {
    throw new Error(`Niveau ${w.level.id}, vague ${w.waveIndex + 1} non terminée après ${maxSeconds} s`)
  }
}

/** Joue tout le niveau. `onPlacement` est appelé avant chaque vague. Renvoie les étoiles. */
export function runLevel(w: World, onPlacement?: (w: World) => void): number {
  while (w.phase === 'placement') {
    onPlacement?.(w)
    runWave(w)
  }
  return w.phase === 'won' ? starsFor(w.lives) : 0
}
```

- [ ] **Étape 3 : Écrire `tests/sim/placement.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { createWorld, currentBudget, startWave } from '../../src/sim/world'
import { canPlace, move, place, remove, spentEnergy } from '../../src/sim/placement'

describe('placement', () => {
  it('accepte une classe de mêlée sur le chemin', () => {
    const w = createWorld(1)
    expect(canPlace(w, 'olek', w.level.path[4]).ok).toBe(true)
    expect(place(w, 'olek', w.level.path[4])).not.toBeNull()
    expect(w.axies[0].pathIndex).toBe(4)
  })

  it('refuse une classe à distance sur le chemin', () => {
    const w = createWorld(1)
    const check = canPlace(w, 'momo', w.level.path[4])
    expect(check.ok).toBe(false)
    expect(check.ok === false && check.reason).toContain('mêlée')
  })

  it('refuse une classe de mêlée sur une colline', () => {
    const w = createWorld(3)
    expect(canPlace(w, 'olek', w.level.hills[0]).ok).toBe(false)
  })

  it('refuse deux Axies sur la même case', () => {
    const w = createWorld(1)
    place(w, 'momo', [6, 6])
    expect(canPlace(w, 'puffy', [6, 6]).ok).toBe(false)
  })

  it('refuse de dépasser le budget de la vague', () => {
    const w = createWorld(1) // budget de la vague 1 : 3
    expect(currentBudget(w)).toBe(3)
    place(w, 'olek', [6, 6]) // coût 2
    expect(canPlace(w, 'buba', [6, 7]).ok).toBe(false) // 2 + 3 > 3
    expect(canPlace(w, 'momo', [6, 7]).ok).toBe(true) // 2 + 1 = 3
  })

  it('rend l’énergie au retrait', () => {
    const w = createWorld(1)
    const olek = place(w, 'olek', [6, 6])!
    expect(spentEnergy(w)).toBe(2)
    expect(remove(w, olek.uid)).toBe(true)
    expect(spentEnergy(w)).toBe(0)
  })

  it('déplace gratuitement', () => {
    const w = createWorld(1)
    const olek = place(w, 'olek', [6, 6])!
    expect(move(w, olek.uid, [6, 7])).toBe(true)
    expect(spentEnergy(w)).toBe(2)
    expect(olek.cell).toEqual([6, 7])
  })

  it('interdit tout placement pendant la vague', () => {
    const w = createWorld(1)
    startWave(w)
    expect(canPlace(w, 'momo', [6, 6]).ok).toBe(false)
    expect(place(w, 'momo', [6, 6])).toBeNull()
  })
})
```

- [ ] **Étape 4 : Écrire `tests/sim/game.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { createWorld, startWave } from '../../src/sim/world'
import { runWave, starsFor, step } from '../../src/sim/game'
import { place } from '../../src/sim/placement'
import { DT } from '../../src/sim/types'

const near = (c: readonly [number, number]): [number, number] => [c[0] + 1, c[1]]

describe('étoiles', () => {
  it('convertit les PV restants en étoiles', () => {
    expect(starsFor(3)).toBe(3)
    expect(starsFor(2)).toBe(2)
    expect(starsFor(1)).toBe(1)
    expect(starsFor(0)).toBe(0)
  })
})

describe('vague', () => {
  it('se termine quand tous les ennemis sont morts ou sortis', () => {
    const w = createWorld(1)
    place(w, 'olek', w.level.path[6])
    place(w, 'momo', near(w.level.path[6]))
    runWave(w)
    expect(w.phase).toBe('placement')
    expect(w.waveIndex).toBe(1)
    expect(w.enemies).toHaveLength(0)
  })

  it('perd le niveau quand les 3 PV tombent', () => {
    const w = createWorld(1)
    for (let i = 0; i < 8 && w.phase === 'placement'; i++) {
      startWave(w)
      for (let k = 0; k < 180 / DT && w.phase === 'wave'; k++) step(w)
    }
    expect(w.phase).toBe('lost')
    expect(w.lives).toBeLessThanOrEqual(0)
  })

  it('gagne le niveau 1 avec une formation de référence', () => {
    const w = createWorld(1)
    place(w, 'olek', w.level.path[6])
    place(w, 'momo', near(w.level.path[6]))
    while (w.phase === 'placement') runWave(w)
    expect(w.phase).toBe('won')
    expect(w.lives).toBeGreaterThan(0)
  })
})

describe('déterminisme', () => {
  it('donne exactement le même résultat sur deux exécutions', () => {
    const run = () => {
      const w = createWorld(3)
      place(w, 'olek', w.level.path[8])
      place(w, 'momo', near(w.level.path[8]))
      while (w.phase === 'placement' && w.waveIndex < 3) runWave(w)
      return { lives: w.lives, wave: w.waveIndex, uid: w.nextUid }
    }
    expect(run()).toEqual(run())
  })

  it('n’utilise ni aléa ni horloge dans src/sim', () => {
    const dir = join(process.cwd(), 'src', 'sim')
    for (const f of readdirSync(dir)) {
      const src = readFileSync(join(dir, f), 'utf8')
      expect(src, f).not.toMatch(/Math\.random|Date\.now|performance\.now|new Date\(/)
    }
  })

  it('n’importe rien du rendu dans src/sim', () => {
    const dir = join(process.cwd(), 'src', 'sim')
    for (const f of readdirSync(dir)) {
      const src = readFileSync(join(dir, f), 'utf8')
      expect(src, f).not.toMatch(/from '(pixi|\.\.\/render|\.\.\/ui)/)
    }
  })
})
```

- [ ] **Étape 5 : Lancer les deux fichiers de test**

```bash
cd axie-td && npx vitest run tests/sim/placement.test.ts tests/sim/game.test.ts
```

Attendu : 13 tests passent.

Si « gagne le niveau 1 » échoue, la formation de référence est trop faible. Renforcer en ajoutant `place(w, 'puffy', ...)` sur une case voisine libre, et reporter la même formation dans `tools/balance-run.mjs` à la tâche 21. Si à l'inverse « perd le niveau » échoue parce que le joueur survit sans rien poser, le niveau 1 est trop facile : le signaler dans le rapport de tâche, c'est une décision d'équilibrage pour Edouard, pas une correction à faire seul.

- [ ] **Étape 6 : Lancer toute la suite et la vérification de types**

```bash
cd axie-td && npm test && npx tsc --noEmit
```

Attendu : tout passe. **À ce stade le jeu se joue entièrement sans rendu.** C'est le jalon central du plan : tout ce qui suit est de la présentation.

- [ ] **Étape 7 : Commiter**

```bash
cd axie-td && git add -A && git commit -m "feat: placement, budget, boucle de vague et étoiles"
```

---

## Tâche 11 : Application Pixi et plateau

**Fichiers :**
- Créer : `src/render/layout.ts`, `src/render/app.ts`, `src/render/board.ts`
- Modifier : `src/main.ts`
- Test : `tests/render/layout.test.ts`

**Interfaces :**
- Consomme : `Board` de `src/sim/grid.ts`, `World`.
- Produit :
  - `type Layout = { cell: number; boardX: number; boardY: number; boardW: number; boardH: number; hudH: number; trayH: number; barH: number }`
  - `function computeLayout(w: number, h: number): Layout`
  - `class GameApp` avec `app: Application`, `world: Container`, `layout: Layout`, `onResize(cb)`
  - `function drawBoard(g: Container, board: Board, layout: Layout): void`

**Mise en page (GDD §11.2) :** barre haute 48 px, plateau, bac 96 px, barre basse 64 px. La taille de case est `min(largeur ÷ 7, (hauteur − 208) ÷ 10)`, soit 55 px en référence 390 × 780 et 43 px au minimum 360 × 640. Le plateau est centré sur les deux axes.

**Rendu du plateau (GDD §20.3) :** plaine vert-gris clair, chemin plus sombre aux bords arrondis, colline surélevée avec une ombre portée en bas. La grille est suggérée par un liseré à faible opacité, jamais par des lignes noires.

- [ ] **Étape 1 : Écrire le test `tests/render/layout.test.ts` (il doit échouer)**

```ts
import { describe, expect, it } from 'vitest'
import { computeLayout } from '../../src/render/layout'

describe('mise en page', () => {
  it('donne 55 px de case sur l’écran de référence', () => {
    const l = computeLayout(390, 780)
    expect(l.cell).toBeCloseTo(55, 0)
    expect(l.boardW).toBeCloseTo(l.cell * 7)
    expect(l.boardH).toBeCloseTo(l.cell * 10)
  })

  it('tient sur un petit écran sans descendre sous 43 px', () => {
    const l = computeLayout(360, 640)
    expect(l.cell).toBeGreaterThanOrEqual(43)
    expect(l.hudH + l.boardH + l.trayH + l.barH).toBeLessThanOrEqual(640)
  })

  it('centre le plateau horizontalement sur un écran large', () => {
    const l = computeLayout(1200, 900)
    expect(l.boardX).toBeGreaterThan(0)
    expect(l.boardX * 2 + l.boardW).toBeCloseTo(1200, 0)
  })

  it('réserve toujours 208 px aux barres', () => {
    const l = computeLayout(390, 780)
    expect(l.hudH + l.trayH + l.barH).toBe(208)
  })
})
```

- [ ] **Étape 2 : Lancer le test pour vérifier qu'il échoue**

```bash
cd axie-td && npx vitest run tests/render/layout.test.ts
```

Attendu : ÉCHEC sur l'import de `../../src/render/layout`.

- [ ] **Étape 3 : Écrire `src/render/layout.ts`**

```ts
export const HUD_H = 48
export const TRAY_H = 96
export const BAR_H = 64
export const CHROME_H = HUD_H + TRAY_H + BAR_H // 208
export const COLS = 7
export const ROWS = 10

export type Layout = {
  /** Côté d'une case, en pixels. */
  cell: number
  boardX: number
  boardY: number
  boardW: number
  boardH: number
  hudH: number
  trayH: number
  barH: number
  width: number
  height: number
}

/**
 * Le plateau prend la place restante après les trois barres, sans jamais
 * déborder ni en largeur ni en hauteur. Centré sur les deux axes.
 */
export function computeLayout(width: number, height: number): Layout {
  const cell = Math.min(width / COLS, (height - CHROME_H) / ROWS)
  const boardW = cell * COLS
  const boardH = cell * ROWS
  return {
    cell,
    boardW,
    boardH,
    boardX: (width - boardW) / 2,
    boardY: HUD_H + (height - CHROME_H - boardH) / 2,
    hudH: HUD_H,
    trayH: TRAY_H,
    barH: BAR_H,
    width,
    height,
  }
}

/** Coin haut-gauche d'une case, en pixels écran. */
export function cellToPx(layout: Layout, col: number, row: number) {
  return { x: layout.boardX + col * layout.cell, y: layout.boardY + row * layout.cell }
}

/** Position en pixels d'un point exprimé en unités de case. */
export function unitToPx(layout: Layout, x: number, y: number) {
  return { x: layout.boardX + x * layout.cell, y: layout.boardY + y * layout.cell }
}

/** Case sous un point écran, ou `null` hors plateau. */
export function pxToCell(layout: Layout, px: number, py: number): [number, number] | null {
  const col = Math.floor((px - layout.boardX) / layout.cell)
  const row = Math.floor((py - layout.boardY) / layout.cell)
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null
  return [col, row]
}
```

- [ ] **Étape 4 : Lancer le test pour vérifier qu'il passe**

```bash
cd axie-td && npx vitest run tests/render/layout.test.ts
```

Attendu : 4 tests passent.

- [ ] **Étape 5 : Écrire `src/render/app.ts`**

```ts
import { Application, Container } from 'pixi.js'
import { computeLayout, type Layout } from './layout'

export const PALETTE = {
  ground: 0x3b4d43,
  plain: 0xb6c4a5,
  plainLine: 0x22302a,
  path: 0x9a7b5b,
  hill: 0xc9c2b0,
  hillShadow: 0x8f8877,
  valid: 0x78cd6e,
  range: 0xffffff,
  classes: {
    beast: 0xf5a623,
    aquatic: 0x3aa7d9,
    plant: 0x6dbe45,
    bird: 0xf27ba8,
    bug: 0xe5473e,
    reptile: 0x9b5de5,
  },
} as const

/** Application Pixi et ses trois couches, du fond vers l'avant. */
export class GameApp {
  readonly app: Application
  /** Plateau : plaine, chemin, collines. Redessiné seulement au changement de niveau. */
  readonly boardLayer = new Container()
  /** Surbrillances de placement : cases valides, portée, liserés d'aura. */
  readonly overlayLayer = new Container()
  /** Unités : Axies et chimères. Trié par profondeur à chaque frame. */
  readonly unitLayer = new Container()
  /** Effets additifs et nombres flottants. */
  readonly fxLayer = new Container()
  layout: Layout
  private callbacks: ((l: Layout) => void)[] = []

  constructor(readonly host: HTMLElement) {
    this.app = new Application({
      resizeTo: host,
      background: PALETTE.ground,
      antialias: true,
      resolution: Math.min(2, window.devicePixelRatio || 1),
      autoDensity: true,
    })
    host.appendChild(this.app.view as HTMLCanvasElement)
    this.app.stage.addChild(this.boardLayer, this.overlayLayer, this.unitLayer, this.fxLayer)
    this.layout = computeLayout(host.clientWidth, host.clientHeight)
    this.app.renderer.on('resize', (w: number, h: number) => {
      this.layout = computeLayout(w, h)
      for (const cb of this.callbacks) cb(this.layout)
    })
  }

  onResize(cb: (l: Layout) => void): void {
    this.callbacks.push(cb)
  }

  /** Trie les unités par ordonnée : celles du bas passent devant. */
  sortUnits(): void {
    this.unitLayer.children.sort((a, b) => a.y - b.y)
  }
}
```

- [ ] **Étape 6 : Écrire `src/render/board.ts`**

```ts
import { Container, Graphics } from 'pixi.js'
import type { Board } from '../sim/grid'
import { PALETTE } from './app'
import { cellToPx, COLS, ROWS, type Layout } from './layout'

/**
 * Dessine le plateau une fois par niveau. Le décor reste discret :
 * c'est le chemin qui doit ressortir, pas la grille (GDD §20.3).
 */
export function drawBoard(target: Container, board: Board, layout: Layout): void {
  target.removeChildren()
  const g = new Graphics()
  const c = layout.cell
  const r = Math.max(2, c * 0.14)

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const kind = board.kindAt([col, row])
      const { x, y } = cellToPx(layout, col, row)

      if (kind === 'path') {
        g.beginFill(PALETTE.path).drawRect(x, y, c, c).endFill()
      } else if (kind === 'hill') {
        // Ombre portée sous la colline : elle doit se reconnaître sans légende.
        g.beginFill(PALETTE.hillShadow).drawRoundedRect(x + 2, y + 6, c - 4, c - 6, r).endFill()
        g.beginFill(PALETTE.hill).drawRoundedRect(x + 2, y, c - 4, c - 6, r).endFill()
        g.beginFill(0xffffff, 0.35)
          .drawEllipse(x + c * 0.36, y + c * 0.28, c * 0.13, c * 0.07)
          .drawEllipse(x + c * 0.66, y + c * 0.36, c * 0.1, c * 0.06)
          .endFill()
      } else {
        g.beginFill(PALETTE.plain).drawRect(x, y, c, c).endFill()
        g.lineStyle(1, PALETTE.plainLine, 0.1).drawRect(x + 0.5, y + 0.5, c - 1, c - 1)
        g.lineStyle(0)
      }
    }
  }

  // Bord arrondi du chemin : on repasse les extrémités pour adoucir l'entrée et la sortie.
  const entry = cellToPx(layout, board.path[0][0], board.path[0][1])
  const exit = cellToPx(layout, board.path.at(-1)![0], board.path.at(-1)![1])
  g.beginFill(PALETTE.path, 1)
    .drawRoundedRect(entry.x, entry.y, c, c, r)
    .drawRoundedRect(exit.x, exit.y, c, c, r)
    .endFill()

  target.addChild(g)
}
```

- [ ] **Étape 7 : Câbler `src/main.ts` pour voir le plateau**

```ts
import { createWorld } from './sim/world'
import { GameApp } from './render/app'
import { drawBoard } from './render/board'

const host = document.querySelector<HTMLElement>('#app')
if (!host) throw new Error('#app introuvable')

const world = createWorld(3)
const game = new GameApp(host)

function redraw() {
  drawBoard(game.boardLayer, world.board, game.layout)
}
game.onResize(redraw)
redraw()
```

- [ ] **Étape 8 : Vérifier visuellement**

```bash
cd axie-td && npm run dev
```

Ouvrir `http://localhost:5179/` et rétrécir la fenêtre au format portrait, environ 390 × 780. Attendu : le plateau 7 × 10 du niveau 3, chemin brun en serpentin, une colline surélevée en bas à gauche, la plaine quadrillée en vert pâle. Le plateau reste centré et ne déborde jamais quand on redimensionne.

- [ ] **Étape 9 : Commiter**

```bash
cd axie-td && git add -A && git commit -m "feat: application Pixi, mise en page portrait et rendu du plateau"
```

---

## Tâche 12 : Squelettes Spine et rendu des unités

**Fichiers :**
- Créer : `src/render/sprites.ts`, `src/render/view.ts`
- Modifier : `src/main.ts`
- Test : aucun test unitaire, vérification visuelle. Le rendu ne porte aucune règle de jeu.

**Interfaces :**
- Consomme : `GameApp`, `Layout`, `World`, `unitToPx`.
- Produit :
  - `async function loadSkeletons(ids: { axies: string[]; enemies: string[] }): Promise<void>`
  - `function makeSpine(key: string): Spine`
  - `class WorldView` avec `sync(world: World): void`

**Le risque technique numéro un du projet est ici :** pixi-spine 4.0.3 doit lire les fichiers Spine 3.8.79 du toolkit. Le test de l'étape 4 tranche cette question avant que quoi que ce soit d'autre en dépende. En cas d'échec, le repli est le mixer officiel pour les Axies et des sprites fixes pour les chimères, et il faut prévenir Edouard immédiatement.

**Animations disponibles** (vérifiées le 03/09) : les Axies ont `action/idle/normal`, `action/run`, `attack/melee/*`, `attack/ranged/*`, `defense/hit-by-normal`, `activity/appear`, `activity/victory-pose-back-flip`. Les chimères ont `action/idle/normal`, `action/move-forward`, `attack/melee/normal-attack`, `defense/hit-by-normal`, `defense/hit-die`. Le slime a en plus `action/die`.

- [ ] **Étape 1 : Écrire `src/render/sprites.ts`**

```ts
import { Assets } from 'pixi.js'
import { Spine } from 'pixi-spine'
import vfxMap from '../../data/vfx-map.json'

type SkeletonKey = string // 'axie:buba' ou 'enemy:wolf-gray'

const loaded = new Map<SkeletonKey, unknown>()

function urlFor(key: SkeletonKey): string {
  const [kind, id] = key.split(':')
  const dir = kind === 'axie' ? 'axies' : 'chimeras'
  return `/spine/${dir}/${id}/skeleton.json`
}

/** Charge les squelettes d'un niveau. À appeler avant d'entrer en jeu. */
export async function loadSkeletons(ids: { axies: string[]; enemies: string[] }): Promise<void> {
  const keys = [
    ...ids.axies.map((a) => `axie:${a}`),
    ...ids.enemies.map((e) => `enemy:${e}`),
  ].filter((k) => !loaded.has(k))
  if (keys.length === 0) return
  const res = await Promise.all(keys.map((k) => Assets.load(urlFor(k))))
  keys.forEach((k, i) => loaded.set(k, res[i]))
}

/** Crée une instance Spine. Les textures sont partagées entre instances. */
export function makeSpine(key: SkeletonKey): Spine {
  const data = loaded.get(key)
  if (!data) throw new Error(`Squelette non chargé : ${key}`)
  return new Spine((data as { spineData: never }).spineData)
}

/** Joue une animation si le squelette la possède, sinon la première disponible en repli. */
export function playAnim(spine: Spine, name: string, loop: boolean, fallbacks: string[] = []): void {
  const has = (n: string) => spine.spineData.animations.some((a) => a.name === n)
  const pick = [name, ...fallbacks].find(has)
  if (!pick) return
  const current = spine.state.getCurrent(0)
  if (current && current.animation?.name === pick && loop) return
  spine.state.setAnimation(0, pick, loop)
}

export const ANIM = vfxMap as unknown as {
  axie_attack: Record<string, { spine: string; vfx: string; sfx: string | string[] }>
  axie_idle: { spine: string; random: string[] }
  axie_hit: { spine: string }
  axie_ko: { spine: string; fallback: string }
  axie_place: { spine: string; sfx_by_class: Record<string, string> }
  axie_victory: { spine: string }
  enemy: Record<string, string | { vfx: string; sfx: string | null }>
  status: Record<string, { vfx: string; sfx: string | null }>
  reaction: Record<string, { vfx: string | string[]; sfx: string | null; scale: number }>
  level: Record<string, { sfx?: string | string[]; screen_flash?: number }>
}
```

- [ ] **Étape 2 : Écrire `src/render/view.ts`**

```ts
import { Container, Graphics } from 'pixi.js'
import type { Spine } from 'pixi-spine'
import type { World } from '../sim/world'
import { center } from '../sim/grid'
import type { GameApp } from './app'
import { PALETTE } from './app'
import { unitToPx } from './layout'
import { ANIM, makeSpine, playAnim } from './sprites'

type Visual = {
  root: Container
  spine: Spine
  bar: Graphics
  facing: number
}

/**
 * Miroir visuel de l'état de simulation. Ne modifie jamais le monde :
 * il le lit et met à jour des objets d'affichage.
 */
export class WorldView {
  private visuals = new Map<number, Visual>()

  constructor(readonly game: GameApp) {}

  private ensure(uid: number, key: string, scale: number): Visual {
    let v = this.visuals.get(uid)
    if (v) return v
    const root = new Container()
    const spine = makeSpine(key)
    spine.scale.set(scale)
    const bar = new Graphics()
    root.addChild(spine, bar)
    this.game.unitLayer.addChild(root)
    v = { root, spine, bar, facing: 1 }
    this.visuals.set(uid, v)
    return v
  }

  private drawBar(v: Visual, ratio: number, width: number, color: number): void {
    v.bar.clear()
    if (ratio >= 1) return
    const h = Math.max(3, width * 0.09)
    const y = -width * 0.75
    v.bar.beginFill(0x000000, 0.45).drawRoundedRect(-width / 2, y, width, h, h / 2).endFill()
    v.bar.beginFill(color).drawRoundedRect(-width / 2, y, width * Math.max(0, ratio), h, h / 2).endFill()
  }

  /** Met l'affichage en accord avec l'état du monde. Appelé à chaque frame. */
  sync(world: World): void {
    const layout = this.game.layout
    const c = layout.cell
    const seen = new Set<number>()

    for (const a of world.axies) {
      seen.add(a.uid)
      const v = this.ensure(a.uid, `axie:${a.axieId}`, (c * 0.9) / 220)
      const p = unitToPx(layout, center(a.cell).x, center(a.cell).y)
      v.root.position.set(p.x, p.y + c * 0.32)
      v.root.alpha = a.ko ? 0.25 : 1
      v.spine.scale.x = Math.abs(v.spine.scale.x) * v.facing
      playAnim(v.spine, a.ko ? ANIM.axie_ko.spine : ANIM.axie_idle.spine, !a.ko, [ANIM.axie_ko.fallback])
      this.drawBar(v, a.hp / a.maxHp, c * 0.7, PALETTE.classes[a.cls])
    }

    for (const e of world.enemies) {
      seen.add(e.uid)
      const v = this.ensure(e.uid, `enemy:${e.type}`, (c * 0.85) / 240)
      const pos = world.board.posAt(e.d)
      const p = unitToPx(layout, pos.x, pos.y)
      // Sens de marche : les sprites Spine sont vus de profil.
      const ahead = world.board.posAt(Math.min(e.d + 0.3, world.board.length - 1))
      if (Math.abs(ahead.x - pos.x) > 1e-6) v.facing = ahead.x >= pos.x ? 1 : -1
      v.spine.scale.x = Math.abs(v.spine.scale.x) * v.facing
      v.root.position.set(p.x, p.y + c * 0.3)
      const moving = e.blockedBy < 0
      playAnim(v.spine, moving ? String(ANIM.enemy.walk) : String(ANIM.enemy.attack), true, [String(ANIM.enemy.walk)])
      this.drawBar(v, e.hp / e.maxHp, c * 0.6, 0xff6b6b)
    }

    for (const [uid, v] of this.visuals) {
      if (seen.has(uid)) continue
      v.root.destroy({ children: true })
      this.visuals.delete(uid)
    }

    this.game.sortUnits()
  }

  clear(): void {
    for (const v of this.visuals.values()) v.root.destroy({ children: true })
    this.visuals.clear()
  }
}
```

- [ ] **Étape 3 : Câbler `src/main.ts` pour un test de bout en bout**

```ts
import { createWorld } from './sim/world'
import { place } from './sim/placement'
import { step } from './sim/game'
import { startWave } from './sim/world'
import { GameApp } from './render/app'
import { drawBoard } from './render/board'
import { WorldView } from './render/view'
import { loadSkeletons } from './render/sprites'
import { DT } from './sim/types'

const host = document.querySelector<HTMLElement>('#app')
if (!host) throw new Error('#app introuvable')

const world = createWorld(1)
const game = new GameApp(host)
const view = new WorldView(game)

const redraw = () => drawBoard(game.boardLayer, world.board, game.layout)
game.onResize(redraw)
redraw()

const enemies = [...new Set(world.level.waves.flatMap((w) => w.spawns.map((s) => s.enemy)))]
await loadSkeletons({ axies: ['olek', 'momo'], enemies })

place(world, 'olek', world.level.path[6])
place(world, 'momo', [world.level.path[6][0] + 1, world.level.path[6][1]])
startWave(world)

let acc = 0
game.app.ticker.add(() => {
  acc += game.app.ticker.deltaMS / 1000
  while (acc >= DT) { step(world); acc -= DT }
  world.events.length = 0
  view.sync(world)
})
```

- [ ] **Étape 4 : Vérifier que pixi-spine lit les assets du toolkit**

```bash
cd axie-td && npm run dev
```

Ouvrir `http://localhost:5179/` et la console du navigateur. Attendu : Olek et Momo apparaissent sur le plateau, animés en boucle. Des slimes entrent par le haut, marchent le long du chemin et s'arrêtent devant Olek. Aucune erreur dans la console.

**Si les squelettes ne se chargent pas**, noter le message exact et essayer dans cet ordre : vérifier que `skeleton.atlas` nomme bien `skeleton.webp` ; charger l'atlas explicitement avec `Assets.load('/spine/axies/buba/skeleton.atlas')` avant le JSON ; en dernier recours convertir en PNG plutôt qu'en WebP dans `tools/copy-assets.mjs`. Si rien ne fonctionne, **arrêter et prévenir Edouard** : c'est le repli mixer prévu au GDD §19.

- [ ] **Étape 5 : Commiter**

```bash
cd axie-td && git add -A && git commit -m "feat: chargement des squelettes Spine et rendu des unités"
```

---

## Tâche 13 : HUD, bac et glisser-déposer

**Fichiers :**
- Créer : `src/ui/hud.ts`, `src/ui/tray.ts`, `src/ui/dragdrop.ts`, `src/ui/overlay.ts`
- Modifier : `src/main.ts`, `src/style.css`
- Test : `tests/ui/dragdrop.test.ts`

**Interfaces :**
- Consomme : `canPlace`, `place`, `move`, `remove`, `spentEnergy`, `currentBudget`, `pxToCell`, `Layout`.
- Produit :
  - `class Hud` avec `mount(parent)`, `update(world)`
  - `class Tray` avec `mount(parent)`, `update(world, draft)`, `onPick(cb)`
  - `class DragDrop` avec `attach(canvas)`, `onChange(cb)`
  - `function nearestValidCell(w, axieId, px, py, layout, movingUid): Cell | null`

**Le HUD et le bac sont en HTML**, pas en Pixi : le texte y est plus net, l'accessibilité gratuite, et les zones tactiles plus fiables. Seul le plateau est en Pixi.

**Aimantation (GDD §11.3) :** pendant un glissement, l'Axie saute à la **case valide la plus proche du doigt**, pas à la case exactement sous le doigt. Sans ça, une case de 43 px sur petit écran est intenable.

- [ ] **Étape 1 : Écrire le test `tests/ui/dragdrop.test.ts` (il doit échouer)**

```ts
import { describe, expect, it } from 'vitest'
import { createWorld } from '../../src/sim/world'
import { place } from '../../src/sim/placement'
import { computeLayout, unitToPx } from '../../src/render/layout'
import { nearestValidCell } from '../../src/ui/dragdrop'

const layout = computeLayout(390, 780)

describe('aimantation', () => {
  it('aimante sur la case valide la plus proche du doigt', () => {
    const w = createWorld(1)
    const target = [4, 5] as const
    const p = unitToPx(layout, target[0] + 0.5, target[1] + 0.5)
    // Le doigt tombe 12 px à côté du centre : ça doit quand même viser cette case.
    const cell = nearestValidCell(w, 'momo', p.x + 12, p.y - 12, layout)
    expect(cell).toEqual([4, 5])
  })

  it('refuse le chemin pour une classe à distance et propose la case valide voisine', () => {
    const w = createWorld(1)
    const onPath = w.level.path[5]
    const p = unitToPx(layout, onPath[0] + 0.5, onPath[1] + 0.5)
    const cell = nearestValidCell(w, 'momo', p.x, p.y, layout)
    expect(cell).not.toBeNull()
    expect(w.board.kindAt(cell!)).not.toBe('path')
  })

  it('ne propose pas une case occupée', () => {
    const w = createWorld(1)
    place(w, 'momo', [4, 5])
    const p = unitToPx(layout, 4.5, 5.5)
    const cell = nearestValidCell(w, 'puffy', p.x, p.y, layout)
    expect(cell).not.toEqual([4, 5])
  })

  it('ne propose rien loin du plateau', () => {
    const w = createWorld(1)
    expect(nearestValidCell(w, 'momo', -400, -400, layout)).toBeNull()
  })
})
```

- [ ] **Étape 2 : Lancer le test pour vérifier qu'il échoue**

```bash
cd axie-td && npx vitest run tests/ui/dragdrop.test.ts
```

Attendu : ÉCHEC sur l'import de `../../src/ui/dragdrop`.

- [ ] **Étape 3 : Écrire `src/ui/dragdrop.ts`**

```ts
import type { Cell } from '../data/types'
import { COLS, ROWS, unitToPx, type Layout } from '../render/layout'
import { canPlace } from '../sim/placement'
import type { World } from '../sim/world'

/** Rayon d'aimantation, en multiples de la taille de case. */
const SNAP_RADIUS = 2.2

/**
 * Case valide la plus proche du doigt. L'aimantation évite d'exiger de la précision
 * sur des cases de 43 px (GDD §11.3). Renvoie `null` si rien de valide n'est assez proche.
 */
export function nearestValidCell(
  w: World,
  axieId: string,
  px: number,
  py: number,
  layout: Layout,
  movingUid = -1,
): Cell | null {
  let best: Cell | null = null
  let bestD = (SNAP_RADIUS * layout.cell) ** 2

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const cell: Cell = [col, row]
      if (!canPlace(w, axieId, cell, movingUid).ok) continue
      const c = unitToPx(layout, col + 0.5, row + 0.5)
      const d = (c.x - px) ** 2 + (c.y - py) ** 2
      if (d < bestD) { bestD = d; best = cell }
    }
  }
  return best
}

export type DragState =
  | { kind: 'none' }
  | { kind: 'fromTray'; axieId: string; px: number; py: number; cell: Cell | null }
  | { kind: 'fromBoard'; uid: number; axieId: string; px: number; py: number; cell: Cell | null }

export type DragEvents = {
  getWorld: () => World
  getLayout: () => Layout
  /** Case sous le doigt au début du geste, pour attraper un Axie déjà posé. */
  axieAt: (cell: Cell) => number | null
  onDrop: (state: DragState) => void
  onUpdate: (state: DragState) => void
}

/** Gestion du glisser-déposer au doigt et à la souris, un seul point de contact. */
export class DragDrop {
  state: DragState = { kind: 'none' }

  constructor(private readonly ev: DragEvents) {}

  attach(el: HTMLElement): void {
    el.addEventListener('pointerdown', this.down)
    window.addEventListener('pointermove', this.move)
    window.addEventListener('pointerup', this.up)
    window.addEventListener('pointercancel', this.cancel)
  }

  detach(el: HTMLElement): void {
    el.removeEventListener('pointerdown', this.down)
    window.removeEventListener('pointermove', this.move)
    window.removeEventListener('pointerup', this.up)
    window.removeEventListener('pointercancel', this.cancel)
  }

  /** Démarre un glissement depuis le bac. Appelé par `Tray`. */
  startFromTray(axieId: string, px: number, py: number): void {
    this.state = { kind: 'fromTray', axieId, px, py, cell: null }
    this.recompute()
  }

  private down = (e: PointerEvent) => {
    if (this.state.kind !== 'none') return
    const layout = this.ev.getLayout()
    const col = Math.floor((e.clientX - layout.boardX) / layout.cell)
    const row = Math.floor((e.clientY - layout.boardY) / layout.cell)
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return
    const uid = this.ev.axieAt([col, row])
    if (uid === null) return
    const w = this.ev.getWorld()
    const a = w.axies.find((x) => x.uid === uid)
    if (!a) return
    this.state = { kind: 'fromBoard', uid, axieId: a.axieId, px: e.clientX, py: e.clientY, cell: a.cell }
    this.recompute()
  }

  private move = (e: PointerEvent) => {
    if (this.state.kind === 'none') return
    this.state.px = e.clientX
    this.state.py = e.clientY
    this.recompute()
  }

  private up = () => {
    if (this.state.kind === 'none') return
    this.ev.onDrop(this.state)
    this.state = { kind: 'none' }
    this.ev.onUpdate(this.state)
  }

  private cancel = () => {
    this.state = { kind: 'none' }
    this.ev.onUpdate(this.state)
  }

  private recompute(): void {
    if (this.state.kind === 'none') return
    const movingUid = this.state.kind === 'fromBoard' ? this.state.uid : -1
    this.state.cell = nearestValidCell(
      this.ev.getWorld(), this.state.axieId, this.state.px, this.state.py,
      this.ev.getLayout(), movingUid,
    )
    this.ev.onUpdate(this.state)
  }
}
```

- [ ] **Étape 4 : Lancer le test**

```bash
cd axie-td && npx vitest run tests/ui/dragdrop.test.ts
```

Attendu : 4 tests passent.

- [ ] **Étape 5 : Écrire `src/ui/overlay.ts` (surbrillances de placement)**

```ts
import { Container, Graphics } from 'pixi.js'
import { BALANCE, axieDef } from '../data/load'
import { PALETTE } from '../render/app'
import { COLS, ROWS, cellToPx, unitToPx, type Layout } from '../render/layout'
import { auraSources } from '../sim/auras'
import { center } from '../sim/grid'
import { canPlace } from '../sim/placement'
import type { World } from '../sim/world'
import type { DragState } from './dragdrop'

/**
 * Cases valides, cercle de portée et liserés d'aura.
 * Les liserés portent aussi l'icône de la classe côté HTML : jamais d'information
 * transmise par la couleur seule (exigence d'accessibilité).
 */
export function drawOverlay(target: Container, world: World, layout: Layout, drag: DragState): void {
  target.removeChildren()
  const g = new Graphics()
  const c = layout.cell

  // Liserés d'aura, visibles en permanence entre voisins qui se donnent une aura.
  for (const a of world.axies) {
    if (a.ko) continue
    for (const src of auraSources(world, a)) {
      const from = center(a.cell)
      const to = center(src.cell)
      const mid = unitToPx(layout, (from.x + to.x) / 2, (from.y + to.y) / 2)
      const horizontal = from.y === to.y
      const w = horizontal ? c * 0.07 : c * 0.5
      const h = horizontal ? c * 0.5 : c * 0.07
      g.beginFill(PALETTE.classes[src.cls], 0.9)
        .drawRoundedRect(mid.x - w / 2, mid.y - h / 2, w, h, Math.min(w, h) / 2)
        .endFill()
    }
  }

  if (drag.kind === 'none') { target.addChild(g); return }

  // Cases valides pour l'Axie en main.
  const movingUid = drag.kind === 'fromBoard' ? drag.uid : -1
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (!canPlace(world, drag.axieId, [col, row], movingUid).ok) continue
      const p = cellToPx(layout, col, row)
      g.beginFill(PALETTE.valid, 0.45)
        .drawRoundedRect(p.x + 3, p.y + 3, c - 6, c - 6, c * 0.15)
        .endFill()
    }
  }

  // Cercle de portée, à la case aimantée.
  if (drag.cell) {
    const def = world.axies.find((a) => a.uid === movingUid)
    const cls = def ? def.cls : undefined
    const base = cls ? BALANCE.classes[cls].range : rangeOf(world, drag.axieId)
    const onHill = world.board.kindAt(drag.cell) === 'hill'
    const range = Math.max(0.5, base - (onHill ? BALANCE.cells.hill.range_penalty : 0))
    const mid = center(drag.cell)
    const p = unitToPx(layout, mid.x, mid.y)
    g.beginFill(PALETTE.range, 0.16).drawCircle(p.x, p.y, range * c).endFill()
    g.lineStyle(2, PALETTE.range, 0.75).drawCircle(p.x, p.y, range * c).lineStyle(0)
  }

  target.addChild(g)
}

/** Portée de base d'un Axie, posé ou encore dans le bac. */
function rangeOf(world: World, axieId: string): number {
  const posed = world.axies.find((x) => x.axieId === axieId)
  if (posed) return posed.baseRange
  const cls = axieDef(axieId).class
  return cls === 'dusk' ? 1 : BALANCE.classes[cls].range
}
```

Ne jamais écrire `require` dans `src/` : le code part dans un navigateur et Vite ne le résoudra pas.

- [ ] **Étape 6 : Écrire `src/ui/hud.ts` et `src/ui/tray.ts`**

```ts
// src/ui/hud.ts
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
```

```ts
// src/ui/tray.ts
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
```

- [ ] **Étape 7 : Ajouter les styles du HUD et du bac à `src/style.css`**

```css
.hud, .tray, .bar { position: absolute; left: 0; right: 0; z-index: 2; display: flex; align-items: center; color: #f3f1e8; }
.hud { top: 0; height: 48px; justify-content: space-between; padding: 0 14px; background: #2b3a33; font-weight: 600; }
.hud-hearts { color: #ff6b6b; letter-spacing: 2px; font-size: 18px; }
.hud-right { display: flex; align-items: center; gap: 10px; }
.hud-mute { width: 28px; height: 28px; border: 0; border-radius: 8px; background: rgba(255,255,255,.12); color: #fff; font-size: 14px; }
.tray { bottom: 64px; height: 96px; justify-content: space-evenly; padding: 0 8px; background: #354a41; }
.slot { position: relative; width: 60px; height: 78px; border: 0; border-radius: 14px; background: rgba(255,255,255,.08); color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; font: inherit; }
.slot .cost { position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; border-radius: 50%; background: #ffd23f; color: #3a2a00; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.slot .ic { width: 40px; height: 40px; border-radius: 50%; background-size: cover; display: block; }
.slot .nm { font-size: 10px; font-weight: 600; }
.slot.is-posed { opacity: .55; }
.slot.is-dim { opacity: .35; }
.slot.is-dim .cost { background: #ff6b6b; color: #fff; }
.bar { bottom: 0; height: 64px; gap: 10px; padding: 0 12px; background: #2b3a33; }
.launch { flex: 1; height: 44px; border: 0; border-radius: 14px; background: #e0742b; color: #fff; font: inherit; font-size: 17px; font-weight: 600; }
.launch:disabled { background: #55665d; color: rgba(255,255,255,.55); }
.speed { width: 52px; height: 44px; border: 0; border-radius: 14px; background: rgba(255,255,255,.12); color: #fff; font: inherit; font-weight: 600; }
.speed.is-on { background: #ffd23f; color: #3a2a00; }
```

- [ ] **Étape 8 : Vérifier au navigateur**

Câbler `Hud`, `Tray`, `DragDrop` et `drawOverlay` dans `src/main.ts` en suivant le modèle de la tâche 12, avec un draft en dur `['olek', 'momo', 'puffy', 'buba', 'pomodoro']` et un bouton « Lancer la vague » qui appelle `startWave`.

```bash
cd axie-td && npm run dev
```

Attendu : glisser Olek du bac vers le plateau montre les cases valides en vert et le cercle de portée. Le lâcher le pose et l'énergie baisse. Le reprendre et le déplacer est gratuit. Les Axies posés côte à côte affichent un liseré de la couleur de la classe qui donne l'aura. Buba est grisé quand il ne reste pas 3 d'énergie.

- [ ] **Étape 9 : Commiter**

```bash
cd axie-td && git add -A && git commit -m "feat: HUD, bac du draft, glisser-déposer et surbrillances"
```

---

## Tâche 14 : Effets visuels, nombres flottants et sons

**Fichiers :**
- Créer : `src/render/vfx.ts`, `src/render/floats.ts`, `src/audio/sfx.ts`, `src/render/effects.ts`
- Modifier : `src/main.ts`
- Test : vérification visuelle et sonore.

**Interfaces :**
- Consomme : `SimEvent[]` du monde, `ANIM` de `src/render/sprites.ts`.
- Produit :
  - `async function loadVfx(ids: string[]): Promise<void>`, `function playVfx(layer, id, x, y, scale)`
  - `function spawnFloat(layer, text, x, y, kind)`
  - `class Sfx` avec `play(id)`, `toggleMute()`
  - `function consumeEvents(world, ctx): void` — traduit les événements de simulation en effets

**Le principe :** la simulation ne connaît que ses événements. Cette tâche les traduit en images et en sons. Aucun effet ne modifie jamais l'état du jeu.

**Format des atlas d'effets :** chaque `clip.json` donne `atlas.cols`, `atlas.frameW`, `atlas.frameH`, `frames`, `fps`, `duration` et `anchor`. Les frames se lisent de gauche à droite puis ligne par ligne. Le mode de fusion est additif.

- [ ] **Étape 1 : Écrire `src/render/vfx.ts`**

```ts
import { AnimatedSprite, Assets, BLEND_MODES, Rectangle, Texture, type Container } from 'pixi.js'

type Clip = {
  id: string
  fps: number
  frames: number
  duration: number
  atlas: { file: string; cols: number; rows: number; frameW: number; frameH: number }
  anchor: { x: number; y: number }
}

const clips = new Map<string, { clip: Clip; textures: Texture[] }>()

/** Charge les atlas d'effets d'un niveau. Les autres restent sur le disque. */
export async function loadVfx(ids: string[]): Promise<void> {
  const todo = [...new Set(ids)].filter((id) => !clips.has(id))
  await Promise.all(todo.map(async (id) => {
    const clip = (await (await fetch(`/vfx/${id}/clip.json`)).json()) as Clip
    const base = (await Assets.load(`/vfx/${id}/${clip.atlas.file}`)) as Texture
    const { cols, frameW, frameH } = clip.atlas
    const textures: Texture[] = []
    for (let i = 0; i < clip.frames; i++) {
      const col = i % cols
      const row = Math.floor(i / cols)
      textures.push(new Texture(base.baseTexture, new Rectangle(col * frameW, row * frameH, frameW, frameH)))
    }
    clips.set(id, { clip, textures })
  }))
}

/**
 * Joue un effet une fois à la position donnée, en fusion additive.
 * Silencieux si l'atlas n'est pas chargé : un effet manquant ne casse jamais une partie.
 */
export function playVfx(layer: Container, id: string, x: number, y: number, scale = 1): void {
  const entry = clips.get(id)
  if (!entry) return
  const { clip, textures } = entry
  const sprite = new AnimatedSprite(textures)
  sprite.anchor.set(clip.anchor.x / clip.atlas.frameW, clip.anchor.y / clip.atlas.frameH)
  sprite.blendMode = BLEND_MODES.ADD
  sprite.position.set(x, y)
  sprite.scale.set(scale)
  sprite.animationSpeed = clip.fps / 60
  sprite.loop = false
  sprite.onComplete = () => { sprite.destroy() }
  layer.addChild(sprite)
  sprite.play()
}
```

- [ ] **Étape 2 : Écrire `src/render/floats.ts`**

```ts
import { Container, Text, TextStyle } from 'pixi.js'

const STYLES: Record<string, TextStyle> = {
  normal: new TextStyle({ fontFamily: 'Fredoka, sans-serif', fontSize: 16, fontWeight: '700', fill: 0xffffff, stroke: 0x000000, strokeThickness: 3 }),
  crit: new TextStyle({ fontFamily: 'Fredoka, sans-serif', fontSize: 22, fontWeight: '700', fill: 0xffd23f, stroke: 0x000000, strokeThickness: 4 }),
  poison: new TextStyle({ fontFamily: 'Fredoka, sans-serif', fontSize: 13, fontWeight: '700', fill: 0x8be26a, stroke: 0x000000, strokeThickness: 3 }),
  bleed: new TextStyle({ fontFamily: 'Fredoka, sans-serif', fontSize: 13, fontWeight: '700', fill: 0xff8080, stroke: 0x000000, strokeThickness: 3 }),
}

type Float = { text: Text; life: number }
const alive: Float[] = []

/** Nombre de dégâts qui monte et disparaît en 0,8 s. */
export function spawnFloat(layer: Container, value: number, x: number, y: number, kind = 'normal'): void {
  if (value < 0.5) return // les DoT tickent 30 fois par seconde : on n'affiche pas la poussière
  const text = new Text(`-${Math.round(value)}`, STYLES[kind] ?? STYLES.normal)
  text.anchor.set(0.5, 1)
  text.position.set(x, y)
  layer.addChild(text)
  alive.push({ text, life: 0 })
}

/** À appeler chaque frame avec le temps réel écoulé. */
export function tickFloats(dt: number): void {
  for (let i = alive.length - 1; i >= 0; i--) {
    const f = alive[i]
    f.life += dt
    f.text.y -= 28 * dt
    f.text.alpha = Math.max(0, 1 - f.life / 0.8)
    if (f.life >= 0.8) {
      f.text.destroy()
      alive.splice(i, 1)
    }
  }
}
```

- [ ] **Étape 3 : Écrire `src/audio/sfx.ts`**

```ts
const cache = new Map<string, HTMLAudioElement>()

/** Sons du kit. Un seul bouton mute, pas de réglage de volume (GDD §14). */
export class Sfx {
  muted = false

  constructor(private readonly volume = 0.5) {
    try { this.muted = localStorage.getItem('axietd.mute') === '1' } catch { /* stockage indisponible */ }
  }

  play(id: string | string[] | null | undefined): void {
    if (!id || this.muted) return
    if (Array.isArray(id)) { id.forEach((i) => this.play(i)); return }
    let base = cache.get(id)
    if (!base) {
      base = new Audio(`/sfx/${id}.wav`)
      base.preload = 'auto'
      cache.set(id, base)
    }
    // Un clone par lecture : sans ça, deux effets simultanés se coupent.
    const node = base.cloneNode(true) as HTMLAudioElement
    node.volume = this.volume
    void node.play().catch(() => { /* le navigateur exige un geste utilisateur */ })
  }

  toggleMute(): boolean {
    this.muted = !this.muted
    try { localStorage.setItem('axietd.mute', this.muted ? '1' : '0') } catch { /* ignoré */ }
    return this.muted
  }
}
```

- [ ] **Étape 4 : Écrire `src/render/effects.ts` (traduction des événements)**

```ts
import type { Container } from 'pixi.js'
import type { Sfx } from '../audio/sfx'
import { center } from '../sim/grid'
import type { World } from '../sim/world'
import { unitToPx, type Layout } from './layout'
import { spawnFloat } from './floats'
import { ANIM } from './sprites'
import { playVfx } from './vfx'

export type EffectCtx = {
  fx: Container
  layout: Layout
  sfx: Sfx
  /** Appelé quand un ennemi sort : flash rouge et vibration. */
  onLeak: () => void
}

/** Position écran d'une unité, Axie ou chimère. */
function posOf(world: World, uid: number, layout: Layout) {
  const a = world.axies.find((x) => x.uid === uid)
  if (a) { const c = center(a.cell); return unitToPx(layout, c.x, c.y) }
  const e = world.enemies.find((x) => x.uid === uid)
  if (e) { const p = world.board.posAt(e.d); return unitToPx(layout, p.x, p.y) }
  return null
}

/**
 * Traduit les événements de la simulation en images et en sons, puis vide la file.
 * Ne modifie jamais l'état du jeu.
 */
export function consumeEvents(world: World, ctx: EffectCtx): void {
  for (const ev of world.events) {
    switch (ev.k) {
      case 'attack': {
        const anim = ANIM.axie_attack[ev.cls]
        const p = posOf(world, ev.to, ctx.layout)
        if (p && anim) {
          playVfx(ctx.fx, anim.vfx, p.x, p.y, ctx.layout.cell / 180)
          ctx.sfx.play(anim.sfx)
        }
        break
      }
      case 'damage': {
        const p = posOf(world, ev.uid, ctx.layout)
        if (p) spawnFloat(ctx.fx, ev.amount, p.x, p.y - ctx.layout.cell * 0.3, ev.kind)
        break
      }
      case 'status': {
        const p = posOf(world, ev.uid, ctx.layout)
        const s = ANIM.status[ev.id]
        if (p && s) { playVfx(ctx.fx, s.vfx, p.x, p.y, ctx.layout.cell / 200); ctx.sfx.play(s.sfx) }
        break
      }
      case 'reaction': {
        const p = posOf(world, ev.uid, ctx.layout)
        const r = ANIM.reaction[ev.id]
        if (p && r) {
          const list = Array.isArray(r.vfx) ? r.vfx : [r.vfx]
          for (const v of list) playVfx(ctx.fx, v, p.x, p.y, (ctx.layout.cell / 180) * r.scale)
          ctx.sfx.play(r.sfx)
        }
        break
      }
      case 'leak':
        ctx.onLeak()
        ctx.sfx.play(ANIM.level.leak?.sfx)
        break
      case 'waveEnd':
        ctx.sfx.play(ANIM.level.wave_start?.sfx)
        break
      default:
        break
    }
  }
  world.events.length = 0
}
```

- [ ] **Étape 5 : Câbler dans `src/main.ts` et vérifier**

Dans la boucle de rendu, après les pas de simulation, appeler `consumeEvents(world, ctx)` puis `tickFloats(deltaSeconds)` puis `view.sync(world)`. Charger les atlas nécessaires au niveau avec `loadVfx` avant la première vague : les identifiants viennent de `vfx-map.json` pour les classes du draft et les statuts du jeu.

```bash
cd axie-td && npm run dev
```

Attendu : chaque attaque produit un effet lumineux sur la cible et un son. Les nombres de dégâts montent et s'effacent. Un ennemi qui sort fait clignoter le bord de l'écran. Les DoT n'affichent pas de nombre à chaque tick.

- [ ] **Étape 6 : Commiter**

```bash
cd axie-td && git add -A && git commit -m "feat: effets visuels additifs, nombres flottants et sons"
```

---

## Tâche 15 : Fiches d'Axie et de chimère

**Fichiers :**
- Créer : `src/ui/cards.ts`
- Modifier : `src/style.css`, `src/main.ts`
- Test : `tests/ui/cards.test.ts`

**Interfaces :**
- Consomme : `axieDef`, `BALANCE`, `auraSources`.
- Produit :
  - `function axieCardHtml(axieId: string, unit?: AxieUnit, world?: World): string`
  - `function enemyCardHtml(type: string): string`
  - `class CardOverlay` avec `showAxie(...)`, `showEnemy(...)`, `hide()`

**Pourquoi cette tâche compte plus qu'il n'y paraît :** « Axie Core » pèse 35 % de la note du concours, et notre angle est *les traits et les relations*. La fiche d'Axie est l'endroit où le jury voit le lien entre les 6 parts d'un Axie et ce qu'il fait sur le plateau. Elle doit montrer chaque part, sa classe et le bonus qu'elle apporte.

- [ ] **Étape 1 : Écrire le test `tests/ui/cards.test.ts` (il doit échouer)**

```ts
import { describe, expect, it } from 'vitest'
import { axieCardHtml, enemyCardHtml } from '../../src/ui/cards'

describe('fiche d’Axie', () => {
  const html = axieCardHtml('xia')

  it('nomme l’Axie, sa classe et son profil', () => {
    expect(html).toContain('Xia')
    expect(html).toContain('Bête')
    expect(html).toContain('DPS')
  })

  it('détaille les 6 parts avec leur classe', () => {
    for (const part of ['Yeux', 'Oreilles', 'Bouche', 'Corne', 'Dos', 'Queue']) {
      expect(html, part).toContain(part)
    }
    expect(html).toContain('Oiseau') // Xia a 2 parts Oiseau
  })

  it('affiche le bonus chiffré apporté par les parts', () => {
    expect(html).toMatch(/\+\d+\s*%/)
  })

  it('décrit l’aura de la classe', () => {
    expect(html).toContain('Fureur')
  })
})

describe('fiche de chimère', () => {
  const html = enemyCardHtml('treant-fighter')

  it('donne classe, PV, armure et comportement', () => {
    expect(html).toContain('Plante')
    expect(html).toContain('350')
    expect(html).toContain('40')
    expect(html).toContain('ligne')
  })
})
```

- [ ] **Étape 2 : Lancer le test pour vérifier qu'il échoue**

```bash
cd axie-td && npx vitest run tests/ui/cards.test.ts
```

Attendu : ÉCHEC sur l'import de `../../src/ui/cards`.

- [ ] **Étape 3 : Écrire `src/ui/cards.ts`**

```ts
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

const AURA_FR: Record<string, { nom: string; texte: string }> = {
  fury: { nom: 'Fureur', texte: 'Les voisins font +30 % de dégâts aux cibles sous la moitié de leurs PV.' },
  tide: { nom: 'Marée', texte: 'Les cibles touchées par un voisin deviennent Trempées.' },
  roots: { nom: 'Racines', texte: 'Les ennemis des cases voisines perdent 40 % de vitesse.' },
  wind: { nom: 'Vent', texte: 'Les voisins gagnent une case de portée.' },
  swarm: { nom: 'Essaim', texte: 'Les poisons posés par les voisins agissent deux fois plus vite.' },
  scales: { nom: 'Écailles', texte: 'Les ennemis des cases voisines perdent 15 points d’armure.' },
}

const LINE_FR: Record<string, string> = {
  melee: 'Mêlée, peut bloquer sur le chemin',
  ranged: 'Distance, plaine ou colline',
}

const PART_EFFECT: Record<ClassId, string> = {
  beast: '+6 % dégâts', bug: '+3 % dégâts, +3 % cadence', bird: '+6 % cadence',
  aquatic: '+3 % cadence, +3 % PV', plant: '+6 % PV', reptile: '+4 % PV, +2 % dégâts',
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
      <span class="part-eff">${PART_EFFECT[partCls as ClassId] ?? '—'}</span>
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
    <p>${aura.texte}</p>
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
```

- [ ] **Étape 4 : Lancer le test**

```bash
cd axie-td && npx vitest run tests/ui/cards.test.ts
```

Attendu : 5 tests passent.

- [ ] **Étape 5 : Ajouter l'overlay de fiche**

Ajouter à la fin de `src/ui/cards.ts` :

```ts
/** Panneau de fiche, ouvert au tap ou à l'appui long, fermé au tap ailleurs. */
export class CardOverlay {
  readonly el = document.createElement('div')

  constructor() {
    this.el.className = 'card-overlay'
    this.el.hidden = true
    this.el.addEventListener('pointerdown', (e) => {
      if (e.target === this.el) this.hide()
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
```

Et à `src/style.css` :

```css
.card-overlay { position: absolute; inset: 0; z-index: 10; background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; padding: 16px; }
.card-overlay[hidden] { display: none !important; }
.card { width: 100%; max-width: 340px; max-height: 80%; overflow-y: auto; background: #f7f8f3; color: #22302a; border-radius: 18px; padding: 16px 18px; }
.card h3 { margin: 0 0 2px; font-size: 19px; display: flex; align-items: center; gap: 8px; }
.card h4 { margin: 14px 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: .8px; color: #5f6d64; }
.card p { margin: 0; font-size: 13.5px; line-height: 1.45; }
.card-sub { color: #5f6d64; }
.card-note { margin-top: 10px; color: #5f6d64; font-size: 12.5px; }
.card ul { list-style: none; margin: 0; padding: 0; }
.stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 12px; margin-top: 10px; }
.stats li { display: flex; justify-content: space-between; font-size: 13px; border-bottom: 1px solid #dfe4da; padding-bottom: 3px; }
.parts .part { display: grid; grid-template-columns: 22px 62px 1fr auto; align-items: center; gap: 8px; font-size: 12.5px; padding: 3px 0; }
.part .ic { width: 20px; height: 20px; border-radius: 50%; background-size: cover; }
.part-eff { color: #5f6d64; }
.traits li { font-size: 13px; padding: 2px 0 2px 14px; position: relative; }
.traits li::before { content: "•"; position: absolute; left: 2px; }
.card-close { width: 100%; margin-top: 14px; height: 40px; border: 0; border-radius: 12px; background: #2b3a33; color: #fff; font: inherit; font-weight: 600; }
```

- [ ] **Étape 6 : Lancer toute la suite**

```bash
cd axie-td && npm test && npx tsc --noEmit
```

Attendu : tout passe.

- [ ] **Étape 7 : Commiter**

```bash
cd axie-td && git add -A && git commit -m "feat: fiches d'Axie avec les 6 parts et fiches de chimère"
```

---

## Tâche 16 : Sauvegarde et déblocages

**Fichiers :**
- Créer : `src/save/storage.ts`
- Test : `tests/save/storage.test.ts`

**Interfaces :**
- Consomme : `LEVELS`, `PLAYABLE`, `MAX_STARS` de `src/data/load.ts`.
- Produit :
  - `type SaveData = { version: 1; stars: Record<string, number>; lastDraft: Record<string, string[]>; speed2x: boolean; mute: boolean }`
  - `function loadSave(): SaveData`, `function saveNow(data: SaveData): void`
  - `function recordResult(data, levelId, stars): SaveData`
  - `function totalStars(data): number`
  - `function unlockedAxies(data): string[]`
  - `function isLevelOpen(data, levelId): boolean`

**Règles (GDD §8.4, §9.3, §15) :** les déblocages sont **recalculés depuis le total d'étoiles** à chaque chargement, jamais stockés. Le niveau suivant s'ouvre à une étoile. Une nouvelle tentative ne peut que faire monter le score d'un niveau, jamais le baisser. `localStorage` peut être indisponible ou vide : tout accès est protégé et une sauvegarde absente donne une partie neuve.

- [ ] **Étape 1 : Écrire le test `tests/save/storage.test.ts` (il doit échouer)**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import {
  emptySave, isLevelOpen, loadSave, recordResult, saveNow, totalStars, unlockedAxies,
} from '../../src/save/storage'

describe('sauvegarde', () => {
  beforeEach(() => { try { localStorage.clear() } catch { /* ignoré */ } })

  it('donne une partie neuve sans sauvegarde', () => {
    const s = loadSave()
    expect(totalStars(s)).toBe(0)
    expect(unlockedAxies(s)).toHaveLength(6)
    expect(isLevelOpen(s, 1)).toBe(true)
    expect(isLevelOpen(s, 2)).toBe(false)
  })

  it('enregistre un résultat et ouvre le niveau suivant', () => {
    let s = recordResult(emptySave(), 1, 2)
    expect(totalStars(s)).toBe(2)
    expect(isLevelOpen(s, 2)).toBe(true)
    s = recordResult(s, 2, 1)
    expect(totalStars(s)).toBe(3)
    expect(isLevelOpen(s, 3)).toBe(true)
  })

  it('ne fait jamais baisser le score d’un niveau', () => {
    let s = recordResult(emptySave(), 1, 3)
    s = recordResult(s, 1, 1)
    expect(s.stars['1']).toBe(3)
    expect(totalStars(s)).toBe(3)
  })

  it('n’ouvre pas le niveau suivant après une défaite', () => {
    const s = recordResult(emptySave(), 1, 0)
    expect(isLevelOpen(s, 2)).toBe(false)
  })

  it('débloque un Axie par palier d’étoiles', () => {
    const at2 = recordResult(emptySave(), 1, 2)
    expect(unlockedAxies(at2)).toContain('xia')
    expect(unlockedAxies(at2)).not.toContain('ena') // 3 étoiles requises
    const at3 = recordResult(at2, 2, 1)
    expect(unlockedAxies(at3)).toContain('ena')
  })

  it('n’inclut jamais l’Axie Dusk', () => {
    const s = { ...emptySave(), stars: { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3, 7: 3, 8: 3 } }
    expect(totalStars(s)).toBe(24)
    expect(unlockedAxies(s)).toHaveLength(19)
    expect(unlockedAxies(s)).not.toContain('support-dusk')
  })

  it('fait un aller-retour par le stockage', () => {
    saveNow(recordResult(emptySave(), 1, 3))
    expect(loadSave().stars['1']).toBe(3)
  })

  it('repart de zéro sur une sauvegarde illisible', () => {
    localStorage.setItem('axietd.save', '{ pas du json')
    expect(totalStars(loadSave())).toBe(0)
  })
})
```

- [ ] **Étape 2 : Lancer le test pour vérifier qu'il échoue**

```bash
cd axie-td && npx vitest run tests/save/storage.test.ts
```

Attendu : ÉCHEC sur l'import de `../../src/save/storage`.

- [ ] **Étape 3 : Écrire `src/save/storage.ts`**

```ts
import { LEVELS, PLAYABLE } from '../data/load'

const KEY = 'axietd.save'

export type SaveData = {
  version: 1
  /** Meilleur score par niveau, indexé par identifiant sous forme de chaîne. */
  stars: Record<string, number>
  /** Dernier draft joué par niveau, proposé par défaut à la tentative suivante. */
  lastDraft: Record<string, string[]>
  speed2x: boolean
  mute: boolean
}

export function emptySave(): SaveData {
  return { version: 1, stars: {}, lastDraft: {}, speed2x: false, mute: false }
}

/** Une sauvegarde absente, vide ou illisible donne une partie neuve. */
export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptySave()
    const parsed = JSON.parse(raw) as Partial<SaveData>
    if (parsed.version !== 1) return emptySave()
    return {
      version: 1,
      stars: parsed.stars ?? {},
      lastDraft: parsed.lastDraft ?? {},
      speed2x: parsed.speed2x ?? false,
      mute: parsed.mute ?? false,
    }
  } catch {
    return emptySave()
  }
}

export function saveNow(data: SaveData): void {
  try { localStorage.setItem(KEY, JSON.stringify(data)) } catch { /* stockage indisponible */ }
}

export function totalStars(data: SaveData): number {
  return Object.values(data.stars).reduce((sum, s) => sum + s, 0)
}

/** Enregistre un résultat. Le score d'un niveau ne peut que monter. */
export function recordResult(data: SaveData, levelId: number, stars: number): SaveData {
  const key = String(levelId)
  const next: SaveData = { ...data, stars: { ...data.stars } }
  next.stars[key] = Math.max(next.stars[key] ?? 0, stars)
  saveNow(next)
  return next
}

export function rememberDraft(data: SaveData, levelId: number, draft: string[]): SaveData {
  const next: SaveData = { ...data, lastDraft: { ...data.lastDraft, [String(levelId)]: draft } }
  saveNow(next)
  return next
}

/**
 * Axies disponibles, recalculés depuis le total d'étoiles.
 * Rien n'est stocké : le total est la seule source de vérité (GDD §15).
 */
export function unlockedAxies(data: SaveData): string[] {
  const stars = totalStars(data)
  return PLAYABLE
    .filter((a) => a.unlock.type === 'start' || (a.unlock.type === 'stars' && stars >= (a.unlock.stars ?? Infinity)))
    .map((a) => a.id)
}

/** Le premier niveau est toujours ouvert. Les suivants exigent une étoile au précédent. */
export function isLevelOpen(data: SaveData, levelId: number): boolean {
  if (levelId <= LEVELS[0].id) return true
  return (data.stars[String(levelId - 1)] ?? 0) >= 1
}

/** Le prochain Axie à débloquer et le nombre d'étoiles qui manque, pour l'écran de résultat. */
export function nextUnlock(data: SaveData): { id: string; name: string; missing: number } | null {
  const stars = totalStars(data)
  const candidates = PLAYABLE
    .filter((a) => a.unlock.type === 'stars' && (a.unlock.stars ?? 0) > stars)
    .sort((a, b) => (a.unlock.stars ?? 0) - (b.unlock.stars ?? 0))
  const next = candidates[0]
  return next ? { id: next.id, name: next.name, missing: (next.unlock.stars ?? 0) - stars } : null
}
```

- [ ] **Étape 4 : Configurer Vitest pour donner accès à `localStorage`**

Créer `vitest.config.ts` à la racine de `axie-td/` :

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Les tests de simulation tournent en Node, ceux de sauvegarde ont besoin du DOM.
    environmentMatchGlobs: [
      ['tests/save/**', 'jsdom'],
      ['tests/ui/**', 'jsdom'],
    ],
  },
})
```

Puis installer l'environnement DOM :

```bash
cd axie-td && npm install -D jsdom
```

- [ ] **Étape 5 : Lancer le test**

```bash
cd axie-td && npx vitest run tests/save/storage.test.ts
```

Attendu : 8 tests passent.

- [ ] **Étape 6 : Commiter**

```bash
cd axie-td && git add -A && git commit -m "feat: sauvegarde locale, étoiles et déblocage de la collection"
```

---

## Tâche 17 : Écrans et navigation

**Fichiers :**
- Créer : `src/ui/screens.ts`, `src/ui/router.ts`, `src/game/session.ts`
- Modifier : `src/main.ts`, `src/style.css`
- Test : `tests/ui/router.test.ts`

**Interfaces :**
- Consomme : tout ce qui précède.
- Produit :
  - `type ScreenId = 'title' | 'map' | 'brief' | 'draft' | 'play' | 'result' | 'defeat' | 'collection'`
  - `class Router` avec `go(id, params?)`, `onEnter(id, cb)`
  - `class Session` : porte le monde en cours, le draft, la sauvegarde, et pilote la boucle

**Les huit écrans (GDD §11.5) :** titre, carte de campagne, fiche du niveau, draft, jeu, résultat, défaite, collection. Tous en HTML sauf le jeu, dont le plateau est en Pixi.

**Points de règle à respecter :**
- Le draft compte **5 Axies**, sauf aux niveaux 1 et 2 où il est imposé et peut en compter moins.
- « Réessayer » conserve le draft. « Changer le draft » revient à l'écran de draft.
- La fiche du niveau montre le chemin en miniature et les **classes des chimères annoncées** : le draft doit être un choix informé, pas un pari.

- [ ] **Étape 1 : Écrire le test `tests/ui/router.test.ts` (il doit échouer)**

```ts
import { describe, expect, it } from 'vitest'
import { Router } from '../../src/ui/router'

describe('navigation', () => {
  it('démarre sur le titre', () => {
    expect(new Router().current).toBe('title')
  })

  it('prévient les abonnés d’un écran à l’entrée', () => {
    const r = new Router()
    const seen: unknown[] = []
    r.onEnter('brief', (p) => seen.push(p))
    r.go('brief', { levelId: 3 })
    expect(r.current).toBe('brief')
    expect(seen).toEqual([{ levelId: 3 }])
  })

  it('garde une pile de retour', () => {
    const r = new Router()
    r.go('map')
    r.go('brief', { levelId: 1 })
    expect(r.back()).toBe('map')
    expect(r.current).toBe('map')
  })

  it('revient au titre quand la pile est vide', () => {
    const r = new Router()
    expect(r.back()).toBe('title')
  })
})
```

- [ ] **Étape 2 : Lancer le test pour vérifier qu'il échoue**

```bash
cd axie-td && npx vitest run tests/ui/router.test.ts
```

Attendu : ÉCHEC sur l'import de `../../src/ui/router`.

- [ ] **Étape 3 : Écrire `src/ui/router.ts`**

```ts
export type ScreenId =
  | 'title' | 'map' | 'brief' | 'draft' | 'play' | 'result' | 'defeat' | 'collection'

export type ScreenParams = Record<string, unknown>

/** Navigation à un seul écran visible et une pile de retour. */
export class Router {
  current: ScreenId = 'title'
  private stack: ScreenId[] = []
  private handlers = new Map<ScreenId, ((p: ScreenParams) => void)[]>()

  onEnter(id: ScreenId, cb: (p: ScreenParams) => void): void {
    const list = this.handlers.get(id) ?? []
    list.push(cb)
    this.handlers.set(id, list)
  }

  go(id: ScreenId, params: ScreenParams = {}): void {
    if (id !== this.current) this.stack.push(this.current)
    this.current = id
    for (const cb of this.handlers.get(id) ?? []) cb(params)
  }

  /** Revient à l'écran précédent, ou au titre si la pile est vide. */
  back(): ScreenId {
    const prev = this.stack.pop() ?? 'title'
    this.current = prev
    for (const cb of this.handlers.get(prev) ?? []) cb({})
    return prev
  }
}
```

- [ ] **Étape 4 : Lancer le test**

```bash
cd axie-td && npx vitest run tests/ui/router.test.ts
```

Attendu : 4 tests passent.

- [ ] **Étape 5 : Écrire `src/game/session.ts`**

```ts
import { LEVELS, axieDef, levelDef } from '../data/load'
import { step } from '../sim/game'
import { DT } from '../sim/types'
import { createWorld, startWave, type World } from '../sim/world'
import {
  loadSave, recordResult, rememberDraft, unlockedAxies, type SaveData,
} from '../save/storage'

/** Porte la partie en cours : le monde, le draft, la sauvegarde et la cadence. */
export class Session {
  save: SaveData = loadSave()
  world: World | null = null
  draft: string[] = []
  levelId = 1
  speed2x = false
  private acc = 0

  /** Draft imposé du niveau, ou le dernier draft joué, ou les 5 premiers Axies disponibles. */
  suggestedDraft(levelId: number): string[] {
    const forced = levelDef(levelId).draft.forced
    if (forced) return [...forced]
    const last = this.save.lastDraft[String(levelId)]
    const open = new Set(unlockedAxies(this.save))
    if (last && last.every((id) => open.has(id))) return [...last]
    return unlockedAxies(this.save).slice(0, 5)
  }

  /** Chimères annoncées du niveau, pour la fiche et le draft. */
  announcedEnemies(levelId: number): string[] {
    return [...new Set(levelDef(levelId).waves.flatMap((w) => w.spawns.map((s) => s.enemy)))]
  }

  begin(levelId: number, draft: string[]): void {
    this.levelId = levelId
    this.draft = draft.filter((id) => axieDef(id).class !== 'dusk')
    this.world = createWorld(levelId)
    this.acc = 0
    this.save = rememberDraft(this.save, levelId, this.draft)
  }

  /** Rejoue le même niveau avec le même draft : les vagues sont identiques. */
  retry(): void {
    this.begin(this.levelId, this.draft)
  }

  launchWave(): void {
    if (this.world) startWave(this.world)
  }

  /** Avance la simulation du temps réel écoulé, à pas fixe. */
  advance(realSeconds: number): void {
    const w = this.world
    if (!w || w.phase !== 'wave') return
    // Plafond de rattrapage : après un onglet en arrière-plan, on ne rejoue pas 10 s d'un coup.
    this.acc = Math.min(this.acc + realSeconds * (this.speed2x ? 2 : 1), 0.5)
    while (this.acc >= DT && w.phase === 'wave') {
      step(w)
      this.acc -= DT
    }
  }

  /** Enregistre le résultat une fois le niveau terminé. Renvoie les étoiles. */
  finish(): number {
    const w = this.world
    if (!w || (w.phase !== 'won' && w.phase !== 'lost')) return 0
    const stars = w.phase === 'won'
      ? (LEVELS.find((l) => l.id === this.levelId) ? Math.max(0, w.lives) : 0)
      : 0
    this.save = recordResult(this.save, this.levelId, stars)
    return stars
  }
}
```

**Attention :** `finish` doit utiliser `starsFor`, pas `w.lives` directement, pour que la table du GDD reste la seule source. Corriger à l'étape suivante.

- [ ] **Étape 6 : Corriger le calcul des étoiles dans `session.ts`**

Remplacer l'import et la méthode `finish` :

```ts
import { starsFor, step } from '../sim/game'
```

```ts
  /** Enregistre le résultat une fois le niveau terminé. Renvoie les étoiles. */
  finish(): number {
    const w = this.world
    if (!w || (w.phase !== 'won' && w.phase !== 'lost')) return 0
    const stars = w.phase === 'won' ? starsFor(w.lives) : 0
    this.save = recordResult(this.save, this.levelId, stars)
    return stars
  }
```

Retirer `LEVELS` de l'import de `../data/load` s'il n'est plus utilisé, sinon `noUnusedLocals` fera échouer `tsc`.

- [ ] **Étape 7 : Écrire `src/ui/screens.ts`**

```ts
import { LEVELS, PLAYABLE, axieDef, levelDef } from '../data/load'
import type { LevelDef } from '../data/types'
import { CLASS_FR, axieCardHtml } from './cards'
import { isLevelOpen, nextUnlock, totalStars, unlockedAxies, type SaveData } from '../save/storage'
import type { Session } from '../game/session'

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const starRow = (n: number) => `<span class="stars" aria-label="${n} étoiles sur 3">${'★'.repeat(n)}${'☆'.repeat(3 - n)}</span>`

/** Miniature du chemin en SVG, pour la fiche du niveau. */
export function pathThumb(level: LevelDef): string {
  const cells = level.path.map(([c, r]) => `${c * 10 + 5},${r * 10 + 5}`).join(' ')
  const hills = level.hills
    .map(([c, r]) => `<rect x="${c * 10 + 2}" y="${r * 10 + 2}" width="6" height="6" rx="2" fill="#c9c2b0"/>`)
    .join('')
  return `<svg viewBox="0 0 70 100" class="thumb" role="img" aria-label="Tracé du chemin">
    <rect width="70" height="100" fill="#b6c4a5"/>
    ${hills}
    <polyline points="${cells}" fill="none" stroke="#9a7b5b" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`
}

export function titleHtml(save: SaveData): string {
  return `<div class="screen screen-title">
    <h1>Axie<br>Tower Defense</h1>
    <p class="tagline">La force vient des liens, pas des niveaux.</p>
    <button type="button" class="cta" data-go="map">Jouer</button>
    <button type="button" class="ghost" data-go="collection">Collection</button>
    <p class="legal">${totalStars(save)} étoiles sur 24 · Assets Axie Infinity, Sky Mavis</p>
  </div>`
}

export function mapHtml(save: SaveData): string {
  const rows = LEVELS.map((l) => {
    const open = isLevelOpen(save, l.id)
    const stars = save.stars[String(l.id)] ?? 0
    return `<button type="button" class="level${open ? '' : ' is-locked'}" ${open ? `data-level="${l.id}"` : 'disabled'}
      aria-label="Niveau ${l.id}, ${esc(l.name)}${open ? `, ${stars} étoiles` : ', verrouillé'}">
      <span class="level-num">${l.id}</span>
      <span class="level-name">${esc(l.name)}</span>
      ${open ? starRow(stars) : '<span class="stars">Verrouillé</span>'}
    </button>`
  }).join('')
  const next = nextUnlock(save)
  return `<div class="screen screen-map">
    <header class="screen-top"><button type="button" class="ghost" data-go="title">Retour</button>
      <span>${totalStars(save)} ★ / 24</span></header>
    <div class="levels">${rows}</div>
    ${next ? `<p class="hint">Encore ${next.missing} étoile${next.missing > 1 ? 's' : ''} pour ${esc(next.name)}.</p>` : ''}
  </div>`
}

export function briefHtml(session: Session, levelId: number): string {
  const l = levelDef(levelId)
  const stars = session.save.stars[String(levelId)] ?? 0
  const enemies = session.announcedEnemies(levelId).map((type) => {
    const cls = (session.announcedClass(type))
    return `<li><i class="ic ic-${cls}"></i><span>${esc(type)}</span><em>${CLASS_FR[cls]}</em></li>`
  }).join('')
  return `<div class="screen screen-brief">
    <header class="screen-top"><button type="button" class="ghost" data-go="map">Retour</button>
      <span>Niveau ${l.id}</span></header>
    <h2>${esc(l.name)}</h2>
    <div class="brief-body">
      ${pathThumb(l)}
      <div>
        <p>${l.waves.length} vagues · ${l.hills.length} colline${l.hills.length > 1 ? 's' : ''} · meilleur score ${starRow(stars)}</p>
        <h4>Chimères annoncées</h4>
        <ul class="enemy-list">${enemies}</ul>
      </div>
    </div>
    <button type="button" class="cta" data-draft="${l.id}">Choisir mes Axies</button>
  </div>`
}

export function draftHtml(session: Session, levelId: number, picked: string[]): string {
  const forced = levelDef(levelId).draft.forced
  const open = unlockedAxies(session.save)
  const slots = Array.from({ length: 5 }, (_, i) => {
    const id = picked[i]
    if (!id) return `<span class="pick is-empty">${i + 1}</span>`
    const def = axieDef(id)
    const cls = def.class === 'dusk' ? 'beast' : def.class
    return `<button type="button" class="pick cls-${cls}" data-unpick="${id}" aria-label="Retirer ${esc(def.name)}">
      <i class="ic ic-${cls}"></i><span>${esc(def.name)}</span></button>`
  }).join('')

  const grid = open.map((id) => {
    const def = axieDef(id)
    const cls = def.class === 'dusk' ? 'beast' : def.class
    const on = picked.includes(id)
    return `<button type="button" class="collect cls-${cls}${on ? ' is-on' : ''}" data-pick="${id}"
      aria-label="${esc(def.name)}, ${CLASS_FR[cls]}, ${esc(def.profile ?? 'Hybride')}">
      <i class="ic ic-${cls}"></i><span class="nm">${esc(def.name)}</span>
      <span class="pr">${esc(def.profile ?? 'Hybride')}</span></button>`
  }).join('')

  return `<div class="screen screen-draft">
    <header class="screen-top"><button type="button" class="ghost" data-go="brief">Retour</button>
      <span>${forced ? 'Équipe imposée' : 'Choisis 5 Axies'}</span></header>
    <div class="picks">${slots}</div>
    ${forced ? '<p class="hint">Ce niveau te prête une équipe. Le choix s’ouvre au niveau 3.</p>' : ''}
    <div class="collection">${grid}</div>
    <button type="button" class="cta" data-play="${levelId}" ${picked.length === 0 ? 'disabled' : ''}>Jouer</button>
  </div>`
}

export function resultHtml(levelId: number, stars: number, save: SaveData, unlocked: string | null): string {
  const l = levelDef(levelId)
  const last = levelId >= LEVELS.at(-1)!.id
  return `<div class="screen screen-result">
    <h2>${esc(l.name)}</h2>
    <div class="big-stars">${starRow(stars)}</div>
    <p>${stars === 3 ? 'Aucune fuite. Formation parfaite.' : `${3 - stars} chimère${3 - stars > 1 ? 's' : ''} passée${3 - stars > 1 ? 's' : ''}.`}</p>
    ${unlocked ? `<div class="unlock">${axieCardHtml(unlocked)}</div>` : ''}
    <p class="hint">${totalStars(save)} ★ / 24</p>
    ${last ? '<p class="hint">Campagne terminée. Merci d’avoir joué.</p>'
      : `<button type="button" class="cta" data-level="${levelId + 1}">Niveau suivant</button>`}
    <button type="button" class="ghost" data-retry="${levelId}">Rejouer</button>
    <button type="button" class="ghost" data-go="map">Carte</button>
  </div>`
}

export function defeatHtml(levelId: number, wave: number): string {
  const l = levelDef(levelId)
  return `<div class="screen screen-defeat">
    <h2>${esc(l.name)}</h2>
    <p>Les chimères sont passées à la vague ${wave} sur ${l.waves.length}.</p>
    <p class="hint">Les vagues sont identiques à chaque essai. Change ta disposition.</p>
    <button type="button" class="cta" data-retry="${levelId}">Réessayer</button>
    <button type="button" class="ghost" data-draft="${levelId}">Changer le draft</button>
    <button type="button" class="ghost" data-go="map">Carte</button>
  </div>`
}

export function collectionHtml(save: SaveData): string {
  const open = new Set(unlockedAxies(save))
  const stars = totalStars(save)

  const unlockedList = PLAYABLE.filter((a) => open.has(a.id)).map((def) => {
    const cls = def.class === 'dusk' ? 'beast' : def.class
    return `<button type="button" class="collect cls-${cls}" data-card="${def.id}"
      aria-label="${esc(def.name)}, ${CLASS_FR[cls]}">
      <i class="ic ic-${cls}"></i><span class="nm">${esc(def.name)}</span>
      <span class="pr">${esc(def.profile ?? 'Hybride')}</span></button>`
  }).join('')

  const lockedList = PLAYABLE
    .filter((a) => !open.has(a.id) && a.unlock.type === 'stars')
    .sort((a, b) => (a.unlock.stars ?? 0) - (b.unlock.stars ?? 0))
    .map((a) => `<span class="collect is-locked" aria-label="Verrouillé, ${a.unlock.stars} étoiles requises">
      <i class="ic"></i><span class="nm">${a.unlock.stars} ★</span></span>`)
    .join('')

  return `<div class="screen screen-collection">
    <header class="screen-top"><button type="button" class="ghost" data-go="title">Retour</button>
      <span>${open.size} / ${PLAYABLE.length} Axies · ${stars} ★</span></header>
    <div class="collection">${unlockedList}${lockedList}</div>
  </div>`
}
```

- [ ] **Étape 8 : Ajouter `announcedClass` à `src/game/session.ts`**

`briefHtml` en a besoin pour afficher la classe de chaque chimère annoncée. Ajouter la méthode à la classe `Session`, avec `BALANCE` dans son import de `../data/load` :

```ts
  /** Classe d'une chimère annoncée, pour l'afficher sur la fiche du niveau. */
  announcedClass(type: string): string {
    return BALANCE.enemies[type]?.class ?? 'beast'
  }
```

- [ ] **Étape 9 : Câbler la navigation dans `src/main.ts`**

Assembler : un conteneur HTML pour les écrans, le `GameApp` pour l'écran de jeu uniquement, et une délégation d'événements unique sur les attributs `data-go`, `data-level`, `data-draft`, `data-play`, `data-retry`, `data-pick`, `data-unpick`, `data-card`. Avant d'entrer sur `play`, charger les squelettes du draft et des chimères annoncées avec `loadSkeletons`, et les atlas d'effets avec `loadVfx`. Sur `levelEnd`, appeler `session.finish()` puis aller sur `result` ou `defeat`.

- [ ] **Étape 10 : Vérifier au navigateur, campagne complète**

```bash
cd axie-td && npm run dev
```

Attendu : le titre mène à la carte, la carte au niveau 1, la fiche montre le chemin et les chimères, le draft imposé se pré-remplit, le jeu se lance, le résultat affiche les étoiles et débloque Xia à 2 étoiles. Les niveaux 2 et suivants s'ouvrent au fur et à mesure. La collection liste les Axies obtenus et les paliers restants.

- [ ] **Étape 11 : Lancer toute la suite**

```bash
cd axie-td && npm test && npx tsc --noEmit
```

Attendu : tout passe, aucune erreur de type.

- [ ] **Étape 12 : Commiter**

```bash
cd axie-td && git add -A && git commit -m "feat: les huit écrans, navigation et session de jeu"
```

---

## Tâche 18 : Onboarding des niveaux 1 à 3

**Fichiers :**
- Créer : `src/ui/onboarding.ts`
- Modifier : `src/main.ts`, `src/style.css`
- Test : `tests/ui/onboarding.test.ts`

**Interfaces :**
- Consomme : `World`, `Layout`.
- Produit :
  - `type Hint = { id: string; level: number; wave: number; text: string; anchor: HintAnchor; done: (w: World) => boolean }`
  - `function hintsFor(levelId: number, waveIndex: number): Hint[]`
  - `class Onboarding` avec `update(world)`, `dismiss(id)`

**Règle (GDD §12) : zéro paragraphe.** Trois bulles au maximum par niveau, chacune disparaît au premier geste correct. Le niveau 1 apprend à poser et à bloquer, le niveau 2 les auras et une seule réaction en chaîne, le niveau 3 la lecture des chimères annoncées. Ensuite, plus rien : le reste s'apprend par les fiches et par les effets visuels distincts.

- [ ] **Étape 1 : Écrire le test `tests/ui/onboarding.test.ts` (il doit échouer)**

```ts
import { describe, expect, it } from 'vitest'
import { createWorld } from '../../src/sim/world'
import { place } from '../../src/sim/placement'
import { hintsFor } from '../../src/ui/onboarding'

describe('onboarding', () => {
  it('donne au plus trois bulles par niveau', () => {
    for (const level of [1, 2, 3]) {
      const all = [0, 1, 2, 3, 4].flatMap((wave) => hintsFor(level, wave))
      expect(all.length, `niveau ${level}`).toBeLessThanOrEqual(3)
    }
  })

  it('ne dit plus rien à partir du niveau 4', () => {
    expect(hintsFor(4, 0)).toHaveLength(0)
    expect(hintsFor(8, 0)).toHaveLength(0)
  })

  it('demande d’abord de poser un bloqueur sur le chemin', () => {
    const hints = hintsFor(1, 0)
    expect(hints[0].text).toContain('chemin')
    const w = createWorld(1)
    expect(hints[0].done(w)).toBe(false)
    place(w, 'olek', w.level.path[6])
    expect(hints[0].done(w)).toBe(true)
  })

  it('explique les auras à la première vague du niveau 2', () => {
    const hints = hintsFor(2, 0)
    expect(hints[0].text.toLowerCase()).toContain('ralentiss')
  })

  it('n’explique qu’une seule réaction en chaîne', () => {
    const all = [1, 2, 3].flatMap((l) => [0, 1, 2].flatMap((wv) => hintsFor(l, wv)))
    const chain = all.filter((h) => h.text.includes('deux fois'))
    expect(chain).toHaveLength(1)
  })
})
```

- [ ] **Étape 2 : Lancer le test pour vérifier qu'il échoue**

```bash
cd axie-td && npx vitest run tests/ui/onboarding.test.ts
```

Attendu : ÉCHEC sur l'import de `../../src/ui/onboarding`.

- [ ] **Étape 3 : Écrire `src/ui/onboarding.ts`**

```ts
import { auraSources } from '../sim/auras'
import type { World } from '../sim/world'

export type HintAnchor =
  | { at: 'cell'; pathIndex: number }
  | { at: 'launch' }
  | { at: 'tray' }
  | { at: 'board' }

export type Hint = {
  id: string
  level: number
  wave: number
  text: string
  anchor: HintAnchor
  /** La bulle disparaît dès que ceci est vrai : au premier geste correct, pas au bout d'un délai. */
  done: (w: World) => boolean
}

const HINTS: Hint[] = [
  {
    id: 'l1-block', level: 1, wave: 0, anchor: { at: 'cell', pathIndex: 6 },
    text: 'Glisse Buba sur le chemin. Il bloque les chimères.',
    done: (w) => w.axies.some((a) => a.pathIndex >= 0),
  },
  {
    id: 'l1-launch', level: 1, wave: 0, anchor: { at: 'launch' },
    text: 'Lance la vague quand ta formation te convient.',
    done: (w) => w.phase !== 'placement' || w.waveIndex > 0,
  },
  {
    id: 'l1-range', level: 1, wave: 1, anchor: { at: 'board' },
    text: 'Momo tire loin. Place-le à côté du chemin, là où il voit le plus de cases.',
    done: (w) => w.axies.some((a) => a.cls === 'bird' && a.pathIndex < 0),
  },
  {
    id: 'l2-aura', level: 2, wave: 0, anchor: { at: 'board' },
    text: 'Les cases voisines d’Olek ralentissent les chimères.',
    done: (w) => w.axies.some((a) => a.cls === 'plant' && !a.ko),
  },
  {
    id: 'l2-chain', level: 2, wave: 1, anchor: { at: 'board' },
    text: 'Pomodoro à côté d’Olek : son poison dure deux fois plus longtemps.',
    done: (w) => w.axies.some((a) => a.cls === 'bug' && auraSources(w, a).some((s) => s.cls === 'plant')),
  },
  {
    id: 'l3-read', level: 3, wave: 0, anchor: { at: 'tray' },
    text: 'Regarde les chimères annoncées avant de choisir ton équipe.',
    done: (w) => w.waveIndex > 0,
  },
]

/** Bulles dues pour un niveau et une vague. Vide à partir du niveau 4. */
export function hintsFor(levelId: number, waveIndex: number): Hint[] {
  return HINTS.filter((h) => h.level === levelId && h.wave === waveIndex)
}

/** Affiche au plus une bulle à la fois et la retire au premier geste correct. */
export class Onboarding {
  readonly el = document.createElement('div')
  private dismissed = new Set<string>()
  private showing: Hint | null = null

  constructor() {
    this.el.className = 'hint-bubble'
    this.el.hidden = true
  }

  mount(parent: HTMLElement): void { parent.append(this.el) }

  /** Efface la mémoire des bulles vues : appelé quand on démarre un niveau. */
  reset(): void {
    this.dismissed.clear()
    this.showing = null
    this.el.hidden = true
  }

  update(w: World): void {
    if (this.showing && this.showing.done(w)) {
      this.dismissed.add(this.showing.id)
      this.showing = null
    }
    if (!this.showing) {
      this.showing = hintsFor(w.level.id, w.waveIndex)
        .find((h) => !this.dismissed.has(h.id) && !h.done(w)) ?? null
    }
    if (!this.showing) { this.el.hidden = true; return }
    if (this.el.textContent !== this.showing.text) this.el.textContent = this.showing.text
    this.el.dataset.anchor = this.showing.anchor.at
    this.el.hidden = false
  }
}
```

- [ ] **Étape 4 : Ajouter le style de la bulle à `src/style.css`**

```css
.hint-bubble { position: absolute; left: 50%; transform: translateX(-50%); z-index: 6; max-width: 260px; padding: 10px 12px; border-radius: 14px; background: #fff; color: #22302a; font-size: 13px; font-weight: 600; line-height: 1.35; box-shadow: 0 6px 16px rgba(0,0,0,.3); }
.hint-bubble[hidden] { display: none !important; }
.hint-bubble[data-anchor="launch"] { bottom: 76px; }
.hint-bubble[data-anchor="tray"] { bottom: 168px; }
.hint-bubble[data-anchor="board"], .hint-bubble[data-anchor="cell"] { top: 64px; }
```

- [ ] **Étape 5 : Câbler dans `src/main.ts`**

Instancier `Onboarding`, appeler `reset()` à l'entrée sur `play` et `update(world)` dans la boucle de rendu, uniquement si `levelDef(levelId).onboarding` est vrai.

- [ ] **Étape 6 : Lancer le test**

```bash
cd axie-td && npx vitest run tests/ui/onboarding.test.ts
```

Attendu : 5 tests passent.

- [ ] **Étape 7 : Vérifier au navigateur**

```bash
cd axie-td && npm run dev
```

Attendu : au niveau 1, une bulle demande de poser un bloqueur sur le chemin et disparaît dès qu'on le fait, sans délai. Puis une bulle sur le bouton de lancement. Au niveau 4, aucune bulle.

- [ ] **Étape 8 : Commiter**

```bash
cd axie-td && git add -A && git commit -m "feat: onboarding sans paragraphe des niveaux 1 à 3"
```

---

## Tâche 19 : Accessibilité, vitesse double et performance

**Fichiers :**
- Modifier : `src/ui/hud.ts`, `src/ui/overlay.ts`, `src/render/view.ts`, `src/style.css`, `index.html`
- Créer : `src/ui/icons.ts`, `tests/a11y.test.ts`

**Interfaces :**
- Produit : `const CLASS_ICON: Record<ClassId, string>` — icônes de classe du toolkit en données URI, et `const STATUS_GLYPH: Record<StatusId, string>` — un caractère par statut.

**Exigences de l'organisateur, à satisfaire toutes :** texte lisible et contrasté, jamais d'information transmise par la couleur seule, contrôles affichés dans le jeu, bouton de volume ou de coupure, pas de clignotement excessif ni de secousse de caméra permanente, contrôles confortables à atteindre, navigation clavier là où c'est pertinent, contrôles tactiles testés si le mobile est annoncé, et une reprise rapide après échec.

**Ce qui manque encore et que cette tâche règle :**
1. Les liserés d'aura ne portent que la couleur. Il faut y ajouter l'icône de la classe qui donne l'aura.
2. Les statuts sur les ennemis ne sont pas identifiés. Il faut une pastille avec un glyphe.
3. Les cases invalides pendant un glissement ne sont pas marquées.
4. Le bouton ×2 et le bouton mute doivent exister, être persistants et étiquetés.
5. Une page « contrôles et appareils » est exigée par le règlement du concours.

- [ ] **Étape 1 : Générer `src/ui/icons.ts` depuis les icônes du toolkit**

Ajouter à `tools/copy-assets.mjs`, avant l'écriture du manifeste :

```js
// Icônes de classe en données URI : 6 fichiers de moins de 2 Ko, inlinés dans le bundle.
const ICON_SRC = join(KIT2D, 'Sprites', 'axie-class-icon')
const iconLines = []
for (const cls of ['beast', 'aquatic', 'plant', 'bird', 'bug', 'reptile']) {
  const buf = await sharp(join(ICON_SRC, `${cls}.png`)).resize(48, 48).webp({ quality: 90 }).toBuffer()
  iconLines.push(`  ${cls}: 'data:image/webp;base64,${buf.toString('base64')}',`)
}
writeFileSync(
  join(ROOT, 'src', 'ui', 'icons.generated.ts'),
  `// Généré par tools/copy-assets.mjs. Ne pas modifier à la main.\n`
  + `export const CLASS_ICON: Record<string, string> = {\n${iconLines.join('\n')}\n}\n`,
)
```

Puis relancer :

```bash
cd axie-td && npm run assets
```

Attendu : `src/ui/icons.generated.ts` existe et contient six chaînes de données.

- [ ] **Étape 2 : Écrire `src/ui/icons.ts`**

```ts
import type { StatusId } from '../data/types'
import { CLASS_ICON } from './icons.generated'

export { CLASS_ICON }

/**
 * Un glyphe par statut, affiché en pastille sur l'ennemi.
 * L'information ne passe jamais par la seule couleur : c'est une exigence
 * d'accessibilité du concours, et ça aide aussi la lisibilité à 43 px la case.
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

/** Règle CSS des icônes de classe, injectée une fois au démarrage. */
export function injectIconStyles(): void {
  const css = Object.entries(CLASS_ICON)
    .map(([cls, uri]) => `.ic-${cls}{background-image:url(${uri})}`)
    .join('\n')
  const style = document.createElement('style')
  style.textContent = `.ic{background-size:cover;background-position:center;border-radius:50%;display:inline-block}\n${css}`
  document.head.append(style)
}
```

- [ ] **Étape 3 : Ajouter l'icône de classe au liseré d'aura**

Dans `src/ui/overlay.ts`, après avoir dessiné le liseré, ajouter un petit rond portant l'icône de la classe source. Comme Pixi ne charge pas facilement une donnée URI en texture partagée, le plus simple est un `Sprite` créé une fois par classe et mis en cache :

```ts
import { Sprite, Texture } from 'pixi.js'
import { CLASS_ICON } from './icons'

const iconCache = new Map<string, Texture>()

function iconTexture(cls: string): Texture {
  let t = iconCache.get(cls)
  if (!t) { t = Texture.from(CLASS_ICON[cls]); iconCache.set(cls, t) }
  return t
}
```

Puis, dans la boucle des liserés, après le `drawRoundedRect` :

```ts
      const badge = new Sprite(iconTexture(src.cls))
      badge.anchor.set(0.5)
      badge.width = badge.height = c * 0.2
      badge.position.set(mid.x, mid.y)
      target.addChild(badge)
```

Attention à l'ordre : `target.addChild(g)` doit venir **avant** les badges pour qu'ils passent au-dessus. Déplacer `target.addChild(g)` au tout début de la fonction, juste après `target.removeChildren()`.

- [ ] **Étape 4 : Ajouter les pastilles de statut dans `src/render/view.ts`**

Dans `sync`, pour chaque ennemi, après la barre de vie :

```ts
      // Pastilles de statut : un glyphe par effet, jamais la couleur seule.
      const glyphs = e.statuses.map((s) => STATUS_GLYPH[s.id]).join('')
      if (v.status.text !== glyphs) v.status.text = glyphs
      v.status.position.set(0, -c * 0.95)
```

avec, dans `Visual`, un champ `status: Text` créé dans `ensure` :

```ts
    const status = new Text('', new TextStyle({ fontSize: 11, fill: 0xffffff }))
    status.anchor.set(0.5, 1)
    root.addChild(spine, bar, status)
```

et l'import `import { STATUS_GLYPH } from '../ui/icons'`.

- [ ] **Étape 5 : Marquer les cases invalides pendant un glissement**

Dans `src/ui/overlay.ts`, dans la boucle des cases, ajouter une croix discrète sur les cases **du plateau seulement** qui refusent l'Axie en main pour une raison de type de case, pas de budget. Ça évite de barrer tout le plateau quand l'énergie manque :

```ts
      const check = canPlace(world, drag.axieId, [col, row], movingUid)
      if (check.ok) {
        const p = cellToPx(layout, col, row)
        g.beginFill(PALETTE.valid, 0.45).drawRoundedRect(p.x + 3, p.y + 3, c - 6, c - 6, c * 0.15).endFill()
      } else if (!check.reason.includes('énergie') && !check.reason.includes('occupée')) {
        const p = cellToPx(layout, col, row)
        const m = c * 0.34
        g.lineStyle(2, 0xff6b6b, 0.35)
          .moveTo(p.x + m, p.y + m).lineTo(p.x + c - m, p.y + c - m)
          .moveTo(p.x + c - m, p.y + m).lineTo(p.x + m, p.y + c - m)
          .lineStyle(0)
      }
```

- [ ] **Étape 6 : Ajouter la barre basse avec ×2 et le mute persistant**

Dans `src/main.ts`, créer la barre basse en HTML avec le bouton de lancement et le bouton ×2, tous deux étiquetés :

```ts
const bar = document.createElement('div')
bar.className = 'bar'
const launch = document.createElement('button')
launch.type = 'button'
launch.className = 'launch'
const speed = document.createElement('button')
speed.type = 'button'
speed.className = 'speed'
speed.setAttribute('aria-label', 'Doubler la vitesse')
speed.textContent = '×2'
bar.append(launch, speed)

speed.addEventListener('click', () => {
  session.speed2x = !session.speed2x
  speed.classList.toggle('is-on', session.speed2x)
  speed.setAttribute('aria-pressed', String(session.speed2x))
  session.save = { ...session.save, speed2x: session.speed2x }
  saveNow(session.save)
})

hud.muteBtn.addEventListener('click', () => {
  const muted = sfx.toggleMute()
  hud.muteBtn.textContent = muted ? '🔇' : '♪'
  hud.muteBtn.setAttribute('aria-label', muted ? 'Rétablir le son' : 'Couper le son')
  hud.muteBtn.setAttribute('aria-pressed', String(muted))
})
```

Le bouton de lancement affiche « Lancer la vague » en phase de placement et « Vague en cours » désactivé pendant la vague.

- [ ] **Étape 7 : Écrire la page « contrôles et appareils »**

Créer `src/ui/controls.ts` :

```ts
/**
 * Page « contrôles et appareils supportés ».
 * Exigée par le règlement du concours dans les livrables du round 1,
 * et par la ligne d'accessibilité « montrer les contrôles dans le jeu ».
 */
export function controlsHtml(): string {
  return `<div class="screen screen-controls">
    <header class="screen-top"><button type="button" class="ghost" data-go="title">Retour</button>
      <span>Contrôles</span></header>
    <h4>Au doigt ou à la souris</h4>
    <ul class="traits">
      <li>Glisse un Axie du bac vers une case pour le poser.</li>
      <li>Glisse-le hors du plateau pour le retirer et récupérer son énergie.</li>
      <li>Déplace un Axie posé autant que tu veux, c’est gratuit.</li>
      <li>Touche un Axie ou une chimère pour ouvrir sa fiche.</li>
      <li>Le bouton ×2 accélère la vague, le bouton note coupe le son.</li>
    </ul>
    <h4>Règles</h4>
    <ul class="traits">
      <li>Les classes de mêlée (Plante, Bête, Insecte) se posent sur le chemin et bloquent.</li>
      <li>Les classes à distance (Aquatique, Oiseau, Reptile) se posent en plaine ou sur une colline.</li>
      <li>Une colline est à l’abri, mais coûte une case de portée et coupe toutes les auras.</li>
      <li>Aucun Axie ne monte de niveau. La force vient de qui tu places et à côté de qui.</li>
      <li>Trois chimères passées et le niveau est perdu. Zéro fuite vaut trois étoiles.</li>
      <li>Les vagues sont identiques à chaque essai.</li>
    </ul>
    <h4>Appareils</h4>
    <ul class="traits">
      <li>Navigateur mobile en portrait, à partir de 360 × 640. Cible : iOS 15 et Android 10.</li>
      <li>Navigateur de bureau : le jeu s’affiche en cadre portrait centré, la souris remplace le doigt.</li>
      <li>Un seul point de contact, pas de zoom, pas de clavier.</li>
    </ul>
  </div>`
}
```

Ajouter `'controls'` au type `ScreenId` et un bouton vers cette page depuis le titre.

- [ ] **Étape 8 : Écrire `tests/a11y.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { STATUS_FR, STATUS_GLYPH } from '../src/ui/icons'
import { BALANCE } from '../src/data/load'
import { controlsHtml } from '../src/ui/controls'
import { axieCardHtml, enemyCardHtml } from '../src/ui/cards'

describe('accessibilité', () => {
  it('donne un glyphe et un nom français à chaque statut visible', () => {
    for (const id of ['wet', 'roots', 'feather', 'poison', 'bleed', 'fragile'] as const) {
      expect(STATUS_GLYPH[id], id).toBeTruthy()
      expect(STATUS_FR[id], id).toBeTruthy()
    }
  })

  it('couvre tous les statuts du fichier d’équilibrage', () => {
    const visible = Object.keys(BALANCE.statuses).filter((k) => k !== 'blocked' && k !== 'rage')
    for (const id of visible) {
      expect(STATUS_GLYPH[id as keyof typeof STATUS_GLYPH], id).toBeTruthy()
    }
  })

  it('décrit les contrôles, les règles et les appareils', () => {
    const html = controlsHtml()
    expect(html).toContain('Glisse')
    expect(html).toContain('colline')
    expect(html).toContain('portrait')
    expect(html).toContain('360')
  })

  it('étiquette les fiches sans dépendre de la couleur', () => {
    expect(axieCardHtml('buba')).toContain('Bête')
    expect(enemyCardHtml('wolf-alpha')).toContain('Meneur')
  })
})
```

- [ ] **Étape 9 : Lancer les tests et vérifier la performance**

```bash
cd axie-td && npm test && npx tsc --noEmit
```

Puis, dans le navigateur, ouvrir le niveau 7 en ×2 et regarder le compteur d'images. Attendu : 60 images par seconde avec une vingtaine de chimères à l'écran. Si ça descend sous 40, réduire dans cet ordre : la résolution du rendu à 1 au lieu de 2, le nombre de nombres flottants simultanés, puis la taille des atlas d'effets. Noter la mesure dans le rapport de tâche.

- [ ] **Étape 10 : Commiter**

```bash
cd axie-td && git add -A && git commit -m "feat: accessibilité, icônes de statut, vitesse double et page des contrôles"
```

---

## Tâche 20 : Harnais d'équilibrage

**Fichiers :**
- Créer : `tools/balance-run.mjs`, `data/formations.json`
- Test : `tests/balance.test.ts`

**Interfaces :**
- Consomme : la simulation, via `vite-node` pour lire du TypeScript depuis Node.
- Produit : `npm run balance` qui rejoue les 8 niveaux avec des formations de référence et imprime les étoiles obtenues, plus un test qui échoue si un niveau devient impossible ou trivial.

**Pourquoi cette tâche existe :** équilibrer 6 auras, 20 chimères et 8 niveaux à la main en deux semaines est impossible. Ce harnais transforme l'équilibrage en boucle de quelques secondes : on modifie `tools/gen-data.mjs`, on relance, on lit le tableau.

**Le critère de bon équilibrage, par niveau :** la formation de référence obtient **3 étoiles**, et le même niveau joué **sans rien poser** est perdu. Entre les deux, le jeu a de la marge. Un niveau gagné sans rien poser est cassé, un niveau perdu avec la formation de référence est trop dur.

- [ ] **Étape 1 : Installer `vite-node` pour exécuter le TypeScript depuis Node**

```bash
cd axie-td && npm install -D vite-node
```

Puis dans `package.json`, remplacer le script `balance` :

```json
    "balance": "vite-node tools/balance-run.ts"
```

- [ ] **Étape 2 : Écrire `data/formations.json`**

Formations de référence, une par niveau. Les index sont des positions sur le chemin pour les bloqueurs, et des cases absolues pour la plaine et les collines. À ajuster pendant l'équilibrage, c'est le but du fichier.

```json
{
  "1": [
    { "axie": "olek", "pathIndex": 6 },
    { "axie": "momo", "cell": [2, 3] },
    { "axie": "puffy", "cell": [2, 4] }
  ],
  "2": [
    { "axie": "olek", "pathIndex": 8 },
    { "axie": "pomodoro", "pathIndex": 9 },
    { "axie": "momo", "cell": [4, 2] },
    { "axie": "puffy", "cell": [4, 4] }
  ],
  "3": [
    { "axie": "olek", "pathIndex": 6 },
    { "axie": "olek", "pathIndex": 14 },
    { "axie": "momo", "cell": [2, 3] },
    { "axie": "puffy", "cell": [3, 3] },
    { "axie": "buba", "pathIndex": 10 }
  ],
  "4": [
    { "axie": "olek", "pathIndex": 8 },
    { "axie": "venoki", "cell": [2, 2] },
    { "axie": "momo", "cell": [2, 3] },
    { "axie": "puffy", "cell": [3, 3] },
    { "axie": "pomodoro", "pathIndex": 12 }
  ],
  "5": [
    { "axie": "olek", "pathIndex": 8 },
    { "axie": "pomodoro", "pathIndex": 9 },
    { "axie": "venoki", "cell": [2, 2] },
    { "axie": "buba", "pathIndex": 16 },
    { "axie": "momo", "cell": [3, 6] }
  ],
  "6": [
    { "axie": "olek", "pathIndex": 6 },
    { "axie": "venoki", "cell": [2, 3] },
    { "axie": "momo", "cell": [2, 4] },
    { "axie": "puffy", "cell": [3, 4] },
    { "axie": "pomodoro", "pathIndex": 14 }
  ],
  "7": [
    { "axie": "olek", "pathIndex": 8 },
    { "axie": "olek", "pathIndex": 20 },
    { "axie": "buba", "pathIndex": 14 },
    { "axie": "momo", "cell": [3, 2] },
    { "axie": "puffy", "cell": [3, 4] }
  ],
  "8": [
    { "axie": "olek", "pathIndex": 10 },
    { "axie": "pomodoro", "pathIndex": 11 },
    { "axie": "venoki", "cell": [2, 5] },
    { "axie": "buba", "pathIndex": 20 },
    { "axie": "momo", "cell": [4, 4] }
  ]
}
```

Un même Axie apparaît deux fois dans certaines formations : le draft en autorise cinq exemplaires distincts, donc remplacer le doublon par un autre Axie de la même classe au moment de l'équilibrage. Le harnais accepte les doublons, la partie réelle non : c'est signalé par le test de l'étape 5.

- [ ] **Étape 3 : Écrire `tools/balance-run.ts`**

```ts
/**
 * Rejoue les 8 niveaux avec les formations de référence de data/formations.json
 * et imprime le résultat. Aucun rendu, quelques secondes pour toute la campagne.
 * Usage : npm run balance          → tous les niveaux
 *         npm run balance -- 5     → le niveau 5 seulement
 */
import formations from '../data/formations.json'
import { LEVELS } from '../src/data/load'
import { runLevel, starsFor } from '../src/sim/game'
import { place } from '../src/sim/placement'
import { createWorld, currentBudget, type World } from '../src/sim/world'
import { spentEnergy } from '../src/sim/placement'

type Slot = { axie: string; pathIndex?: number; cell?: [number, number] }
const PLAN = formations as unknown as Record<string, Slot[]>

/** Pose autant de la formation que le budget de la vague le permet. */
function applyFormation(w: World, slots: Slot[]): void {
  for (const slot of slots) {
    const cell = slot.cell ?? w.level.path[slot.pathIndex ?? 0]
    place(w, slot.axie, cell as [number, number])
  }
}

function playLevel(id: number, slots: Slot[]) {
  const w = createWorld(id)
  const stars = runLevel(w, (world) => applyFormation(world, slots))
  return { stars, lives: w.lives, phase: w.phase, wave: w.waveIndex, spent: spentEnergy(w), budget: currentBudget(w) }
}

/** Le même niveau sans rien poser : il doit être perdu, sinon il est cassé. */
function playEmpty(id: number) {
  const w = createWorld(id)
  const stars = runLevel(w)
  return { stars, lives: w.lives, phase: w.phase, wave: w.waveIndex }
}

const only = process.argv[2] ? Number(process.argv[2]) : null
const levels = only ? LEVELS.filter((l) => l.id === only) : LEVELS

console.log('niv  nom                     réf   PV   vague   à vide   verdict')
let broken = 0

for (const level of levels) {
  const slots = PLAN[String(level.id)] ?? []
  const ref = playLevel(level.id, slots)
  const empty = playEmpty(level.id)

  const tooEasy = empty.phase === 'won'
  const tooHard = ref.phase !== 'won'
  const notPerfect = ref.stars < 3
  const verdict = tooEasy ? 'CASSÉ : gagné à vide'
    : tooHard ? `TROP DUR : perdu vague ${ref.wave + 1}`
    : notPerfect ? `à revoir : ${ref.stars} ★ seulement`
    : 'ok'
  if (tooEasy || tooHard) broken++

  console.log(
    `${String(level.id).padEnd(4)} ${level.name.padEnd(23)} `
    + `${ref.stars} ★  ${String(ref.lives).padStart(2)}  `
    + `${String(ref.wave).padStart(2)}/${level.waves.length}    `
    + `${empty.phase === 'won' ? 'gagné' : `perdu v${empty.wave + 1}`}   ${verdict}`,
  )
}

console.log(`\nÉtoiles de référence : ${levels.reduce((s, l) => s + playLevel(l.id, PLAN[String(l.id)] ?? []).stars, 0)} / ${levels.length * 3}`)
if (broken > 0) {
  console.error(`\n${broken} niveau(x) cassé(s).`)
  process.exit(1)
}
```

Le double appel à `playLevel` dans la dernière ligne rejoue toute la campagne pour rien. L'étape suivante le corrige.

- [ ] **Étape 4 : Corriger le double calcul**

Collecter les résultats dans un tableau pendant la boucle, puis sommer :

```ts
const results: { id: number; stars: number }[] = []
```

Ajouter `results.push({ id: level.id, stars: ref.stars })` dans la boucle, et remplacer la dernière ligne de total par :

```ts
const total = results.reduce((s, r) => s + r.stars, 0)
console.log(`\nÉtoiles de référence : ${total} / ${levels.length * 3}`)
```

- [ ] **Étape 5 : Écrire `tests/balance.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import formations from '../data/formations.json'
import { BALANCE, LEVELS } from '../src/data/load'
import { runLevel } from '../src/sim/game'
import { place, spentEnergy } from '../src/sim/placement'
import { createWorld, type World } from '../src/sim/world'

type Slot = { axie: string; pathIndex?: number; cell?: [number, number] }
const PLAN = formations as unknown as Record<string, Slot[]>

function apply(w: World, slots: Slot[]): void {
  for (const s of slots) {
    place(w, s.axie, (s.cell ?? w.level.path[s.pathIndex ?? 0]) as [number, number])
  }
}

describe('équilibrage', () => {
  it('donne une formation de référence à chaque niveau', () => {
    for (const l of LEVELS) {
      expect(PLAN[String(l.id)], `niveau ${l.id}`).toBeDefined()
      expect(PLAN[String(l.id)].length).toBeGreaterThan(0)
    }
  })

  it('n’utilise que des Axies distincts, comme un vrai draft', () => {
    for (const l of LEVELS) {
      const ids = PLAN[String(l.id)].map((s) => s.axie)
      expect(new Set(ids).size, `niveau ${l.id} : doublon dans la formation`).toBe(ids.length)
    }
  })

  it('ne dépasse pas 5 Axies par formation', () => {
    for (const l of LEVELS) {
      expect(PLAN[String(l.id)].length, `niveau ${l.id}`).toBeLessThanOrEqual(5)
    }
  })

  it('rend chaque niveau perdant si on ne pose rien', () => {
    for (const l of LEVELS) {
      const w = createWorld(l.id)
      runLevel(w)
      expect(w.phase, `niveau ${l.id} gagné sans rien poser`).toBe('lost')
    }
  })

  it('rend chaque niveau gagnable avec sa formation de référence', () => {
    for (const l of LEVELS) {
      const w = createWorld(l.id)
      runLevel(w, (world) => apply(world, PLAN[String(l.id)]))
      expect(w.phase, `niveau ${l.id} perdu vague ${w.waveIndex + 1}`).toBe('won')
    }
  })

  it('tient la formation de référence dans le budget de la première vague', () => {
    for (const l of LEVELS) {
      const w = createWorld(l.id)
      apply(w, PLAN[String(l.id)])
      expect(spentEnergy(w), `niveau ${l.id}`).toBeLessThanOrEqual(l.waves[0].budget)
    }
  })

  it('garde la pression croissante au fil de la campagne', () => {
    const pressure = LEVELS.map((l) => {
      const last = l.waves.at(-1)!
      const hp = last.spawns.reduce((s, sp) => s + BALANCE.enemies[sp.enemy].hp, 0)
      return hp / last.budget
    })
    expect(pressure[0]).toBeLessThan(pressure[7])
    expect(pressure[7]).toBeGreaterThan(200)
  })
})
```

- [ ] **Étape 6 : Lancer le harnais et le test, puis équilibrer**

```bash
cd axie-td && npm run balance
```

Attendu : un tableau de 8 lignes. Chaque ligne doit finir par `ok` ou `à revoir`. Aucune ne doit dire `CASSÉ` ni `TROP DUR`.

```bash
cd axie-td && npx vitest run tests/balance.test.ts
```

**C'est ici que se fait le vrai travail d'équilibrage**, et il est itératif. Le test « tient dans le budget de la première vague » va probablement échouer sur plusieurs niveaux, parce qu'une formation de 5 Axies coûte plus que 3 ou 4 d'énergie. Deux corrections possibles, dans cet ordre :

1. **Rendre la formation progressive** : ne poser dans `apply` que ce que le budget permet, en s'appuyant sur `canPlace` qui refuse déjà silencieusement. C'est ce que fait `place`, qui renvoie `null`. Le test doit alors vérifier que la formation **complète** rentre dans le budget de la **dernière** vague, pas de la première. Corriger le test en ce sens.
2. **Ajuster les données** dans `tools/gen-data.mjs` : budgets, coûts, PV des chimères. Toute modification passe par le script, jamais par les JSON.

Chaque ajustement de `gen-data.mjs` demande `npm run data && npm run balance`. Consigner dans le rapport de tâche les valeurs changées et pourquoi : ce sont des décisions de design que Edouard doit pouvoir relire.

- [ ] **Étape 7 : Commiter**

```bash
cd axie-td && git add -A && git commit -m "feat: harnais d'équilibrage headless et formations de référence"
```

---

## Tâche 21 : Build, déploiement et dossier de soumission

**Fichiers :**
- Créer : `README.md`, `SUBMISSION.md`, `ASSETS.md`, `vercel.json`, `.gitignore` (racine du dépôt)
- Modifier : `package.json`

**Interfaces :**
- Consomme : le jeu terminé.
- Produit : un lien HTTPS public, un dépôt consultable, et les 19 champs du README de soumission exigés par le règlement du concours.

**Livrables du round 1, vérifiés le 03/09 sur `/rules/1.0.1` :** build jouable externe, pitch concis, dépôt consultable, vidéo de démonstration de secours, contrôles et appareils supportés, problèmes connus, adéquation Axie Core et vision produit, déclarations exactes sur l'usage de l'IA, le travail préexistant, les starters, les dépendances, les assets et les contributeurs. **Date limite : 21/09 à 20 h heure du Vietnam, soit 15 h à Paris.**

- [ ] **Étape 1 : Vérifier que le build passe et mesurer son poids**

```bash
cd axie-td && npm run build && du -sh dist && du -sh dist/assets
```

Attendu : aucune erreur TypeScript, `dist` sous 20 Mo. Si le JavaScript dépasse 1 Mo, activer le découpage manuel dans `vite.config.ts` :

```ts
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    rollupOptions: {
      output: { manualChunks: { pixi: ['pixi.js', 'pixi-spine'] } },
    },
  },
```

- [ ] **Étape 2 : Vérifier le build servi, pas seulement le mode développement**

```bash
cd axie-td && npm run preview
```

Ouvrir l'adresse indiquée dans une fenêtre de navigation privée, en portrait. Jouer le niveau 1 en entier. Attendu : aucune erreur de console, aucun chemin d'asset cassé, le son fonctionne après le premier geste. Le règlement insiste sur ce point : tester le build exporté, pas l'éditeur.

- [ ] **Étape 3 : Écrire `vercel.json`**

```json
{
  "buildCommand": "npm run assets && npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "headers": [
    {
      "source": "/(spine|vfx|sfx)/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    }
  ]
}
```

Les assets de `public/` sont versionnés depuis la tâche 1, donc `buildCommand` se réduit à `npm run build`. Corriger le fichier en ce sens : les deux kits sources ne sont pas dans le dépôt, `npm run assets` ne peut donc pas tourner sur Vercel.

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "headers": [
    {
      "source": "/(spine|vfx|sfx)/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    }
  ]
}
```

Le projet Vercel doit pointer sur le sous-dossier `axie-td/` comme racine, puisque le dépôt contient aussi `design/` et `docs/`.

- [ ] **Étape 4 : Déployer**

```bash
cd axie-td && npx vercel --prod
```

Noter l'adresse obtenue. Ouvrir le lien **déconnecté du compte Vercel**, sur un téléphone réel si possible. Attendu : le jeu se charge et se joue sans compte, sans wallet, sans extension.

- [ ] **Étape 5 : Écrire `ASSETS.md`**

```markdown
# Assets et licences

Chaque asset entré dans le projet est listé ici avec sa source et sa permission,
comme l'exige la charte du concours.

| Asset | Source | Licence / permission |
|---|---|---|
| Squelettes Spine des 19 Axies de base | `axieinfinity/unity-axie-gtk2d` | Axie Origins Battle Kit, usage autorisé pour l'Axie Vibeathon. Limité, non exclusif, révocable, non transférable. |
| Squelettes Spine des 20 chimères | `axieinfinity/unity-axie-gtk2d` | idem |
| Icônes de classe | `axieinfinity/unity-axie-gtk2d`, `Sprites/axie-class-icon` | idem |
| 21 atlas d'effets | `axieinfinity/axie-origins-asset-kit`, `web-vfx/public/vfx` | idem |
| 20 effets sonores | `axieinfinity/axie-origins-asset-kit`, `web-vfx/public/sfx` | idem |
| Runtime Spine (pixi-spine 4.0.3) | npm | Spine Runtimes License. **Licence Spine Essential détenue par Edouard Blanchard**, exigée par le §2 de la Spine Editor License. |
| PixiJS 7.2.4 | npm | MIT |
| Vite, TypeScript, Vitest, sharp, jsdom | npm | MIT / Apache-2.0 |
| Police Fredoka | Google Fonts | SIL Open Font License 1.1 |
| Tuiles de plateau, icônes d'interface | Produits pour ce projet | Originaux |

Aucun contenu interne, divulgué, partagé en privé ou protégé sans permission
n'entre dans ce dépôt. Aucune clé d'API, aucun élément de portefeuille.
```

Compléter le tableau avec les assets de décor que Edouard aura trouvés, ou retirer la dernière ligne s'il n'en a pas ajouté.

- [ ] **Étape 6 : Écrire `SUBMISSION.md` au gabarit officiel**

Les 19 champs du gabarit, dans l'ordre. Remplacer les valeurs entre chevrons par les vraies.

```markdown
# Axie Tower Defense — soumission round 1

- **Titre du jeu** : Axie Tower Defense
- **Pitch en une phrase** : Un tower defense mobile où aucun Axie ne monte de niveau : la victoire vient de qui on place et à côté de qui.
- **Interprétation d'Axie Core** : les traits et les relations. La classe et les 6 parts d'un Axie décident de ce qu'il fait sur le plateau, sans niveau ni équipement. Chaque classe projette une aura sur ses 4 voisins orthogonaux, si bien qu'un Axie seul est faible et qu'une équipe bien disposée est forte. Deux Axies de même classe côte à côte ne cumulent pas leur aura, ce qui interdit le spam mono-classe. Les ennemis sont les chimères de Lunacia. En round 2, les parts réelles des Axies du joueur, lues via l'API Sky Mavis en lecture seule, alimentent directement le système de profil, et les Axies du draft gagnent de l'AXP.
- **Build jouable** : <lien Vercel>
- **Dépôt** : <lien GitHub>
- **Vidéo de secours** : <lien>
- **Plateformes supportées** : navigateur mobile en portrait, à partir de 360 × 640, testé sur iOS <version> et Android <version>. Navigateur de bureau, cadre portrait centré.
- **Contrôles** : un seul doigt ou la souris. Glisser un Axie du bac vers une case pour le poser, hors du plateau pour le retirer, d'une case à l'autre pour le déplacer gratuitement. Toucher une unité ouvre sa fiche. Boutons de lancement de vague, de vitesse double et de coupure du son.
- **Comment démarrer** : ouvrir le lien, appuyer sur Jouer, puis sur le niveau 1. Les deux premiers niveaux prêtent une équipe et guident les premiers gestes.
- **Condition de victoire** : terminer les vagues du niveau. Zéro chimère sortie vaut trois étoiles.
- **Défaite et reprise** : trois chimères sorties et le niveau est perdu. Réessayer relance à la première vague avec le même draft. Les vagues sont identiques à chaque essai, sans aucun aléa.
- **Problèmes connus** : <à remplir honnêtement le 20/09 : par exemple, pas de musique ; les noms de six Axies de base sont des noms de travail ; le niveau 8 n'a pas de seconde phase de boss distincte ; pas de mode paysage>.
- **Moteur et version** : Vite 6, TypeScript 5.9, PixiJS 7.2.4, pixi-spine 4.0.3, Spine 3.8.79.
- **Outils d'IA utilisés de façon substantielle** : Claude Code (Anthropic) pour la conception du game design, l'architecture, l'écriture du code et des tests, sous direction humaine à chaque étape.
- **Composants générés** : la totalité du code TypeScript et les fichiers de données de `data/` ont été écrits avec l'assistance de Claude Code. Les règles de jeu, l'équilibrage et toutes les décisions de design ont été arrêtés par Edouard Blanchard et sont consignés dans `design/GDD.md`.
- **Travail préexistant et starters** : aucun fork. Le runtime web part de `axie-origins-asset-kit/web-vfx` de Sky Mavis, dont sont repris le principe de lecture des atlas d'effets en fusion additive et la configuration Vite.
- **Sources d'assets et mentions requises** : voir `ASSETS.md`.
- **Dépendances** : pixi.js, pixi-spine en production. Vite, TypeScript, Vitest, jsdom, sharp, vite-node en développement.
- **Contact** : <adresse>
```

- [ ] **Étape 7 : Écrire `README.md` à la racine de `axie-td/`**

Court et utile à un relecteur : le pitch, la commande pour lancer, la carte des dossiers, la commande de test, la commande d'équilibrage, et un renvoi vers `design/GDD.md` et `SUBMISSION.md`.

- [ ] **Étape 8 : Enregistrer la vidéo de démonstration**

Capturer 2 minutes montrant la boucle complète : titre, carte, fiche de niveau, draft, placement avec les surbrillances d'aura, une vague, une réaction en chaîne, une défaite, un réessai, une victoire à trois étoiles, un déblocage d'Axie. Le règlement veut une vidéo qui montre la boucle jouable entière, pas une bande-annonce.

- [ ] **Étape 9 : Passer la liste de contrôle finale du règlement**

Vérifier chaque point et noter le résultat :

```
[ ] Un nouveau joueur démarre sans aide.
[ ] Objectif et contrôles visibles dans le jeu.
[ ] Action, défi, victoire, défaite et reprise fonctionnent.
[ ] Le lien Axie Core est explicite et se voit en jouant.
[ ] Chargement, interface, son et retours fonctionnent.
[ ] Bases d'accessibilité couvertes : contraste, pas de couleur seule, mute, pas de clignotement excessif.
[ ] Le build exporté fonctionne sur chaque plateforme annoncée.
[ ] Le lien HTTPS public s'ouvre en navigation privée, sans compte.
[ ] Le dépôt et les instructions sont consultables.
[ ] La vidéo montre la boucle complète.
[ ] Outils d'IA, composants générés, dépendances et assets déclarés.
[ ] Mentions et attributions préservées.
[ ] Problèmes connus décrits honnêtement.
[ ] Le lien soumis pointe vers la version exactement testée.
[ ] Plus aucune fonctionnalité ajoutée, dernier test sur appareil propre effectué.
```

- [ ] **Étape 10 : Commiter et étiqueter**

```bash
cd axie-td && git add -A && git commit -m "chore: dossier de soumission, licences et déploiement" && git tag round1
```

---

## Auto-relecture du plan

Relecture effectuée après rédaction, contre `design/GDD.md`.

**Couverture du GDD, section par section :**

| Section du GDD | Tâche qui la couvre |
|---|---|
| §3 boucle de jeu, phases, retry | 10, 17 |
| §4 plateau, chemin, plaine, colline | 3, 11 |
| §5.1 les 6 classes et leurs stats | 2, 5, 10 |
| §5.2 triangle de classes | 5 |
| §5.3 anti-empilement | 7 |
| §6.1 les 8 statuts | 6 |
| §6.2 les 4 réactions en chaîne | 8 |
| §6.3 combos cibles | 20, par les formations de référence |
| §7.1 les 20 chimères | 2, 9 |
| §7.2 règles d'attaque, KO | 4, 9 |
| §7.3 armure | 5 |
| §8 énergie, coûts, budgets, PV, étoiles | 10, 16 |
| §9 collection, parts, profils, draft | 2, 15, 16, 17 |
| §10 les 8 niveaux, format de fichier | déjà produit, validé en 2 et 20 |
| §11 UX mobile, gestes, écrans | 11, 13, 15, 17 |
| §12 onboarding | 18 |
| §13 feedbacks visuels | 14, 19 |
| §14 audio | 14 |
| §15 sauvegarde | 16 |
| §16 architecture, modules, performance | 1, 10, 19 |
| §17 périmètre v1 | tout le plan |
| §18 planning | correspondance ci-dessous |
| §19 risques | 1, 12, 19, 20 |
| §20 direction artistique | 11, 14, 19 |
| §21 fichiers de données | déjà produit |

**Deux écarts assumés, à signaler à Edouard :**

1. **Le mode ×2 et la fiche au tap pendant une vague** sont dans le GDD §11.4. Le tap pendant la vague pour ouvrir une fiche n'a pas de tâche dédiée : il se câble en trois lignes dans la tâche 17, avec l'overlay de fiche de la tâche 15. Si ça se révèle plus long, c'est la première chose à couper.
2. **`vfx-map.json` référence `bug_smash_attack`** pour l'Éclatement, or ce son existe bien dans le kit. En revanche il n'existe pas de son dédié pour un ennemi qui sort : `hex` a été choisi par défaut. À réécouter pendant la tâche 14.

**Correspondance avec le planning du GDD §18 :**

| Dates | Tâches | Jalon |
|---|---|---|
| 04 → 05/09 | 1, 2 | Projet qui démarre, données validées, licence Spine achetée |
| 05 → 07/09 | 3, 4, 5 | Un slime traverse un niveau, un Axie le tue |
| 08 → 10/09 | 6, 7, 8, 9 | Les 6 classes, les auras, les réactions, les chimères |
| 10 → 11/09 | 10 | **Jeu entièrement jouable sans rendu** |
| 11 → 12/09 | 11, 12, 13 | Plateau, Spine, glisser-déposer |
| 13 → 14/09 | 14, 15, 16 | Effets, fiches, sauvegarde |
| 15 → 16/09 | 17, 18 | Campagne complète et onboarding |
| 17 → 18/09 | 19, 20 | Accessibilité et équilibrage |
| 19 → 20/09 | 21 | Déploiement et dossier de soumission |
| 21/09 | — | Marge, soumission avant 15 h à Paris |

**Règle de coupe**, si le 16/09 les tâches 17 et 18 ne sont pas terminées : livrer 6 niveaux avec le boss au niveau 6 plutôt que 8 niveaux bancals, comme prévu au GDD §18. Retirer les niveaux 7 et 8 de `data/levels/` et ajuster `MAX_STARS`, rien d'autre à toucher.

---

## Annexe : index des signatures

Chaque tâche s'exécute sans voir les autres. Cet index donne les noms et les types exacts que les tâches se passent entre elles. **En cas de doute sur un nom, c'est cette table qui tranche**, pas la mémoire.

### `src/data/load.ts` (tâche 2)

```ts
BALANCE: Balance
AXIES: AxieDef[]            // les 20, Dusk inclus
PLAYABLE: AxieDef[]         // les 19 jouables en v1
LEVELS: LevelDef[]          // les 8, dans l'ordre
MAX_STARS: number           // 24
axieDef(id: string): AxieDef
levelDef(id: number): LevelDef
```

### `src/sim/grid.ts` (tâche 3)

```ts
type Vec = { x: number; y: number }
type CellKind = 'path' | 'plain' | 'hill'
center(cell: Cell): Vec                     // (col + 0.5, row + 0.5)
dist(a: Vec, b: Vec): number
sameCell(a: Cell, b: Cell): boolean
isOrthAdjacent(a: Cell, b: Cell): boolean   // faux si a === b
orthNeighbors(cell: Cell, cols: number, rows: number): Cell[]
class Board {
  constructor(level: LevelDef, cols?: number, rows?: number)
  readonly path: Cell[]
  readonly length: number
  kindAt(cell: Cell): CellKind | null        // null hors grille
  pathIndexOf(cell: Cell): number            // -1 hors chemin
  posAt(d: number): Vec                      // borné aux extrémités
  cellAt(d: number): Cell
}
```

### `src/sim/types.ts` (tâche 4)

```ts
DT = 1 / 30
type StatusInstance = { id: StatusId; remaining: number; tickMult: number; dps: number }
type EffectiveStats = { damage: number; rate: number; range: number; fury: number; tide: boolean; swarm: number }
type AxieUnit = {
  uid, axieId, cls, line, cell, kind, pathIndex, cost,
  maxHp, hp, baseDamage, baseRate, baseRange, cooldown, rageStacks, ko, eff
}
type EnemyUnit = {
  uid, type, def, cls, tier, maxHp, hp, d, statuses,
  shootCd, aoeCd, enraged, blockedBy, alive
}
type SimEvent =
  | { k: 'attack'; from: number; to: number; cls: ClassId }
  | { k: 'damage'; uid: number; amount: number; kind: 'normal'|'crit'|'poison'|'bleed' }
  | { k: 'status'; uid: number; id: StatusId }
  | { k: 'reaction'; id: 'ricochet'|'rooting'|'shatter'|'burst'; uid: number }
  | { k: 'enemyAttack'; uid: number; target: number }
  | { k: 'death'; uid: number } | { k: 'ko'; uid: number }
  | { k: 'leak'; uid: number; damage: number }
  | { k: 'waveEnd' } | { k: 'levelEnd'; stars: number }
type Phase = 'placement' | 'wave' | 'won' | 'lost'
```

### `src/sim/world.ts` et `spawn.ts` (tâche 4)

```ts
type World = {
  level, board, t, waveIndex, lives, axies, enemies, pending, events, nextUid, phase
}
createWorld(levelId: number): World
currentBudget(w: World): number
startWave(w: World): void
makeEnemy(w: World, type: string, d?: number): EnemyUnit   // def est une COPIE par instance
spawnDue(w: World): void
```

### `src/sim/movement.ts` (tâche 4)

```ts
effectiveSpeed(w: World, e: EnemyUnit): number
blockLimits(w: World): Map<number, number>   // uid → progression maximale
moveEnemies(w: World): void
```

### `src/sim/targeting.ts` et `combat.ts` (tâche 5)

```ts
pickTarget(w: World, a: AxieUnit): EnemyUnit | null
pickAxieTarget(w: World, e: EnemyUnit, range: number, hitsHill: boolean): AxieUnit | null
enemiesInRadius(w: World, at: Vec, radius: number, exceptUid?: number): EnemyUnit[]
triangleMult(attacker: ClassId, target: ClassId): number
effectiveArmor(e: EnemyUnit, w: World): number
type DamageOpts = { from: ClassId | null; ignoresArmor?: boolean; kind?: 'normal'|'crit'|'poison'|'bleed' }
damageEnemy(w: World, e: EnemyUnit, raw: number, opts: DamageOpts): boolean  // true si mort
damageAxie(w: World, a: AxieUnit, raw: number, from: ClassId | null): void
```

### `src/sim/status.ts` (tâche 6)

```ts
type ApplyOpts = { tickMult?: number; durationMult?: number }
hasStatus(e: EnemyUnit, id: StatusId): boolean
applyStatus(w: World, e: EnemyUnit, id: StatusId, opts?: ApplyOpts): void
refreshRoots(w: World): void
tickStatuses(w: World): void
```

### `src/sim/auras.ts` (tâche 7)

```ts
auraSources(w: World, a: AxieUnit): AxieUnit[]   // un par classe, trié par uid
recomputeAuras(w: World): void
```

### `src/sim/reactions.ts` et `axieActions.ts` (tâche 8)

```ts
ricochet(w: World, a: AxieUnit, target: EnemyUnit, baseDamage: number): void
burst(w: World, target: EnemyUnit): void
ROOTING_MULT: number
SHATTER_MULT: number
axieAttack(w: World, a: AxieUnit, target: EnemyUnit): void
axieActions(w: World): void
```

### `src/sim/enemies.ts` (tâche 9)

```ts
enemyActions(w: World): void
resolveDeaths(w: World): void
```

### `src/sim/placement.ts` et `game.ts` (tâche 10)

```ts
type PlaceCheck = { ok: true } | { ok: false; reason: string }
spentEnergy(w: World): number
canPlace(w: World, axieId: string, cell: Cell, movingUid?: number): PlaceCheck
place(w: World, axieId: string, cell: Cell): AxieUnit | null
move(w: World, uid: number, cell: Cell): boolean
remove(w: World, uid: number): boolean
trimToBudget(w: World): void
starsFor(lives: number): number
step(w: World): void
runWave(w: World, maxSeconds?: number): void
runLevel(w: World, onPlacement?: (w: World) => void): number
```

### `src/render/layout.ts` (tâche 11)

```ts
HUD_H = 48 · TRAY_H = 96 · BAR_H = 64 · CHROME_H = 208 · COLS = 7 · ROWS = 10
type Layout = { cell, boardX, boardY, boardW, boardH, hudH, trayH, barH, width, height }
computeLayout(width: number, height: number): Layout
cellToPx(layout: Layout, col: number, row: number): { x: number; y: number }
unitToPx(layout: Layout, x: number, y: number): { x: number; y: number }
pxToCell(layout: Layout, px: number, py: number): [number, number] | null
```

### `src/render/*` (tâches 11, 12, 14)

```ts
PALETTE                                            // app.ts
class GameApp { app, boardLayer, overlayLayer, unitLayer, fxLayer, layout, onResize, sortUnits }
drawBoard(target: Container, board: Board, layout: Layout): void
loadSkeletons(ids: { axies: string[]; enemies: string[] }): Promise<void>
makeSpine(key: string): Spine                      // 'axie:buba' ou 'enemy:wolf-gray'
playAnim(spine: Spine, name: string, loop: boolean, fallbacks?: string[]): void
ANIM                                               // vfx-map.json typé
class WorldView { constructor(game: GameApp); sync(world: World): void; clear(): void }
loadVfx(ids: string[]): Promise<void>
playVfx(layer: Container, id: string, x: number, y: number, scale?: number): void
spawnFloat(layer: Container, value: number, x: number, y: number, kind?: string): void
tickFloats(dt: number): void
type EffectCtx = { fx: Container; layout: Layout; sfx: Sfx; onLeak: () => void }
consumeEvents(world: World, ctx: EffectCtx): void  // vide world.events
```

### `src/ui/*` (tâches 13, 15, 17, 18, 19)

```ts
nearestValidCell(w, axieId, px, py, layout, movingUid?): Cell | null
type DragState = { kind: 'none' } | { kind: 'fromTray'; axieId; px; py; cell } | { kind: 'fromBoard'; uid; axieId; px; py; cell }
class DragDrop { state; attach(el); detach(el); startFromTray(axieId, px, py) }
drawOverlay(target: Container, world: World, layout: Layout, drag: DragState): void
class Hud { el; muteBtn; mount(parent); update(w: World) }
class Tray { el; mount(parent); onPick(cb); update(w: World, draft: string[]) }
CLASS_FR: Record<string, string>
axieCardHtml(axieId: string): string
enemyCardHtml(type: string): string
class CardOverlay { el; mount(parent); showAxie(id); showEnemy(type); hide() }
type ScreenId = 'title'|'map'|'brief'|'draft'|'play'|'result'|'defeat'|'collection'|'controls'
class Router { current; onEnter(id, cb); go(id, params?); back(): ScreenId }
titleHtml · mapHtml · briefHtml · draftHtml · resultHtml · defeatHtml · collectionHtml · controlsHtml
pathThumb(level: LevelDef): string
type Hint = { id; level; wave; text; anchor; done: (w: World) => boolean }
hintsFor(levelId: number, waveIndex: number): Hint[]
class Onboarding { el; mount(parent); reset(); update(w: World) }
CLASS_ICON: Record<string, string>        // données URI, généré
STATUS_GLYPH · STATUS_FR: Record<StatusId, string>
injectIconStyles(): void
```

### `src/game/session.ts` (tâche 17) et `src/save/storage.ts` (tâche 16)

```ts
class Session {
  save: SaveData; world: World | null; draft: string[]; levelId: number; speed2x: boolean
  suggestedDraft(levelId: number): string[]
  announcedEnemies(levelId: number): string[]
  announcedClass(type: string): string
  begin(levelId: number, draft: string[]): void
  retry(): void
  launchWave(): void
  advance(realSeconds: number): void
  finish(): number
}
type SaveData = { version: 1; stars: Record<string, number>; lastDraft: Record<string, string[]>; speed2x: boolean; mute: boolean }
emptySave(): SaveData
loadSave(): SaveData
saveNow(data: SaveData): void
recordResult(data: SaveData, levelId: number, stars: number): SaveData
rememberDraft(data: SaveData, levelId: number, draft: string[]): SaveData
totalStars(data: SaveData): number
unlockedAxies(data: SaveData): string[]
isLevelOpen(data: SaveData, levelId: number): boolean
nextUnlock(data: SaveData): { id: string; name: string; missing: number } | null
class Sfx { muted; play(id: string | string[] | null | undefined): void; toggleMute(): boolean }
```

### Pièges à ne pas retomber dedans

1. **Jamais `require`** dans `src/` : le code part dans un navigateur, Vite ne le résoudra pas.
2. **`makeEnemy` copie `def`** par instance. Ne pas revenir à une référence partagée, sinon `resolveDeaths` casse la scission de tous les slime-fusion suivants.
3. **`recomputeAuras` après chaque changement de placement**, y compris un KO et un gain de Rage. Jamais dans la boucle de tick.
4. **Lire les statuts de la cible avant de frapper** dans `axieAttack`. Une réaction qui lit un statut posé par sa propre attaque est un bug silencieux.
5. **`consumeEvents` vide `world.events`**. Si un autre consommateur lit les événements, il doit passer avant.
6. **`noUnusedLocals` est actif** : un import laissé en place fait échouer `npx tsc --noEmit`, donc `npm run build`.
7. **Les diagonales ne comptent jamais** pour l'adjacence des auras.
8. **Une colline coupe les auras dans les deux sens** et retire une case de portée.
