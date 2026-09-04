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
  // Case entière en pixels : évite le flou sous-pixel entre cases adjacentes
  // et correspond aux 385 × 550 de la maquette de référence (GDD §11.2).
  const cell = Math.floor(Math.min(width / COLS, (height - CHROME_H) / ROWS))
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
