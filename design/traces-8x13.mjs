/**
 * Tracés des huit niveaux sur la grille 8 × 13.
 *
 * Source de vérité des plans tant qu'ils ne sont pas passés dans
 * axie-td/tools/gen-data.mjs. Les chemins sont décrits par leurs virages et
 * déroulés case par case : un tracé écrit à la main finit toujours par avoir un
 * trou ou un croisement.
 *
 * Règles vérifiées : celles du générateur (pas orthogonal, pas de doublon, pas
 * de contact avec sa propre trace, collines hors du chemin et hors de contact,
 * à portée des dryades là où il y en a), avec deux assouplissements proposés :
 * entrée et sortie sur n'importe quel bord, et la tanière au centre.
 *
 *   node design/traces-8x13.mjs          vérifie et affiche les plans
 *   node design/traces-8x13.mjs --html   réinjecte les données dans la planche
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const TD = join(HERE, '..', 'axie-td')
const COLS = 8
const ROWS = 13
/** Portée de l'Aquatique et du Reptile : le tireur le plus courant du jeu. */
const RANGE = 2.5
const ORTH = [[1, 0], [-1, 0], [0, 1], [0, -1]]

const balance = JSON.parse(readFileSync(join(TD, 'data', 'balance.json'), 'utf8'))
const oldLevel = (id) => JSON.parse(readFileSync(join(TD, 'data', 'levels', `0${id}.json`), 'utf8'))

/** Déroule une suite de virages en cases. */
function trace(...pts) {
  const cells = [pts[0]]
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]
    const [x1, y1] = pts[i]
    if (x0 !== x1 && y0 !== y1) throw new Error(`virage non orthogonal ${pts[i - 1]} -> ${pts[i]}`)
    const dx = Math.sign(x1 - x0)
    const dy = Math.sign(y1 - y0)
    let x = x0
    let y = y0
    while (x !== x1 || y !== y1) { x += dx; y += dy; cells.push([x, y]) }
  }
  return cells
}

/** Une fourche : chaque branche part de la dernière case du tronc. */
const fork = (trunk, ...branches) => branches.map((b) => trunk.concat(b.slice(1)))

const LEVELS = [
  {
    id: 1, name: 'La clairière', shape: 'Serpentin doux',
    enemies: 'Slimes',
    intent: "Deux lignes droites et une sortie au centre. Buba bloque sur la première, Momo tire depuis l'entre-deux : tout le tutoriel se lit d'un coup d'œil.",
    paths: [trace([1, 0], [1, 3], [6, 3], [6, 7], [3, 7], [3, 12])],
    hills: [], hintIndex: 6,
  },
  {
    id: 2, name: 'La lisière', shape: 'Serpentin par le côté',
    enemies: 'Slimes de la forêt',
    intent: "Trois bandes, entrée par la gauche. Les cases entre les bandes voient deux passages : c'est là qu'Olek et Pomodoro montrent leurs auras.",
    paths: [trace([0, 1], [5, 1], [5, 5], [2, 5], [2, 9], [6, 9], [6, 12])],
    hills: [],
  },
  {
    id: 3, name: 'Le sentier des loups', shape: 'Grand virage',
    enemies: 'Loups gris, loup alpha',
    intent: "La meute descend un bord et remonte l'autre, entrée et sortie sur le même bord. Trop large pour qu'un seul tireur couvre les deux jambes, sauf l'Oiseau posé au milieu. La colline domine le virage du bas.",
    paths: [trace([1, 0], [1, 10], [6, 10], [6, 0])],
    hills: [[3, 8]],
  },
  {
    id: 4, name: 'Le marais', shape: 'La langue',
    enemies: 'Slimes du marais, loups aquatiques',
    intent: "Le chemin s'enfonce dans le marais et revient en longeant sa propre trace. La colonne entre les deux jambes voit les deux passages à une case : c'est la digue.",
    paths: [trace([0, 1], [3, 1], [3, 11], [5, 11], [5, 5], [7, 5])],
    hills: [[7, 8]],
  },
  {
    id: 5, name: 'Le bosquet', shape: "L'escalier",
    enemies: 'Tréants, slimes',
    intent: "Une descente en marches jusqu'à la pointe, puis le retour. Chaque marche est un coin où bloquer, la pointe touche trois cases de chemin. Les tréants sont lents : l'escalier les garde longtemps à portée. La colline tient le cœur de la pointe.",
    paths: [trace([0, 0], [2, 0], [2, 2], [4, 2], [4, 4], [6, 4], [6, 6], [4, 6], [4, 8], [2, 8], [2, 10], [0, 10], [0, 12])],
    hills: [[3, 5]],
  },
  {
    id: 6, name: 'Le cercle des dryades', shape: "L'anneau",
    enemies: 'Dryades, slimes soigneurs',
    intent: "Les chimères font trois quarts de tour autour des deux collines. Au centre, un tireur voit deux côtés et l'Oiseau les quatre, mais c'est exactement là que tirent les dryades.",
    paths: [trace([3, 0], [3, 5], [6, 5], [6, 10], [1, 10], [1, 6], [0, 6])],
    hills: [[3, 7], [4, 7]],
  },
  {
    id: 7, name: 'La meute', shape: 'La fourche',
    enemies: 'La meute, loup-garou, tréants',
    intent: "La meute se sépare en deux branches et deux sorties, qui se rapprochent en bas. Bloquer avant la fourche arrête tout, mais un seul bloqueur prend alors la meute entière.",
    paths: fork(
      trace([1, 0], [1, 2], [4, 2], [4, 3]),
      trace([4, 3], [4, 4], [1, 4], [1, 8], [3, 8], [3, 12]),
      trace([4, 3], [6, 3], [6, 8], [5, 8], [5, 12]),
    ),
    hills: [[3, 6], [4, 6]],
    fallback: 'Sans le code de la fourche, le niveau se joue sur le tronc et la branche gauche seuls.',
  },
  {
    id: 8, name: 'La tanière', shape: 'La spirale',
    enemies: 'Tout le bestiaire, les deux ours',
    intent: "Un tour et demi vers l'antre des ours, au centre. Tout l'intérieur voit deux ou trois passages : les meilleurs postes du jeu, face aux boss.",
    paths: [trace([1, 0], [1, 11], [6, 11], [6, 1], [3, 1], [3, 7])],
    hills: [[4, 9], [7, 0]],
    den: true,
  },
]

