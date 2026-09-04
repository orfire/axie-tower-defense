# Axie Tower Defense — Axie Vibeathon, Round 1 submission

> Fields follow the official Round 1 README template
> (`vibeathon.axieinfinity.ai/rules/1.0.1`). Placeholders in `<angle brackets>`
> are the ones the author must fill in before submitting; everything else is
> final. Deadline: **21 Sep 2026, 20:00 ICT (15:00 Paris)**.

## Game title

Axie Tower Defense

## One-line pitch

A mobile tower defense where no Axie ever levels up: you win by choosing which
Axies to bring and which ones you stand them next to.

## Axie Core interpretation — traits and relationships

Axie Core here means **traits** and **relationships**, and it is the whole rule
set, not a skin.

- **Traits.** An Axie's class and its six body parts decide everything it does
  on the board. There is no level, no upgrade, no equipment. Class fixes the
  attack, the status it applies and the aura it projects; the six parts derive a
  profile — DPS, Tank, Rapide or Hybride — that shifts the stats. The canonical
  Axie class triangle applies at +15 % / −15 % damage: Beast and Bug beat Plant
  and Reptile, Plant and Reptile beat Aquatic and Bird, Aquatic and Bird beat
  Beast and Bug.
- **Relationships.** Every Axie projects an aura on its **four orthogonal
  neighbours** — never diagonals. A lone Axie is weak; a well-arranged team is
  strong. Two Axies of the same class placed side by side do **not** stack their
  auras (the stronger one applies), which forbids mono-class spam and forces
  mixed formations. The board shows aura links as coloured borders carrying a
  class emblem, so the relationship is legible without reading a manual and
  without relying on colour alone.
- **World.** The attackers are Lunacia's chimeras — slimes, wolves, treants,
  dryads, bears — 20 enemy types taken from the official Origins bestiary. The
  Axies defend.

Round 2 direction: read the player's real Axies through the read-only Sky Mavis
API so their actual parts feed the profile system, and award AXP to drafted
Axies through the official AXP endpoint.

## Playable build

`<Vercel HTTPS URL — not deployed yet, see Open items>`

## Repository

`<GitHub URL — not pushed yet, see Open items>`

## Backup demo video

`<not recorded — see Open items>`

## Supported platforms

- Mobile browser, **portrait only**, from 360 × 640 up. Target: iOS 15+ and
  Android 10+.
- Desktop browser: the game renders in a centred portrait frame and the mouse
  replaces the finger.
- One touch point. No zoom, no pan, no rotation, no landscape mode.

Verified in this repository: the exported production build serves and boots, and
every asset URL it requests returns 200. **Not verified: real iOS and Android
devices.** See Known issues.

## Controls

Shown in-game on the "Contrôles et appareils" page, reachable from the title
screen.

- Drag an Axie from the tray onto a tile to place it.
- Drag it off the board to remove it and get its energy back.
- Drag a placed Axie anywhere else on the board — repositioning is free and
  unlimited.
- Tap a placed Axie, or a chimera during a wave, to open its stat card.
- Long-press in the tray to open a card without placing.
- `Lancer la vague` starts the wave, `×2` doubles speed, `♪` mutes, `☰` returns
  to the map, `Esc` closes an open card.

Melee classes (Plant, Beast, Bug) may be placed **on the path**, where they
block. Ranged classes (Aquatic, Bird, Reptile) go on plains or on a hill; a hill
is safe from everything except dryads but costs one tile of range and cancels
all auras.

## How to start

Open the link, tap **Jouer**, then level 1. Levels 1 and 2 lend you a fixed
team and coach the first gestures; free drafting opens at level 3. No account,
no wallet, no extension, no install.

## Win condition

Survive every wave of the level. The campaign is 8 hand-made levels, 5 to 9
waves each, roughly 3–5 minutes per level. Leaks cost stars: **zero chimera
through = 3 stars**, and stars unlock more Axies for the collection (24 stars
total).

## Loss and retry

Three chimeras through the exit and the level is lost. Retry restarts at wave 1.
**Waves are fully deterministic** — a fixed seed per level, zero randomness
anywhere in the simulation — so a second attempt is identical and only your
layout is in question. That is a design requirement, not a side effect.

## Known issues

Declared honestly; none of these is speculative.

1. **Levels 6 and 8 are not beaten by the automated balance bench.** `npm run
   balance` runs a greedy auto-placer over every level; it clears levels 1–5 and
   7 at 60–100 % of the energy budget but loses levels 6 and 8 **even at 200 %
   of the budget**. The bench ignores auras and chain reactions by design, so it
   measures a difficulty floor and not a ceiling — these two levels may simply
   require the aura play the bench cannot do. **This has not been settled by
   human playtesting.** Treat levels 6 and 8 as unproven difficulty.
2. **The full campaign has never been played end to end in a real browser.** The
   development environment hides its browser pane, and `requestAnimationFrame`
   never fires there — measured, not assumed. Menus, routing, drafting and asset
   loading were verified against the production build; **the rendering loop,
   drag-and-drop and combat feel were not.**
3. **60 fps with ~20 chimeras on screen has never been measured on a phone.**
   No performance profiling was done on mobile hardware.
4. **Status pips are emoji glyphs.** They render correctly on Chrome/Windows.
   Rendering on iOS and Android was not checked; a missing glyph would degrade
   to a box. The `Contrôles` page carries the full legend as a text fallback.
