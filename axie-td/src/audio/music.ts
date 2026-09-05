/**
 * Musique de fond : une seule boucle à la fois, relancée uniquement quand elle
 * change. Naviguer entre le titre, la carte et le draft ne recommence donc pas
 * la piste, qui court d'un écran à l'autre.
 *
 * Volume nettement sous celui des effets, et pas de réglage séparé : le GDD §14
 * ne prévoit qu'un bouton de coupure, partagé avec les effets sonores.
 */
export class Music {
  private el: HTMLAudioElement | null = null
  private current: string | null = null

  constructor(private muted: boolean, private readonly volume = 0.28) {
    // Les navigateurs refusent tout son avant le premier geste du joueur. La
    // piste du titre est donc demandée avant d'être permise : on la retient et
    // on retente à chaque geste tant qu'elle n'a pas démarré, plutôt que de
    // perdre la musique de l'écran d'accueil.
    const unlock = () => this.resume()
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
  }

  /** Demande une boucle, ou `null` pour le silence. Sans effet si c'est déjà elle. */
  play(id: string | null): void {
    if (id === this.current) return
    this.current = id
    this.stop()
    if (!id) return
    const el = new Audio(`/music/${id}.mp3`)
    el.loop = true
    el.volume = this.volume
    el.preload = 'auto'
    this.el = el
    this.resume()
  }

  /** Relance la piste retenue si elle est en pause et que le son est autorisé. */
  resume(): void {
    const el = this.el
    if (!el || this.muted || !el.paused) return
    void el.play().catch(() => { /* geste utilisateur encore attendu */ })
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (muted) this.el?.pause()
    else this.resume()
  }

  private stop(): void {
    this.el?.pause()
    this.el = null
  }
}

/**
 * Boucle qui accompagne un écran.
 *
 * Le kit ne fournit que trois pistes d'aventure : on les répartit sur les sept
 * premiers niveaux plutôt que d'en imposer une seule sur trois heures de jeu.
 * La tanière garde la piste de boss, elle seule aligne les deux ours.
 */
export function trackFor(screen: string, levelId: number): string {
  if (screen !== 'play') return 'home'
  if (levelId >= 8) return 'boss'
  return `pve_${((levelId - 1) % 3) + 1}`
}
