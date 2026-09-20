// Génère et valide les fichiers de données du GDD v1.0.
// Usage : node tools/gen-data.mjs   (depuis axie-td/)
// Source de vérité des règles : design/GDD.md. Ce script ne fait que les encoder.
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'data')
mkdirSync(join(OUT, 'levels'), { recursive: true })

// ---------------------------------------------------------------- balance
const balance = {
  version: '1.0',
  gdd: 'design/GDD.md v1.0',
  sim: { tick_hz: 30, no_randomness: true },
  grid: { cols: 7, rows: 10 },
  level: { lives: 3, leak_damage: { normal: 1, miniboss: 2, boss: 3 }, stars_by_lives: { 3: 3, 2: 2, 1: 1, 0: 0 } },
  adjacency: 'orthogonal',
  triangle: {
    advantage: 1.15,
    disadvantage: 0.85,
    beats: {
      beast: ['plant', 'reptile'], bug: ['plant', 'reptile'],
      plant: ['aquatic', 'bird'], reptile: ['aquatic', 'bird'],
      aquatic: ['beast', 'bug'], bird: ['beast', 'bug'],
    },
  },
  targeting: { default: 'most_advanced_in_range', priority_status: 'feather' },
  cells: {
    path: { allowed_lines: ['melee'], blocks: true },
    plain: { allowed_lines: ['melee', 'ranged'] },
    hill: { allowed_lines: ['ranged'], range_penalty: 1, auras: false, max_per_level: 2, hit_only_by: ['dryad-ranger', 'dryad-mage'] },
  },
  classes: {
    beast:   { line: 'melee',  cost: 3, hp: 120, damage: 40, rate: 0.6, range: 1.5, attack_vfx: 'beast_smash',        on_hit_status: null,   self_status: 'rage',   aura: 'fury' },
    aquatic: { line: 'ranged', cost: 1, hp: 60,  damage: 7,  rate: 1.2, range: 2.5, attack_vfx: 'aquatic_projectile', on_hit_status: 'wet',  self_status: null,     aura: 'tide' },
    plant:   { line: 'melee',  cost: 2, hp: 200, damage: 12, rate: 0.8, range: 1.0, attack_vfx: 'plant_gore',         on_hit_status: null,   self_status: null,     aura: 'roots' },
    bird:    { line: 'ranged', cost: 1, hp: 50,  damage: 4,  rate: 2.0, range: 3.5, attack_vfx: 'bird_projectile',    on_hit_status: 'feather', self_status: null,  aura: 'wind' },
    bug:     { line: 'melee',  cost: 2, hp: 80,  damage: 6,  rate: 1.0, range: 1.5, attack_vfx: 'bug_bite',           on_hit_status: 'poison', self_status: null,   aura: 'swarm', ignores_armor: true },
    reptile: { line: 'ranged', cost: 2, hp: 90,  damage: 15, rate: 0.8, range: 2.5, attack_vfx: 'reptile_cast',       on_hit_status: 'fragile', self_status: null,  aura: 'scales' },
  },
  auras: {
    fury:   { class: 'beast',   target: 'allies',  effect: 'damage_mult_vs_low_hp', value: 1.30, hp_threshold: 0.5 },
    tide:   { class: 'aquatic', target: 'allies',  effect: 'apply_status_on_hit', status: 'wet' },
    roots:  { class: 'plant',   target: 'enemies', effect: 'speed_mult', value: 0.60 },
    wind:   { class: 'bird',    target: 'allies',  effect: 'range_add', value: 1 },
    swarm:  { class: 'bug',     target: 'allies',  effect: 'dot_tick_mult', value: 2 },
    scales: { class: 'reptile', target: 'enemies', effect: 'armor_add', value: -15 },
    anti_stack: 'same_class_neighbors_give_one_instance_strongest',
  },
  statuses: {
    wet:     { duration: 4,   effect: 'damage_taken_mult', value: 1.20, vfx: 'bubble', icon: 'bubble' },
    roots:   { duration: null, effect: 'speed_mult', value: 0.60, vfx: 'leaf', icon: 'leaf', note: 'while on a cell adjacent to a plant' },
    blocked: { duration: null, effect: 'stop_and_attack_blocker', vfx: 'taunt', note: 'while the blocker stands' },
    feather: { duration: 3,   effect: 'priority_target', vfx: 'feather', icon: 'feather' },
    poison:  { duration: 4,   effect: 'dot', dps: 4, ignores_armor: true, refresh_on_reapply: true, vfx: 'poison_apply', icon: 'poison' },
    bleed:   { duration: 3,   effect: 'dot', dps: 6, applied_when: 'bug_hits_poisoned_target', vfx: 'bleed_apply', icon: 'bleed' },
    fragile: { duration: 5,   effect: 'armor_mult', value: 0.5, vfx: 'fragile', icon: 'fragile' },
    rage:    { duration: 'wave', effect: 'rate_mult_per_stack', value: 1.10, max_stacks: 5, gain_on: 'kill', vfx: 'rage', icon: 'rage' },
  },
  reactions: {
    ricochet:  { trigger: { attacker: 'bird', target_has: 'wet' },     effect: 'bounce', max_targets: 2, radius: 1.5, damage_mult: 0.5, spread_wet_if_neighbor: 'aquatic' },
    rooting:   { trigger: { attacker: 'bug', target_has: 'roots' },    effect: 'dot_duration_mult', value: 2 },
    shatter:   { trigger: { attacker: 'beast', target_has: 'fragile' }, effect: 'crit', damage_mult: 2 },
    burst:     { trigger: { attacker: 'beast', kills_target_with: 'bleed' }, effect: 'aoe', damage: 30, radius: 1 },
  },
  parts_bonus: {
    beast:   { damage: 0.06 },
    bug:     { damage: 0.03, rate: 0.03 },
    bird:    { rate: 0.06 },
    aquatic: { rate: 0.03, hp: 0.03 },
    plant:   { hp: 0.06 },
    reptile: { hp: 0.04, damage: 0.02 },
  },
  profile_rules: { min_dominant: 0.15, tie_margin: 0.03, labels: { damage: 'DPS', rate: 'Swift', hp: 'Tank', none: 'Hybrid' } },
  ko: { removed_until: 'end_of_wave', returns: 'full_hp_free' },
  enemy_rules: {
    melee_stops_only_for_blocker: true,
    ranged_shoots_while_walking: true,
    plain_never_hit_by_melee: true,
    queue_one_per_cell: true,
    heal_between_waves: 'axies_full',
  },
  enemies: {
    'slime':              { class: 'plant',   hp: 40,   speed: 1.0, armor: 0,    melee_dps: 7,  tier: 'normal' },
    'slime-forest-a':     { class: 'plant',   hp: 60,   speed: 1.0, armor: 0,    melee_dps: 8,  tier: 'normal' },
    'slime-forest-b':     { class: 'plant',   hp: 30,   speed: 1.4, armor: 0,    melee_dps: 6,  tier: 'normal' },
    'slime-attack':       { class: 'aquatic', hp: 50,   speed: 1.0, armor: 0,    melee_dps: 6,  tier: 'normal', ranged: { range: 2, period: 2, damage: 10, hits_hill: false } },
    'slime-defense':      { class: 'aquatic', hp: 90,   speed: 0.8, armor: 0.30, melee_dps: 7,  tier: 'normal' },
    'slime-support':      { class: 'aquatic', hp: 50,   speed: 1.0, armor: 0,    melee_dps: 2,  tier: 'normal', heal: { radius: 1, hps: 5 } },
    'slime-fusion':       { class: 'aquatic', hp: 250,  speed: 0.7, armor: 0.10, melee_dps: 10, tier: 'miniboss', on_death_spawn: { enemy: 'slime', count: 2 } },
    'wolf-gray':          { class: 'beast',   hp: 60,   speed: 2.0, armor: 0.10, melee_dps: 8,  tier: 'normal' },
    'wolf-alpha':         { class: 'beast',   hp: 150,  speed: 1.8, armor: 0.10, melee_dps: 14, tier: 'normal', leader: { radius: 2, speed_mult: 1.2, affects: ['wolf-gray', 'wolf-aquatic', 'werewolf'] } },
    'wolf-aquatic':       { class: 'aquatic', hp: 70,   speed: 1.8, armor: 0.20, melee_dps: 8,  tier: 'normal' },
    'wolf-aquatic-alpha': { class: 'aquatic', hp: 180,  speed: 1.6, armor: 0.20, melee_dps: 14, tier: 'miniboss', leader: { radius: 2, speed_mult: 1.2, affects: ['wolf-gray', 'wolf-aquatic'] } },
    'werewolf':           { class: 'beast',   hp: 400,  speed: 1.4, armor: 0.20, melee_dps: 25, tier: 'miniboss', enrage: { hp_below: 0.5, speed_mult: 1.5, vfx: 'fury_form' } },
    'treant':             { class: 'plant',   hp: 300,  speed: 0.5, armor: 0.40, melee_dps: 10, tier: 'normal' },
    'treant-fighter':     { class: 'plant',   hp: 350,  speed: 0.6, armor: 0.40, melee_dps: 30, tier: 'miniboss', line_breaker: true },
    'treant-flowering':   { class: 'plant',   hp: 250,  speed: 0.5, armor: 0.30, melee_dps: 6,  tier: 'normal', heal: { radius: 1.5, hps: 8 } },
    'dryad-fighter':      { class: 'reptile', hp: 120,  speed: 1.2, armor: 0.20, melee_dps: 15, tier: 'normal' },
    'dryad-ranger':       { class: 'bird',    hp: 80,   speed: 1.2, armor: 0,    melee_dps: 4,  tier: 'normal', ranged: { range: 2.5, period: 1.5, damage: 12, hits_hill: true } },
    'dryad-mage':         { class: 'bird',    hp: 100,  speed: 1.0, armor: 0,    melee_dps: 4,  tier: 'normal', aoe: { radius: 1.5, period: 3, damage: 15, hits_hill: true } },
    'bear-dad':           { class: 'beast',   hp: 1200, speed: 0.7, armor: 0.30, melee_dps: 40, tier: 'boss', enrage: { hp_below: 0.5, speed_mult: 1.3, vfx: 'rage' } },
    'bear-mom':           { class: 'beast',   hp: 1000, speed: 0.8, armor: 0.20, melee_dps: 30, tier: 'boss', line_breaker: true, heal: { radius: 2, hps: 10, only: ['bear-dad'] } },
  },
}

