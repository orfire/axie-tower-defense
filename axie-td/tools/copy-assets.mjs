// Copie les assets nécessaires depuis les kits officiels vers public/.
// Les PNG deviennent des WebP et les fichiers .atlas.txt sont réécrits en .atlas.
// Usage : node tools/copy-assets.mjs
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
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

// --- vérifications préalables ---
// Tout ce qui peut manquer est vérifié AVANT d'effacer quoi que ce soit.
// public/ est versionné : un échec en cours de route laisserait le dépôt
// avec un arbre d'assets à moitié reconstruit et un manifeste périmé.
try {
  execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' })
} catch {
  throw new Error("ffmpeg est introuvable dans le PATH. Il est nécessaire pour convertir les effets sonores.")
}
for (const { src } of spineDirs) {
  if (!existsSync(src)) throw new Error(`Source Spine absente : ${src}`)
}
for (const id of vfxNeeded) {
  if (!existsSync(join(WEBVFX, 'vfx', id, 'clip.json'))) throw new Error(`Clip VFX absent : ${id}`)
}
for (const id of sfxNeeded) {
  if (!existsSync(join(WEBVFX, 'sfx', `${id}.wav`))) throw new Error(`Son absent : ${id}`)
}

rmSync(join(PUB, 'spine'), { recursive: true, force: true })
rmSync(join(PUB, 'vfx'), { recursive: true, force: true })
rmSync(join(PUB, 'sfx'), { recursive: true, force: true })

for (const { src, out } of spineDirs) {
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
  // JSON minifié : le kit livre de l'indenté, ça n'enlève que de l'espacement.
  const skeleton = JSON.parse(readFileSync(join(src, jsonName), 'utf8'))
  writeFileSync(join(out, 'skeleton.json'), JSON.stringify(skeleton))
  // replaceAll : un atlas multi-pages référencerait la même image plusieurs fois.
  writeFileSync(join(out, 'skeleton.atlas'), atlasText.replaceAll(pngName, 'skeleton.webp'))
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

// Audio : des effets courts, en PCM non compressé dans le kit. Le MP3 mono à 96 kb/s
// suffit et se lit partout, y compris sur Safari qui gère mal l'OGG.
mkdirSync(join(PUB, 'sfx'), { recursive: true })
for (const id of sfxNeeded) {
  const out = join(PUB, 'sfx', `${id}.mp3`)
  execFileSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-i', join(WEBVFX, 'sfx', `${id}.wav`),
    '-ac', '1', '-ar', '44100', '-b:a', '96k', out,
  ])
  bytes += size(out)
}

writeFileSync(join(PUB, 'assets-manifest.json'), JSON.stringify({
  spine: spineDirs.length, vfx: vfxNeeded, sfx: sfxNeeded, bytes,
}, null, 2))

// Détail par catégorie : une régression de poids doit se voir tout de suite.
const mb = (n) => (n / 1024 / 1024).toFixed(2)
const sum = (pattern) => spineDirs.reduce((s, d) => s + size(join(d.out, pattern)), 0)
console.log(`Spine ${spineDirs.length} · VFX ${vfxNeeded.length} · SFX ${sfxNeeded.length}`)
console.log(`  squelettes JSON ${mb(sum('skeleton.json'))} Mo · images ${mb(sum('skeleton.webp'))} Mo`)
console.log(`  total ${mb(bytes)} Mo`)

// Plafond d'hygiène du dépôt. Ce n'est pas ce que le joueur télécharge :
// le serveur compresse, et les assets sont chargés par niveau.
if (bytes > 25 * 1024 * 1024) {
  console.error(`Budget d'assets dépassé : ${mb(bytes)} Mo > 25 Mo`)
  process.exit(1)
}
