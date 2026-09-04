export type ScreenId =
  | 'title' | 'map' | 'brief' | 'draft' | 'play' | 'result' | 'defeat' | 'collection'

export type ScreenParams = Record<string, unknown>

/** Navigation à un seul écran visible et une pile de retour. */
export class Router {
  current: ScreenId = 'title'
  private stack: ScreenId[] = []
  private handlers = new Map<ScreenId, ((p: ScreenParams) => void)[]>()

  onEnter(id: ScreenId, cb: (p: ScreenParams) => void): void {
    const list = this.handlers.get(id) ?? []
    list.push(cb)
    this.handlers.set(id, list)
  }

  go(id: ScreenId, params: ScreenParams = {}): void {
    if (id !== this.current) this.stack.push(this.current)
    this.current = id
    for (const cb of this.handlers.get(id) ?? []) cb(params)
  }

  /** Revient à l'écran précédent, ou au titre si la pile est vide. */
  back(): ScreenId {
    const prev = this.stack.pop() ?? 'title'
    this.current = prev
    for (const cb of this.handlers.get(prev) ?? []) cb({})
    return prev
  }
}