// ------------------------------------------------------------------ axies
// Parts : eyes, ears, mouth, horn, back, tail. Les parts hors classe vont d'abord sur eyes/ears
// (mouth/horn/back/tail portent les skills dans Axie Classic, réservées pour la v2).
const SLOTS = ['eyes', 'ears', 'mouth', 'horn', 'back', 'tail']
function parts(cls, extra = []) {
  // extra : classes des parts hors-classe, placées sur eyes, ears, puis mouth...
  const p = {}
  SLOTS.forEach((s, i) => { p[s] = extra[i] ?? cls })
  return p
}
const AXIES = [
  ['buba',          'Buba',          'beast',   '19-xia-beast'.replace('19-xia-beast', '01-buba-beast'), parts('beast'), 'start'],
  ['olek',          'Olek',          'plant',   '02-olek-plant',     parts('plant'), 'start'],
  ['puffy',         'Puffy',         'aquatic', '03-puffy-aquatic',  parts('aquatic'), 'start'],
  ['momo',          'Momo',          'bird',    '12-momo-bird',      parts('bird'), 'start'],
  ['pomodoro',      'Pomodoro',      'bug',     '06-pomodoro-bug',   parts('bug'), 'start'],
  ['venoki',        'Venoki',        'reptile', '07-venoki-reptile', parts('reptile'), 'start'],
  ['xia',           'Xia',           'beast',   '19-xia-beast',      parts('beast', ['bird', 'bird']), 2],
  ['ena',           'Ena',           'plant',   '04-ena-plant',      parts('plant', ['reptile', 'reptile']), 3],
  ['dps-bird',      'Kestrel',       'bird',    '14-dps-bird',       parts('bird', ['beast', 'beast', 'beast', 'beast']), 5],
  ['noir',          'Noir',          'aquatic', '21-noir-aquatic',   parts('aquatic', ['beast', 'beast', 'beast']), 6],
  ['shilin',        'Shilin',        'bug',     '11-shilin-bug',     parts('bug', ['beast', 'beast']), 8],
  ['support-plant', 'Fennel',        'plant',   '04-support-plant',  parts('plant', ['aquatic', 'aquatic', 'bird', 'bird']), 9],
  ['machito',       'Machito',       'reptile', '08-machito-reptile', parts('reptile', ['beast', 'beast']), 11],
  ['bing',          'Bing',          'beast',   '20-bing-beast',     parts('beast', ['plant', 'plant', 'plant', 'plant']), 12],
  ['rouge',         'Rouge',         'aquatic', '22-rouge-aquatic',  parts('aquatic', ['bird', 'bird']), 14],
  ['dps-aquatic',   'Marlin',        'aquatic', '09-dps-aquatic',    parts('aquatic', ['beast', 'beast', 'beast']), 15],
  ['hybrid-plant',  'Thistle',       'plant',   '10-hybrid-plant',   parts('plant', ['beast', 'beast', 'bird', 'bird']), 17],
  ['support-beast', 'Bramble',       'beast',   '13-support-beast',  parts('beast', ['plant', 'plant', 'plant', 'plant', 'aquatic']), 18],
  ['dps-beast',     'Fang',          'beast',   '05-dps-beast',      parts('beast', ['bug']), 20],
  ['support-dusk',  'Support Dusk',  'dusk',    '15-support-dusk',   parts('dusk'), 'v2'],
]
function bonuses(p) {
  const b = { hp: 0, damage: 0, rate: 0 }
  for (const s of SLOTS) {
    const pb = balance.parts_bonus[p[s]]
    if (!pb) continue
    for (const k in pb) b[k] += pb[k]
  }
  for (const k in b) b[k] = Math.round(b[k] * 100) / 100
  return b
}
function profile(b) {
  const r = balance.profile_rules
  const sorted = Object.entries(b).sort((x, y) => y[1] - x[1])
  const [k1, v1] = sorted[0], [, v2] = sorted[1]
  if (v1 < r.min_dominant) return r.labels.none
  if (v1 - v2 <= r.tie_margin) return r.labels.none
  return r.labels[k1]
}
const axies = AXIES.map(([id, name, cls, folder, p, unlock]) => {
  const b = bonuses(p)
  return {
    id, name, class: cls,
    spine: `starter-axies/${folder}`,
    parts: p,
    bonuses: b,
    profile: cls === 'dusk' ? null : profile(b),
    unlock: unlock === 'start' ? { type: 'start' } : unlock === 'v2' ? { type: 'v2' } : { type: 'stars', stars: unlock },
    note: 'Répartition des parts : proposition GDD §9.3, à ajuster sur les sprites.',
  }
})
// Noms : les starters "dps-*", "support-*", "hybrid-*" n'ont pas de nom officiel → noms de travail, à valider.

