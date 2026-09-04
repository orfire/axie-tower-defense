import { BALANCE, LEVELS, PLAYABLE } from '../data/load'

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

/** Score maximal d'un niveau, lu depuis les données plutôt que supposé. */
const MAX_PER_LEVEL = Math.max(...Object.values(BALANCE.level.stars_by_lives))

/**
 * Ne retient que des scores plausibles.
 *
 * Une sauvegarde est un fichier texte que le joueur peut ouvrir et modifier.
 * Sans ce filtre, y écrire 999 étoiles à un niveau ouvrirait toute la collection :
 * la règle « aucun déblocage n'est stocké » ne protège de rien si le total dont
 * ils dérivent n'est pas borné. Un identifiant de niveau inconnu est ignoré.
 */
function cleanStars(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out
  const connus = new Set(LEVELS.map((l) => String(l.id)))
  for (const [id, valeur] of Object.entries(raw as Record<string, unknown>)) {
    if (!connus.has(id)) continue
    if (typeof valeur !== 'number' || !Number.isFinite(valeur)) continue
    out[id] = Math.min(MAX_PER_LEVEL, Math.max(0, Math.floor(valeur)))
  }
  return out
}

/** Ne retient que des drafts faits d'Axies existants et jouables. */
function cleanDrafts(raw: unknown): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out
  const connus = new Set(PLAYABLE.map((a) => a.id))
  for (const [id, valeur] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(valeur)) continue
    const ids = valeur.filter((x): x is string => typeof x === 'string' && connus.has(x))
    if (ids.length > 0) out[id] = ids.slice(0, 5)
  }
  return out
}

/**
 * Une sauvegarde absente, vide, illisible ou malformée donne une partie neuve.
 *
 * Un fichier peut très bien être du JSON valide et avoir la mauvaise forme :
 * `{"version":1,"stars":"x"}` ne lève rien et traverserait le `catch` sans être
 * vu. Chaque champ est donc filtré, pas seulement la version.
 */
export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptySave()
    const parsed = JSON.parse(raw) as Partial<SaveData>
    if (parsed.version !== 1) return emptySave()
    return {
      version: 1,
      stars: cleanStars(parsed.stars),
      lastDraft: cleanDrafts(parsed.lastDraft),
      speed2x: parsed.speed2x === true,
      mute: parsed.mute === true,
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