5. **Six starter Axies carry unvalidated working names** — Kestrel, Fennel,
   Marlin, Thistle, Bramble, Fang. They are placeholders, not official names.
6. **No music.** Sound effects only, 28 of them, with a mute button.
7. **Fredoka is not bundled.** The stylesheet asks for it first, so the game
   falls back to Trebuchet MS or the platform UI font. The intended rounded
   cartoon look is therefore only present on machines that already have Fredoka
   installed.
8. **The JS bundle is a single 917 kB chunk** (268 kB gzipped). Under the 1 MB
   line we set for ourselves, but not code-split.

## Engine and version

Vite 6.4.3, TypeScript 5.9.3, PixiJS 7.2.4, pixi-spine 4.0.3, Spine data 3.8.79.
Built and tested on Node 22.18. No game engine, no framework: a pure TypeScript
fixed-step simulation at 30 Hz with a PixiJS renderer that only reads it.

## AI tools used substantially

**Claude Code (Anthropic)** was used throughout: game design discussion,
architecture, and the writing of essentially all TypeScript source, tests, data
generators and documentation in this repository. The work was directed
step by step by Edouard Blanchard, who made every design and balance decision.

## Generated components

- All TypeScript under `axie-td/src/` and `axie-td/tests/` (187 tests) was
  written with Claude Code.
- `axie-td/data/*.json` is machine-generated by `axie-td/tools/gen-data.mjs` and
  never hand-edited.
- `axie-td/src/ui/icons.generated.ts` is machine-generated by
  `axie-td/tools/copy-assets.mjs`.
- The design document `design/GDD.md` and the implementation plan under `docs/`
  were drafted with Claude Code from decisions taken by the author.
- Not generated: the game rules, the class/aura system, the balance targets, the
  level design intent and the art direction, all of which are the author's and
  are recorded in `design/GDD.md`.

## Pre-existing work and starters

No fork, no game-jam template, no starter project. The web runtime borrows two
ideas from Sky Mavis's `axie-origins-asset-kit/web-vfx` sample: its Vite setup
and its technique for playing the VFX atlases in additive blend through a
`plus-lighter` overlay canvas. All game code is original to this entry.

## Asset sources and required credits

See [`ASSETS.md`](ASSETS.md). Summary: every visual and audio asset comes from
the two official Sky Mavis kits (`unity-axie-gtk2d`,
`axie-origins-asset-kit`) under the Axie Origins Battle Kit licence, converted
by `axie-td/tools/copy-assets.mjs`. The kits themselves are **excluded from this
repository** — the charter forbids redistributing them as a standalone asset
dump. The title screen carries a permanent "Assets Axie Infinity, Sky Mavis"
credit.

## Dependencies

- Runtime: `pixi.js` 7.2.4, `pixi-spine` 4.0.3.
- Development: `vite` 6, `typescript` 5.9, `vitest` 3.2, `vite-node` 3.2,
  `jsdom` 29, `sharp` 0.35, `@types/node` 22.
- `package.json` pins the fourteen `@pixi/*` sub-packages to 7.2.4 via
  `overrides`; the comment above the block explains why (two copies of the PIXI
  core otherwise coexist and break the extension registry at runtime).
- External services at runtime: **none**. No API key, no wallet, no network call
  beyond the game's own static assets.

## Contributors

Edouard Blanchard — sole participant, solo entry.

## Contact

edouard.blanchard@gmail.com

---

## Open items for the author

These are not done and cannot be done from the repository:

1. **Deploy.** `axie-td/vercel.json` is ready. Create the Vercel project with
   **Root Directory = `axie-td`**, deploy, then paste the HTTPS URL above and
   open it in a private window with no Vercel session.
2. **Push the repository** and paste its URL above.
3. **Record the 2-minute backup video** — the rules require it. Show the whole
   loop: title, map, level brief, draft, placement with aura highlights, a wave,
   a chain reaction, a defeat, a retry, a 3-star win, an Axie unlock.
4. **Play the campaign on a real phone**, portrait, and settle whether levels 6
   and 8 are demanding or broken.
5. **Confirm the Spine Essential licence** is purchased (required by the Spine
   Runtimes licence to ship `pixi-spine`).
6. **Validate or replace the six working names** listed in Known issues.

## Final rules checklist

Status recorded as of this commit. `?` means not verifiable from here.

```
[x] A new player can start unaided       (levels 1-2 coach the first gestures)
[x] Goal and controls visible in-game    (Contrôles page from the title screen)
[x] Action, challenge, win, loss, retry  (all implemented and covered by tests)
[x] Axie Core link explicit and visible  (auras drawn on the board, parts on cards)
[?] Loading, UI, sound and feedback      (menus verified on the built app; the
                                          render loop was not — no rAF here)
[x] Accessibility basics                 (no colour-only info, mute button, in-game
                                          controls page, status legend, fast retry)
[?] Exported build works on each platform announced   (desktop build boots and
                                          serves; iOS/Android untested)
[ ] Public HTTPS link opens in a private window       (not deployed yet)
[ ] Repository and instructions viewable              (not pushed yet)
[ ] Video shows the whole loop                        (not recorded)
[x] AI tools, generated components, dependencies, assets declared
[x] Credits and attributions preserved
[x] Known issues described honestly
[ ] Submitted link points at the exact version tested (pending deploy)
[ ] No feature added after the last clean-device test (pending)
```