// ----------------------------------------------------------------- levels
// Helpers de vagues : run(enemy, count, every, start)
const run = (enemy, count, every, start = 0) => Array.from({ length: count }, (_, i) => ({ t: +(start + i * every).toFixed(2), enemy }))
const wave = (budget, ...runs) => ({ budget, spawns: runs.flat().sort((a, b) => a.t - b.t) })

const LEVELS = [
  {
    id: 1, name: 'The Clearing', biome: 'clairiere', hills: [],
    path: [[3,0],[3,1],[2,1],[1,1],[1,2],[1,3],[2,3],[3,3],[4,3],[5,3],[5,4],[5,5],[4,5],[3,5],[2,5],[2,6],[2,7],[2,8],[2,9]],
    draft: { forced: ['buba', 'momo', 'puffy'] },
    onboarding: true,
    waves: [
      wave(3, run('slime', 3, 1.5)),
      wave(4, run('slime', 5, 1.3)),
      wave(4, run('slime', 7, 1.2)),
      wave(5, run('slime', 8, 1.1)),
      wave(5, run('slime', 10, 1.0)),
    ],
  },
  {
    id: 2, name: 'The Forest Edge', biome: 'foret', hills: [],
    path: [[0,0],[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[5,2],[5,3],[4,3],[3,3],[2,3],[1,3],[1,4],[1,5],[2,5],[3,5],[4,5],[5,5],[5,6],[5,7],[5,8],[5,9]],
    draft: { forced: ['olek', 'pomodoro', 'puffy', 'momo'] },
    onboarding: true,
    waves: [
      wave(3, run('slime', 4, 1.3)),
      wave(4, run('slime', 3, 1.3), run('slime-forest-a', 2, 2.0, 4)),
      wave(5, run('slime', 4, 1.2), run('slime-forest-b', 3, 0.8, 5), run('slime-forest-a', 2, 2.0, 8)),
      wave(5, run('slime-forest-a', 6, 1.5)),
      wave(6, run('slime', 8, 1.0), run('slime-forest-b', 4, 0.7, 8), run('slime-forest-a', 3, 1.5, 11)),
    ],
  },
  {
    id: 3, name: 'Wolf Trail', biome: 'sentier', hills: [[0,8]],
    path: [[1,0],[1,1],[1,2],[2,2],[3,2],[4,2],[5,2],[5,3],[5,4],[4,4],[3,4],[2,4],[1,4],[1,5],[1,6],[2,6],[3,6],[4,6],[5,6],[5,7],[5,8],[5,9]],
    draft: { forced: null },
    waves: [
      wave(3, run('wolf-gray', 3, 1.0)),
      wave(4, run('wolf-gray', 5, 0.9)),
      wave(4, run('slime', 2, 1.5), run('wolf-gray', 6, 0.8, 3)),
      wave(5, run('wolf-gray', 8, 0.8)),
      wave(5, run('slime-forest-b', 3, 0.8), run('wolf-gray', 8, 0.8, 3)),
      wave(6, run('wolf-alpha', 1, 0, 0), run('wolf-gray', 9, 0.7, 1)),
    ],
  },
  {
    id: 4, name: 'The Marsh', biome: 'marais', hills: [[6,1]],
    path: [[3,0],[3,1],[2,1],[1,1],[1,2],[1,3],[2,3],[3,3],[4,3],[5,3],[5,4],[5,5],[4,5],[3,5],[2,5],[1,5],[1,6],[1,7],[2,7],[3,7],[4,7],[5,7],[5,8],[5,9]],
    draft: { forced: null },
    waves: [
      wave(4, run('slime-attack', 4, 1.3), run('slime-defense', 2, 2.0, 2)),
      wave(4, run('slime-defense', 4, 1.5), run('slime-support', 2, 1.5, 3)),
      wave(5, run('wolf-aquatic', 6, 0.8), run('slime-support', 2, 2.0, 2)),
      wave(5, run('slime-attack', 5, 1.2), run('slime-defense', 4, 1.5, 1), run('slime-support', 2, 2.0, 4)),
      wave(6, run('wolf-aquatic', 8, 0.8), run('slime-defense', 3, 2.0, 2)),
      wave(6, run('wolf-aquatic-alpha', 1, 0, 0), run('wolf-aquatic', 8, 0.8, 1), run('slime-support', 3, 2.0, 4)),
    ],
  },
  {
    id: 5, name: 'The Grove', biome: 'bosquet', hills: [[6,4]],
    path: [[1,0],[1,1],[2,1],[3,1],[4,1],[5,1],[5,2],[5,3],[4,3],[3,3],[2,3],[1,3],[1,4],[1,5],[2,5],[3,5],[4,5],[5,5],[5,6],[5,7],[4,7],[3,7],[2,7],[1,7],[1,8],[1,9]],
    draft: { forced: null },
    waves: [
      wave(4, run('treant', 1, 0, 0), run('slime', 6, 1.0, 1)),
      wave(5, run('treant', 2, 4.0), run('slime-forest-a', 3, 1.2, 1)),
      wave(5, run('treant-flowering', 1, 0, 0), run('treant', 1, 0, 3), run('slime', 6, 1.0, 1)),
      wave(6, run('treant', 2, 4.0), run('slime-forest-b', 8, 0.7, 1)),
      wave(6, run('treant-flowering', 1, 0, 0), run('treant', 2, 4.0, 2), run('slime-forest-a', 4, 1.2, 1)),
      wave(7, run('treant', 3, 3.5), run('treant-flowering', 1, 0, 8), run('slime', 6, 0.9, 1)),
      wave(7, run('treant-fighter', 1, 0, 0), run('treant', 2, 4.0, 3), run('treant-flowering', 1, 0, 6), run('slime-forest-b', 6, 0.7, 1)),
    ],
  },
  {
    id: 6, name: 'Dryad Circle', biome: 'cercle', hills: [[5,1],[0,9]],
    path: [[3,0],[3,1],[3,2],[2,2],[1,2],[1,3],[1,4],[2,4],[3,4],[4,4],[5,4],[5,5],[5,6],[4,6],[3,6],[2,6],[1,6],[1,7],[1,8],[2,8],[3,8],[3,9]],
    draft: { forced: null },
    waves: [
      wave(4, run('dryad-ranger', 3, 2.0), run('slime', 4, 1.0, 1)),
      wave(5, run('dryad-fighter', 3, 1.5), run('dryad-ranger', 2, 2.0, 2)),
      wave(5, run('dryad-mage', 2, 3.0), run('slime-support', 2, 2.0, 1), run('slime', 6, 1.0, 2)),
      wave(6, run('dryad-ranger', 4, 1.5), run('dryad-fighter', 4, 1.5, 1)),
      wave(7, run('dryad-mage', 2, 4.0), run('dryad-fighter', 5, 1.2, 1), run('slime-support', 3, 2.0, 2)),
      wave(7, run('dryad-ranger', 6, 1.2), run('dryad-mage', 2, 5.0, 3), run('slime-forest-a', 6, 1.0, 1)),
      wave(8, run('dryad-fighter', 6, 1.2), run('dryad-ranger', 5, 1.5, 1), run('dryad-mage', 3, 4.0, 2), run('slime-support', 3, 2.5, 4)),
    ],
  },
  {
    id: 7, name: 'The Pack', biome: 'meute', hills: [[6,4],[3,9]],
    path: [[0,0],[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[5,2],[5,3],[4,3],[3,3],[2,3],[1,3],[0,3],[0,4],[0,5],[1,5],[2,5],[3,5],[4,5],[5,5],[5,6],[5,7],[4,7],[3,7],[2,7],[1,7],[0,7],[0,8],[0,9]],
    draft: { forced: null },
    waves: [
      wave(5, run('wolf-gray', 8, 0.7), run('slime', 4, 1.0, 1)),
      wave(5, run('wolf-alpha', 1, 0, 0), run('wolf-gray', 8, 0.7, 1)),
      wave(6, run('wolf-aquatic', 6, 0.8), run('wolf-gray', 6, 0.8, 1), run('slime-defense', 3, 2.0, 2)),
      wave(6, run('wolf-alpha', 2, 6.0), run('wolf-gray', 10, 0.6, 1)),
      wave(7, run('wolf-aquatic-alpha', 1, 0, 0), run('wolf-aquatic', 8, 0.7, 1), run('slime-support', 3, 2.0, 3)),
      wave(8, run('wolf-alpha', 2, 5.0), run('wolf-gray', 10, 0.6, 1), run('wolf-aquatic', 6, 0.8, 2)),
      wave(8, run('treant', 2, 5.0), run('wolf-gray', 12, 0.6, 1), run('wolf-aquatic', 4, 0.8, 4), run('slime-support', 3, 2.5, 2)),
      wave(9, run('werewolf', 1, 0, 0), run('wolf-alpha', 2, 6.0, 1), run('wolf-gray', 12, 0.6, 2), run('wolf-aquatic', 6, 0.8, 5)),
    ],
  },
  {
    id: 8, name: 'The Den', biome: 'taniere', hills: [[0,9],[6,0]],
    // Exception GDD §10 : la sortie est la tanière, au centre du plateau. Le chemin repasse près de lui-même 3 fois.
    path: [[3,0],[2,0],[1,0],[1,1],[1,2],[1,3],[1,4],[1,5],[1,6],[1,7],[1,8],[2,8],[3,8],[4,8],[5,8],[5,7],[5,6],[5,5],[5,4],[5,3],[5,2],[4,2],[3,2],[3,3],[3,4],[3,5],[3,6]],
    draft: { forced: null },
    waves: [
      wave(5, run('wolf-gray', 6, 0.8), run('slime-forest-a', 4, 1.2, 1)),
      wave(6, run('treant', 2, 4.0), run('dryad-ranger', 3, 1.5, 1), run('slime', 6, 1.0, 2)),
      wave(6, run('slime-fusion', 1, 0, 0), run('slime-attack', 6, 1.2, 1), run('slime-defense', 3, 2.0, 2), run('slime-support', 2, 2.0, 3)),
      wave(7, run('wolf-alpha', 1, 0, 0), run('wolf-gray', 10, 0.7, 1), run('dryad-fighter', 4, 1.5, 3)),
      wave(7, run('treant-flowering', 1, 0, 0), run('treant', 2, 4.0, 1), run('dryad-mage', 2, 4.0, 2), run('slime-forest-a', 6, 1.0, 1)),
      wave(8, run('werewolf', 1, 0, 0), run('wolf-aquatic', 10, 0.7, 1), run('wolf-aquatic-alpha', 1, 0, 6), run('slime-support', 3, 2.0, 3)),
      wave(9, run('treant-fighter', 1, 0, 0), run('dryad-ranger', 5, 1.2, 1), run('dryad-fighter', 5, 1.5, 2), run('slime-forest-b', 8, 0.6, 1)),
      wave(9, run('bear-dad', 1, 0, 0), run('slime', 8, 1.0, 2), run('dryad-ranger', 3, 2.0, 5), run('slime-support', 2, 3.0, 4)),
      wave(10, run('bear-mom', 1, 0, 0), run('dryad-mage', 2, 5.0, 2), run('wolf-alpha', 1, 0, 6), run('wolf-gray', 10, 0.7, 7), run('treant', 2, 5.0, 4), run('slime-support', 3, 2.5, 3)),
    ],
  },
]

// ----------------------------------------------------------- validation
const GDD_BUDGETS = {
  1: [3,4,4,5,5], 2: [3,4,5,5,6], 3: [3,4,4,5,5,6], 4: [4,4,5,5,6,6],
  5: [4,5,5,6,6,7,7], 6: [4,5,5,6,7,7,8], 7: [5,5,6,6,7,8,8,9], 8: [5,6,6,7,7,8,9,9,10],
}
const errors = []
const key = (c, r) => `${c},${r}`
for (const L of LEVELS) {
  const { cols, rows } = balance.grid
  const set = new Set(L.path.map(p => key(...p)))
  if (set.size !== L.path.length) errors.push(`L${L.id}: cellule de chemin dupliquée`)
  if (L.path[0][1] !== 0) errors.push(`L${L.id}: l'entrée n'est pas en haut`)
  const last = L.path.at(-1)
  if (last[1] !== rows - 1 && L.id !== 8) errors.push(`L${L.id}: la sortie n'est pas en bas`)
  for (let i = 0; i < L.path.length; i++) {
    const [c, r] = L.path[i]
    if (c < 0 || c >= cols || r < 0 || r >= rows) errors.push(`L${L.id}: hors grille ${c},${r}`)
    if (i > 0) {
      const [pc, pr] = L.path[i - 1]
      if (Math.abs(pc - c) + Math.abs(pr - r) !== 1) errors.push(`L${L.id}: pas non orthogonal entre ${pc},${pr} et ${c},${r}`)
    }
    // auto-contact : une case de chemin ne doit toucher que ses voisines de séquence
    for (const [dc, dr] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const k = key(c + dc, r + dr)
      if (!set.has(k)) continue
      const j = L.path.findIndex(p => key(...p) === k)
      if (Math.abs(j - i) !== 1) errors.push(`L${L.id}: le chemin se touche lui-même en ${c},${r} / ${k}`)
    }
  }
  if (L.hills.length > balance.cells.hill.max_per_level) errors.push(`L${L.id}: trop de collines`)

  /** Distance minimale entre une case et le chemin, en unités de case. */
  const distToPath = ([hc, hr]) => {
    let best = Infinity
    for (let d = 0; d <= L.path.length - 1; d += 0.05) {
      const i = Math.min(Math.floor(d), L.path.length - 1)
      const t = d - i
      const a = L.path[i]
      const b = L.path[Math.min(i + 1, L.path.length - 1)]
      const x = (a[0] + 0.5) + ((b[0] + 0.5) - (a[0] + 0.5)) * t
      const y = (a[1] + 0.5) + ((b[1] + 0.5) - (a[1] + 0.5)) * t
      best = Math.min(best, Math.hypot(x - (hc + 0.5), y - (hr + 0.5)))
    }
    return best
  }

  /** Portée maximale d'une chimère contre une colline, 0 si elle ne peut pas. */
  const hillReach = (type) => {
    const e = balance.enemies[type]
    if (!e) return 0
    const r = e.ranged?.hits_hill ? e.ranged.range : 0
    const a = e.aoe?.hits_hill ? e.aoe.radius : 0
    return Math.max(r, a)
  }

  const bestReach = Math.max(0, ...[...new Set(L.waves.flatMap(w => w.spawns.map(s => s.enemy)))].map(hillReach))

  for (const [c, r] of L.hills) {
    if (set.has(key(c, r))) errors.push(`L${L.id}: colline sur le chemin ${c},${r}`)
    for (const [dc, dr] of [[1,0],[-1,0],[0,1],[0,-1]]) if (set.has(key(c + dc, r + dr))) errors.push(`L${L.id}: colline adjacente au chemin ${c},${r}`)
    // Dans un niveau qui aligne des chimères capables de viser les collines,
    // CHAQUE colline doit être à leur portée. Une seule colline hors d'atteinte
    // suffirait à rendre les autres sans objet : le joueur s'y installerait et
    // les tireurs redeviendraient décoratifs. C'est exactement le bug corrigé au
    // niveau 6, dont la colline était à 3,0 du chemin.
    // Un niveau sans ces chimères garde des collines sûres, et c'est voulu : leur
    // prix y reste la portée perdue et l'absence d'aura (GDD §4, §10.1).
    const d = distToPath([c, r])
    if (bestReach > 0 && d > bestReach) {
      errors.push(`L${L.id}: colline ${c},${r} hors d'atteinte des chimères du niveau — à ${d.toFixed(2)} du chemin, portée max ${bestReach}`)
    }
  }
  const budgets = L.waves.map(w => w.budget)
  if (JSON.stringify(budgets) !== JSON.stringify(GDD_BUDGETS[L.id])) errors.push(`L${L.id}: budgets ${budgets} ≠ GDD ${GDD_BUDGETS[L.id]}`)
  for (const w of L.waves) for (const s of w.spawns) if (!balance.enemies[s.enemy]) errors.push(`L${L.id}: ennemi inconnu ${s.enemy}`)
  if (L.draft.forced) for (const a of L.draft.forced) if (!axies.find(x => x.id === a)) errors.push(`L${L.id}: axie inconnu ${a}`)
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1) }

// ------------------------------------------------------------- vfx map
const vfxMap = {
  version: '1.0',
  axie_attack: {
    beast:   { spine: 'attack/melee/tail-smash',   vfx: 'beast_smash',        sfx: 'beast_smash_attack' },
    aquatic: { spine: 'attack/ranged/cast-fly',    vfx: 'aquatic_projectile', sfx: ['aquatic_projectile_attack', 'aquatic_projectile_fly', 'aquatic_projectile_hit'] },
    plant:   { spine: 'attack/melee/horn-gore',    vfx: 'plant_gore',         sfx: 'plant_gore_attack' },
    bird:    { spine: 'attack/ranged/cast-fly',    vfx: 'bird_projectile',    sfx: ['bird_projectile_attack', 'bird_projectile_fly', 'bird_projectile_hit'] },
    bug:     { spine: 'attack/melee/mouth-bite',   vfx: 'bug_bite',           sfx: 'bug_bite_attack' },
    reptile: { spine: 'attack/ranged/cast-high',   vfx: 'reptile_cast',       sfx: ['reptile_cast_attack', 'reptile_cast_hit'] },
  },
  axie_place: { spine: 'activity/appear', sfx_by_class: { beast: 'beast_cast_attack', aquatic: 'aquatic_cast_attack', plant: 'plant_cast_attack', bird: 'bird_cast_attack', bug: 'bug_cast_attack', reptile: 'reptile_cast_attack' } },
  axie_hit: { spine: 'defense/hit-by-normal' },
  // Les Axies n'ont pas 'defense/hit-die' : c'est une animation de chimère.
  // Vérifié sur les squelettes du kit, ils s'arrêtent à hit-by-normal-dramatic.
  axie_ko: { spine: 'defense/hit-by-normal-dramatic', fallback: 'defense/hit-by-normal' },
  axie_idle: { spine: 'action/idle/normal', random: ['action/idle/random-01', 'action/idle/random-02', 'action/idle/random-03'] },
  axie_victory: { spine: 'activity/victory-pose-back-flip' },
  axie_unlock: { spine: 'activity/appear' },
  status: {
    wet: { vfx: 'bubble', sfx: 'bubble' }, roots: { vfx: 'leaf', sfx: 'leaf' }, blocked: { vfx: 'taunt', sfx: 'taunt' },
    feather: { vfx: 'feather', sfx: 'feather' }, poison: { vfx: 'poison_apply', sfx: null }, bleed: { vfx: 'bleed_apply', sfx: null },
    fragile: { vfx: 'fragile', sfx: 'weak' }, rage: { vfx: 'rage', sfx: 'power_gain' },
  },
  reaction: {
    ricochet: { vfx: 'bird_projectile', sfx: 'bird_projectile_hit', scale: 1.4 },
    rooting:  { vfx: ['leaf', 'poison_apply'], sfx: 'leaf', scale: 1.3 },
    shatter:  { vfx: ['fragile', 'beast_smash'], sfx: 'beast_smash_attack', scale: 1.6, pitch: 1.1 },
    burst:    { vfx: 'bleed_apply', sfx: 'bug_smash_attack', scale: 2.0 },
  },
  enemy: {
    walk: 'action/move-forward', hit: 'defense/hit-by-normal', die: 'defense/hit-die', attack: 'attack/melee/normal-attack',
    ranged_attack: 'attack/ranged/cast-high', buff: 'battle/get-buff', debuff: 'battle/get-debuff',
    enrage: { vfx: 'fury_form', sfx: 'power_awaken' }, heal: { vfx: 'heal', sfx: 'heal' }, split: { vfx: 'summon_on_death', sfx: null },
  },
  level: { leak: { sfx: 'hex', screen_flash: 0.2 }, wave_start: { sfx: 'power_gain' }, stars: { sfx: ['cure', 'cleanse', 'power_awaken'] } },
}

// -------------------------------------------------------------- output
const w = (name, obj) => writeFileSync(join(OUT, name), JSON.stringify(obj, null, 2) + '\n')
w('balance.json', balance)
w('axies.json', { version: '1.0', axies })
w('vfx-map.json', vfxMap)
for (const L of LEVELS) {
  const out = { ...L, exit: L.path.at(-1), entry: L.path[0] }
  w(`levels/${String(L.id).padStart(2, '0')}.json`, out)
}

// ------------------------------------------------------------- rapport
console.log('Axies :')
for (const a of axies) console.log(`  ${a.id.padEnd(14)} ${a.class.padEnd(8)} ${JSON.stringify(a.bonuses).padEnd(40)} ${a.profile ?? '-'}  ${a.unlock.stars ?? a.unlock.type}`)
console.log('\nNiveaux (PV totaux / budget par vague) :')
for (const L of LEVELS) {
  const p = L.waves.map(wv => Math.round(wv.spawns.reduce((s, x) => s + balance.enemies[x.enemy].hp, 0) / wv.budget))
  const n = L.waves.map(wv => wv.spawns.length)
  const dur = L.waves.map(wv => Math.round(wv.spawns.at(-1).t))
  console.log(`  L${L.id} ${L.name.padEnd(22)} chemin ${String(L.path.length).padStart(2)}  collines ${L.hills.length}  pression ${p.join(' ')}  ennemis ${n.join(' ')}  spawn(s) ${dur.join(' ')}`)
}