// ------------------------------------------------------------------ outils
const key = ([c, r]) => `${c},${r}`
const onEdge = ([c, r], cols, rows) => c === 0 || r === 0 || c === cols - 1 || r === rows - 1

/** Distance continue entre une case et le chemin, comme le générateur. */
function distToPath(path, [hc, hr]) {
  let best = Infinity
  for (let d = 0; d <= path.length - 1; d += 0.05) {
    const i = Math.min(Math.floor(d), path.length - 1)
    const t = d - i
    const a = path[i]
    const b = path[Math.min(i + 1, path.length - 1)]
    const x = a[0] + 0.5 + (b[0] - a[0]) * t
    const y = a[1] + 0.5 + (b[1] - a[1]) * t
    best = Math.min(best, Math.hypot(x - (hc + 0.5), y - (hr + 0.5)))
  }
  return best
}

/** Portée d'attaque des chimères du niveau contre une colline, 0 si aucune. */
function hillReach(level) {
  const types = new Set(level.waves.flatMap((w) => w.spawns.map((s) => s.enemy)))
  return Math.max(0, ...[...types].map((t) => {
    const e = balance.enemies[t]
    return Math.max(e?.ranged?.hits_hill ? e.ranged.range : 0, e?.aoe?.hits_hill ? e.aoe.radius : 0)
  }))
}

function turns(p) {
  let t = 0
  for (let i = 2; i < p.length; i++) {
    const a = [p[i - 1][0] - p[i - 2][0], p[i - 1][1] - p[i - 2][1]]
    const b = [p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]]
    if (a[0] !== b[0] || a[1] !== b[1]) t++
  }
  return t
}

/**
 * Pour chaque case hors chemin : nombre de cases de chemin à portée 2,5, de
 * centre à centre. `null` sur le chemin. C'est ce qu'un tireur posé là voit.
 */
function heatOf(paths, cols, rows) {
  const cells = [...new Map(paths.flat().map((c) => [key(c), c])).values()]
  const set = new Set(cells.map(key))
  const heat = []
  for (let r = 0; r < rows; r++) {
    const row = []
    for (let c = 0; c < cols; c++) {
      if (set.has(key([c, r]))) { row.push(null); continue }
      row.push(cells.filter(([pc, pr]) => Math.hypot(pc - c, pr - r) <= RANGE + 1e-9).length)
    }
    heat.push(row)
  }
  return { heat, unique: cells.length }
}

