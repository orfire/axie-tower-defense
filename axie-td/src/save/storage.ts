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
