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