// --------------------------------------------------------------- validation
const errors = []
const out = []
for (const L of LEVELS) {
  const err = (m) => errors.push(`L${L.id} ${L.name} : ${m}`)
  const all = new Set()
  for (const p of L.paths) {
    const set = new Set(p.map(key))
    if (set.size !== p.length) err('case de chemin en double')
    p.forEach((cell, i) => {
      all.add(key(cell))
      const [c, r] = cell
      if (c < 0 || c >= COLS || r < 0 || r >= ROWS) err(`hors grille ${cell}`)
      if (i > 0) {
        const [pc, pr] = p[i - 1]
        if (Math.abs(pc - c) + Math.abs(pr - r) !== 1) err(`pas non orthogonal ${p[i - 1]} -> ${cell}`)
      }
      for (const [dc, dr] of ORTH) {
        const k = key([c + dc, r + dr])
        if (!set.has(k)) continue
        const j = p.findIndex((q) => key(q) === k)
        if (Math.abs(j - i) !== 1) err(`le chemin touche sa propre trace en ${cell} / ${k}`)
      }
    })
    if (!onEdge(p[0], COLS, ROWS)) err(`entrée ${p[0]} hors du bord`)
    if (!onEdge(p.at(-1), COLS, ROWS) && !L.den) err(`sortie ${p.at(-1)} hors du bord`)
  }
  if (L.hills.length > balance.cells.hill.max_per_level) err('trop de collines')
  const old = oldLevel(L.id)
  const reach = hillReach(old)
  const hills = L.hills.map((h) => {
    if (all.has(key(h))) err(`colline sur le chemin ${h}`)
    for (const [dc, dr] of ORTH) if (all.has(key([h[0] + dc, h[1] + dr]))) err(`colline au contact du chemin ${h}`)
    const d = Math.min(...L.paths.map((p) => distToPath(p, h)))
    if (reach > 0 && d > reach) err(`colline ${h} hors de portée des dryades : ${d.toFixed(2)} > ${reach}`)
    return { cell: h, dist: +d.toFixed(2) }
  })

  const { heat, unique } = heatOf(L.paths, COLS, ROWS)
  const plains = heat.flat().filter((v) => v !== null).length - L.hills.length
  const best = Math.max(...heat.flat().filter((v) => v !== null))
  const oldHeat = heatOf([old.path], 7, 10)
  out.push({
    id: L.id, name: L.name, shape: L.shape, intent: L.intent, enemies: L.enemies,
    fallback: L.fallback ?? null, den: !!L.den,
    paths: L.paths, hills: L.hills, hillReach: reach, hillDist: hills.map((h) => h.dist),
    hint: L.hintIndex != null ? L.paths[0][L.hintIndex] : null,
    length: unique, routes: L.paths.map((p) => p.length), turns: Math.max(...L.paths.map(turns)),
    plains, best, heat,
    old: {
      path: old.path, hills: old.hills, heat: oldHeat.heat, length: old.path.length,
      turns: turns(old.path), best: Math.max(...oldHeat.heat.flat().filter((v) => v !== null)),
    },
  })
}

// ------------------------------------------------------------------ rendu
const glyph = (v) => (v === 0 ? ' ' : v <= 3 ? '.' : v <= 6 ? ':' : v <= 9 ? 'o' : 'O')
for (const L of out) {
  const g = L.heat.map((row) => row.map((v) => (v === null ? '#' : glyph(v))))
  for (const p of L.paths) { g[p[0][1]][p[0][0]] = 'E'; g[p.at(-1)[1]][p.at(-1)[0]] = 'S' }
  if (L.paths.length > 1) {
    const j = L.paths[0].findIndex((c, i) => key(c) !== key(L.paths[1][i])) - 1
    const f = L.paths[0][j]
    g[f[1]][f[0]] = '+'
  }
  for (const [c, r] of L.hills) g[r][c] = '^'
  if (L.hint) g[L.hint[1]][L.hint[0]] = 'b'
  const routes = L.routes.length > 1 ? ` (branches ${L.routes.join(' / ')})` : ''
  console.log(`\nL${L.id} ${L.name} - ${L.shape} | ${L.length} cases${routes} | ${L.turns} virages | meilleur poste ${L.best} | avant ${L.old.length} cases, meilleur ${L.old.best}`)
  console.log(g.map((row) => '   ' + row.join(' ')).join('\n'))
}
console.log('\nLegende : # chemin, E entree, S sortie, + fourche, ^ colline, b case de Buba')
console.log(`Chaleur : cases de chemin a portee ${RANGE}. vide 0, . 1-3, : 4-6, o 7-9, O 10+`)

if (errors.length) { console.error('\n' + errors.join('\n')); process.exit(1) }
console.log('\nAucune erreur.')

if (process.argv.includes('--html')) {
  const file = join(HERE, 'traces-8x13.html')
  if (!existsSync(file)) { console.error('planche absente : ' + file); process.exit(1) }
  const html = readFileSync(file, 'utf8')
  const open = '<script id="traces-data" type="application/json">'
  const a = html.indexOf(open)
  const b = html.indexOf('</script>', a)
  if (a < 0 || b < 0) { console.error('marqueur de données introuvable dans la planche'); process.exit(1) }
  const data = { cols: COLS, rows: ROWS, range: RANGE, levels: out }
  writeFileSync(file, html.slice(0, a + open.length) + JSON.stringify(data) + html.slice(b))
  console.log('Données réinjectées dans ' + file)
}
