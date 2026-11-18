# GUNK FUNK

_The Grooviest Gross-Out of 1994!_ — an original retro 16-bit chaos platformer for the
browser, built with Phaser 3 and TypeScript.

Disgraced hygiene scientist **Professor Stinkbottom** has dumped his _Funk Juice_ into the
city sewers. **Bulgo** — a lumpy green mutant with a gorilla torso, stubby legs, an underbite
and boundless dim enthusiasm — crawls out of the muck to stop him. Mostly by accident.

> **Status:** early development. The engine, Bulgo (fully animated), combat with three
> upgradeable weapons, and a test stage full of training dummies are playable. See [`CHECKLIST.md`](CHECKLIST.md) for exactly what works and what's
> next, and [`docs/DEVELOPMENT_PLAN.md`](docs/DEVELOPMENT_PLAN.md) for the architecture.

## Requirements

- Node.js 20+ (developed on Node 22)
- A modern desktop browser (Chrome, Firefox, Edge, Safari)

## Install & run

```bash
npm install
```

```bash
npm run dev
```

Then open the printed URL (default <http://localhost:5173>). Add `?debug` to the URL for the
debug overlay (FPS, player state, hitboxes) and the `window.gunkDebug` test hooks.

The **Sound Test** page (music, stingers and every sound effect) is at
<http://localhost:5173/sound-test.html>.

## Build

```bash
npm run build
```

Outputs a static site to `dist/` (relative paths — host it anywhere, or open via any static
file server). Preview the production build with:

```bash
npm run preview
```

## Controls

| Action                                            | Keyboard                       | Gamepad (standard mapping) |
| ------------------------------------------------- | ------------------------------ | -------------------------- |
| Move                                              | Arrow keys / WASD              | D-pad / left stick         |
| Jump (press again in the air to double jump)      | Z / Space / J                  | A / Cross                  |
| Punch combo (tap ×3: jab → uppercut → belly bump) | X / K                          | X / Square                 |
| Mega punch (hold punch, release when he flashes)  | Hold X / K                     | Hold X / Square            |
| Shoot (hold for auto-fire)                        | C / L                          | B / Circle                 |
| Switch weapon                                     | Shift / E                      | LB / RB                    |
| Slide                                             | Down while running             | Down while running         |
| Drop through grates                               | Down + Jump                    | Down + A                   |
| Climb ladders                                     | Up / Down                      | Up / Down                  |
| Wall jump                                         | Jump while sliding down a wall | —                          |
| Pause                                             | Enter / Esc / P                | Start                      |

Special (V) is bound but arrives with the transformations in milestone M7.

## Checks

```bash
npm run check        # format check + lint + typecheck + unit tests
```

```bash
npm run test:e2e     # boots the game in headless Chromium and plays it
```

Individual scripts: `npm run format`, `npm run lint`, `npm run typecheck`, `npm test`.

- **Unit tests** (Vitest, `tests/unit/`) cover the pure systems: pixel raster library,
  level parsing, movement physics (jump height, coyote time, jump buffering, wall jumps,
  slides), melee combo timing and quips, the combat world, weapon inventory, trigger
  timing, projectile flight and bouncing, homing, shot patterns and charge timing.
- **Smoke test** (Playwright, `tests/e2e/smoke.mjs`) starts Vite, walks title → menu →
  stage, drives Bulgo through running, jumping, punching, sliding, hazards, wall slides,
  ladders, pause, idle and death/respawn, asserts the outcomes, saves screenshots to
  `test-results/smoke/`, and fails on any console error.
- **Combat test** (`tests/e2e/combat.mjs`) collects and upgrades weapons, fires all three
  at training dummies, switches weapons, throws the charged mega punch and checks that a
  knocked-off dummy head bowls over its neighbour.
- **Audio render test** (`tests/e2e/audio-render.mjs`) renders every track, stinger and
  sound effect offline, checks levels/clipping/silence, and writes WAVs to `audio-export/`.

## Art pipeline

All art is **pixel art authored in code** — there are no image files. A small raster
library (`src/art/pixel/`) draws pixel-exact shapes with dithered shading and automatic
outlines; characters are posable rigs (`src/art/sprites/bulgo/`) whose animations are lists
of poses. At boot every sheet is rasterised into Phaser textures in a few milliseconds.

To review the art as images:

```bash
npm run art:export
```

This writes `art-export/<sheet>.png` (1×) and `<sheet>@4x.png` (enlarged, with frame grid).

## Audio

All music and sound effects are **synthesised at runtime** with the Web Audio API — slap
bass, drums, clav, guitars, synths and cartoon SFX. Browsers block audio until the first key
press or click; the title screen's "PRESS START" doubles as that unlock.

## Project layout

```
src/
  art/        pixel raster library, palettes, sprite rigs, tiles, backgrounds, font
  audio/      synth engine, instruments, sequencer + songs, SFX recipes
  config/     resolution and global constants
  core/       input (keyboard + gamepad → actions), session state, events
  gameplay/   player (movement, combat, health), characters, camera, effects
  levels/     ASCII level format, parser, Phaser level builder, parallax, stage data
  scenes/     boot, title, level, HUD, pause, game over, debug overlay
  ui/         pixel text, menus, speech bubbles
tests/        unit (Vitest) and e2e (Playwright) tests
tools/        art export
docs/         development plan
```

All characters, art, music and sound are original.
