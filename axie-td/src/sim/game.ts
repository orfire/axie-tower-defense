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
