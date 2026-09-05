# Axie Tower Defense

**A mobile tower defense where no Axie ever levels up: you win by choosing which
Axies to bring and which ones you stand them next to.**

Entry for the [Axie Vibeathon](https://vibeathon.axieinfinity.ai), Round 1.
Solo entry by Edouard Blanchard.

- Playable build: `<Vercel URL — not deployed yet>`
- Submission dossier: **[`SUBMISSION.md`](SUBMISSION.md)** ← start here if you
  are judging this entry
- Assets and licences: [`ASSETS.md`](ASSETS.md)
- Design document (French, source of truth): [`design/GDD.md`](design/GDD.md)

## The idea in thirty seconds

Every Axie has a class and six body parts, and that is all it ever has. No
levels, no upgrades, no equipment. The class fixes an attack, a status and an
**aura** that only reaches the four orthogonal neighbours. Two Axies of the same
class side by side do not stack their auras, so mono-class spam is dead on
arrival and every board is a placement puzzle. The attackers are Lunacia's
chimeras.

Eight hand-made levels, 5 to 9 waves each, roughly 3–5 minutes per level.
Fully deterministic: no randomness anywhere in the simulation, so a retry is
byte-identical and only your layout is in question.

Portrait, one finger, French UI.

## Running it

Requires Node 22+.

```bash
cd axie-td
npm install
npm run dev        # http://localhost:5179
```

Other commands, all from `axie-td/`:

| Command | What it does |
|---|---|
| `npm run build` | Type-checks then builds to `dist/`. This is what Vercel runs. |
| `npm run preview` | Serves the built `dist/` — always test this, not the dev server. |
| `npm test` | Vitest, 187 tests. |
| `npm run data` | Regenerates and validates `data/*.json`. **Never edit those JSON by hand.** |
| `npm run balance` | Replays all 8 levels headless with an auto-placer and prints the stars obtained. |
| `npm run assets` | Rebuilds `public/` from the two official kits. Needs both kits checked out next to this repo and `ffmpeg` on the PATH. Not needed to build or play. |

## Layout

```
axie-td/            the game
  src/sim/          pure TypeScript simulation, fixed 30 Hz step, zero randomness,
                    zero rendering imports — this is where the rules live
  src/render/       PixiJS + pixi-spine. Reads the simulation, never writes to it
  src/ui/           DOM screens: title, map, brief, draft, cards, controls, HUD
  src/game/         session glue between UI intents and the simulation
  src/data/         typed loaders for data/*.json
  data/             generated game data (balance, axies, 8 levels, VFX map)
  public/           converted Spine, VFX, SFX and music assets (26 MB)
  tools/            gen-data.mjs, copy-assets.mjs, balance.ts
  tests/            187 Vitest tests, including architecture guards
design/             GDD (source of truth) and the screen mock-up
docs/               implementation plan
```

Two architecture rules are enforced by tests rather than by convention:
`src/sim/` may never import from `pixi.js`, `pixi-spine`, `src/render/` or
`src/ui/`, and it may never call `Math.random`, `Date.now` or `performance.now`.

## Deployment

`axie-td/vercel.json` is ready. Create the Vercel project with **Root Directory
set to `axie-td`** — the repository root also holds `design/` and `docs/`.
Static hosting, no server, no API key, no environment variable.

## Licence and assets

Game code: original, written for this entry.
Art, animation and audio: Sky Mavis / Axie Infinity IP, used under the Axie
Origins Battle Kit licence for the Axie Vibeathon. The two source kits are
deliberately **excluded** from this repository. Details in
[`ASSETS.md`](ASSETS.md).
