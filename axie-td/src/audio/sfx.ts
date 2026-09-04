const cache = new Map<string, HTMLAudioElement>()

/** Sons du kit. Un seul bouton mute, pas de réglage de volume (GDD §14). */
export class Sfx {
  muted = false

  constructor(private readonly volume = 0.5) {
    try { this.muted = localStorage.getItem('axietd.mute') === '1' } catch { /* stockage indisponible */ }
  }

  play(id: string | string[] | null | undefined): void {
    if (!id || this.muted) return
    if (Array.isArray(id)) { id.forEach((i) => this.play(i)); return }
    let base = cache.get(id)
    if (!base) {
      base = new Audio(`/sfx/${id}.mp3`)
      base.preload = 'auto'
      cache.set(id, base)
    }
    // Un clone par lecture : sans ça, deux effets simultanés se coupent.
    const node = base.cloneNode(true) as HTMLAudioElement
    node.volume = this.volume
    void node.play().catch(() => { /* le navigateur exige un geste utilisateur */ })
  }

  toggleMute(): boolean {
    this.muted = !this.muted
    try { localStorage.setItem('axietd.mute', this.muted ? '1' : '0') } catch { /* ignoré */ }
    return this.muted
  }
}
