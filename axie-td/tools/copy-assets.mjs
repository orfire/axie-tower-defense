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
  await sharp(srcPng).webp({ quality: 80, effort: 5 }).toFile(outWebp)
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
