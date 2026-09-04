import { BALANCE, axieDef, levelDef } from '../data/load'
import { starsFor, step } from '../sim/game'
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

  /** Classe d'une chimère annoncée, pour l'afficher sur la fiche du niveau. */
  announcedClass(type: string): string {
    return BALANCE.enemies[type]?.class ?? 'beast'
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
    const stars = w.phase === 'won' ? starsFor(w.lives) : 0
    this.save = recordResult(this.save, this.levelId, stars)
    return stars
  }
}

/** Ce que l'écran de résultat ou de défaite a besoin de savoir. */
export type Outcome = {
  won: boolean
  stars: number
  /** Axie que ces étoiles viennent d'ouvrir, `null` si aucun. */
  unlocked: string | null
  /** Vague atteinte, pour l'écran de défaite. */
  wave: number
}

/**
 * Enregistre la fin de niveau et dit quoi afficher. `null` tant que la partie court.
 *
 * Le déblocage se déduit d'une comparaison avant / après plutôt que d'un champ
 * stocké : les Axies disponibles se recalculent depuis le total d'étoiles (GDD
 * §15), et c'est la seule façon de savoir lequel vient d'apparaître.
 */
export function finishLevel(session: Session): Outcome | null {
  const w = session.world
  if (!w || (w.phase !== 'won' && w.phase !== 'lost')) return null
  const avant = new Set(unlockedAxies(session.save))
  const stars = session.finish()
  return {
    won: w.phase === 'won',
    stars,
    unlocked: unlockedAxies(session.save).find((id) => !avant.has(id)) ?? null,
    wave: Math.min(w.waveIndex + 1, w.level.waves.length),
  }
}
