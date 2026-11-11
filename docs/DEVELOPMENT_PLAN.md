# GUNK FUNK — Development Plan

> _"The Grooviest Gross-Out of 1994!"_ — a lost 16-bit cult classic, built for the browser.

This document is the architectural plan for the project. The living task list is
[`CHECKLIST.md`](../CHECKLIST.md). Read this first if you are new to the codebase.

---

## 1. Spec analysis — what actually matters

The spec is enormous (5 worlds, 3+ characters, 9 weapons, 7 power-ups, co-op…). Building
it all at once would produce a large pile of half-working features. The spec itself says
to prioritise a **polished vertical slice**, and names three pillars that must exist from
the start, not at polish time:

| Pillar                                        | What it means for engineering                                                                                                                                                                               |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Transformations & absurd power-ups**     | The player is not one fixed controller. Movement, attacks, hitbox and sprite set must be swappable at runtime → a _form_ abstraction from day one.                                                          |
| **B. Interactive / destructible environment** | Level objects are first-class entities with physics, health and reactions — not decoration. Enemies, objects and projectiles share one damage pipeline so chain reactions fall out naturally.               |
| **C. Funky dynamic soundtrack**               | No audio files are available, so music is synthesised. Needs a real sequencer with per-layer gain control so music can react to gameplay (boss intensity, transformation stingers, secret-room variations). |

Everything else (more worlds, characters, co-op) is content layered onto those systems.

### The game

- **Title:** GUNK FUNK
- **Premise:** Disgraced hygiene scientist **Professor Stinkbottom** dumps his experimental
  _Funk Juice_ into the city sewers to turn the world as gross as he is. A handful of
  accidental mutants crawl out of the muck to stop him — mostly by accident.
- **Hero #1 (vertical slice): BULGO** — a lumpy green mutant with a gigantic upper body,
  tiny legs, mismatched eyes and boundless dim enthusiasm. Body-based attacks (stretchy
  punches, belly bounces). Special: inflates into a **Wrecking Ball**.
- **Later heroes:** **SLICKWICK** the Grease Goblin (speed, ricochets, grease tornado) and
  **KING REFUSE** the Garbage King (junk weapons, garbage-monster transformation).
- **World 1 — The Sewer of Doom**, Stage 1 _"Flush Hour"_: mini-boss **THE CLOG** (a
  sentient hairball), boss **Professor Stinkbottom in the Flush-o-Tron 3000** (a toilet mech
  that breaks apart mid-fight).

---

## 2. Technology

| Concern                | Choice                                              | Why                                                                                                                                   |
| ---------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Engine                 | **Phaser 3.90.0** (final 3.x)                       | Spec asks for Phaser 3. Mature Arcade Physics + tilemaps, huge documentation base. Phaser 4 exists; migration can be evaluated later. |
| Language               | **TypeScript** (strict)                             | Spec requirement; needed for a codebase this size.                                                                                    |
| Build / dev server     | **Vite**                                            | Fast HMR, trivial static build output.                                                                                                |
| Lint / format          | **Oxlint + Oxfmt**                                  | Organisation standard.                                                                                                                |
| Unit tests             | **Vitest**                                          | Pure-logic modules (raster library, level parser, sequencer, input buffer, state machines).                                           |
| Smoke / gameplay tests | **Playwright** (pre-installed Chromium)             | Boots the real game headless, drives input, captures screenshots, fails on console errors.                                            |
| Physics                | Phaser **Arcade Physics**, fixed 60 Hz step         | Platformers need AABB + tile collision, not rigid bodies. Fixed step keeps jumps identical on 60/120/144 Hz monitors.                 |
| Audio                  | **Custom Web Audio engine** (bypasses Phaser sound) | All music/SFX are synthesised at runtime; needs sample-accurate scheduling.                                                           |
| Persistence            | `localStorage` behind a small save module           | Settings, high scores, unlocks.                                                                                                       |

---

## 3. Rendering approach

- **Internal resolution 384 × 216** (16:9, 16 px tiles → 24 × 13.5 tiles visible). Close to
  the Genesis 320 × 224 feel while fitting modern screens. Scales exactly ×5 to 1080p.
- `pixelArt: true`, `roundPixels: true`, CSS `image-rendering: pixelated` → no smoothing,
  ever. Sprites never rotate/scale by non-integer amounts except deliberate squash-and-stretch
  effects.
- Phaser `Scale.FIT` by default; an **integer-scale** option in Options for pixel purists
  (non-integer FIT can make some pixel columns one screen-pixel wider than others).
- Parallax: 3–4 background layers per world, generated as tileable strips, scrolled with
  `scrollFactor`.
- A deliberately limited palette per world (≈ 32–48 colours) so the game reads as 16-bit.

---

## 4. Asset pipeline — _code-authored pixel art_

**Limitation:** I cannot paint in Aseprite. Using generic placeholders or static
illustrations is ruled out by the spec. The pipeline is therefore _pixel art authored in
code_ — still real sprite sheets with real frames, drawn at native resolution:

1. **Raster library** (`src/art/pixel/`) — an indexed-colour pixel canvas with
   pixel-exact primitives: Bresenham lines, filled ellipses, polygons, capsules,
   **Bayer dithering**, **ramp shading** (light-direction shading with dithered transition
   bands), and an **automatic outline pass** (dark 1-px outline, "sel-out" style).
   No anti-aliasing exists anywhere in the pipeline.
2. **Sprite rigs** (`src/art/sprites/…`) — each character is a parametric puppet (head,
   torso, arms, legs, eyes, mouth) drawn per frame from a _pose_. An animation is a list of
   poses. This gives consistent proportions across every frame and makes squash-and-stretch,
   anticipation and overshoot cheap to author.
3. **Hand-authored pixel maps** — small ASCII grids for details a rig can't express well
   (faces, icons, items, font glyphs, tile decorations).
4. **Texture registry** — at boot, every sheet is rasterised into a Phaser spritesheet
   texture and its animations registered. Generation of the whole game's art takes
   milliseconds, so there is no build step and assets can never go stale.
5. **Review export** — `npm run art:export` renders every sheet to PNG in `art-export/`
   so sheets can be reviewed as images (and so a human artist can later paint over them).

**Future option:** a loader override that prefers a hand-painted PNG in
`public/assets/sprites/<key>.png` over the generated sheet, allowing a gradual move to
artist-made assets without code changes.

---

## 5. Audio architecture

- **Engine** (`src/audio/engine`) — one `AudioContext`, master → compressor → output,
  separate music and SFX buses with user volume. Unlocked on the first key/click
  ("PRESS START" doubles as the unlock gesture — browsers block audio before that).
- **Instruments** (`src/audio/instruments`) — synthesised voices: **slap bass** (filtered
  saw/square with a fast filter "pop" and click transient — the star of the show),
  **drum kit** (pitch-drop kick, noise snare, hats, clap), **funk guitar/clav**
  (pulse wave through an envelope-filter "wah"), **lead synth**, **brass stab**, **organ**.
- **Sequencer** (`src/audio/music`) — lookahead scheduler (Web Audio clock, not
  `setTimeout` timing), 16th-note grid with swing, songs defined as data (patterns +
  arrangement). Each song has named **layers** (drums, bass, chords, lead, intensity) whose
  gains can be faded at runtime → **dynamic music**: intensity rises for bosses, stingers
  duck the band, secret rooms switch to a variation.
- **SFX** (`src/audio/sfx`) — named procedural recipes (`punch`, `splat`, `squeak`,
  `burp`, `boing`, `explode`, …) with per-play pitch/timbre randomisation so repetition
  doesn't grate. Character "voices" are synthesised gibberish blabber + speech bubbles.

**Limitation:** I cannot listen to the output. Audio is verified by rendering through an
`OfflineAudioContext` (levels, clipping, silence detection), but musical taste needs your
ears — expect a feedback round on the soundtrack.

---

## 6. Code architecture

```
src/
  main.ts                 Phaser game config + scene list
  config/                 Resolution, physics tuning, gameplay constants
  core/
    input/                Action-based input (keyboard + gamepad), per-player, buffered
    save/                 localStorage persistence (settings, scores, unlocks)
    events.ts             Typed cross-system event names
  art/
    pixel/                Raster library (canvas, primitives, dither, shading, outline)
    palettes.ts           Named colour ramps per world/character
    sprites/<entity>/     Rig + animation definitions per character/enemy/item/fx
    tiles/                Tileset generators per world
    backgrounds/          Parallax layer generators
    fonts/                Bitmap pixel font
    texture-registry.ts   Builds every texture + animation into Phaser at boot
  audio/
    engine/  instruments/  music/  sfx/
  gameplay/
    player/               Player entity, movement controller, form (transformation) system
    characters/           CharacterDefinition data (Bulgo, …)
    combat/               Hitboxes, damage pipeline, knockback, hit-stop, combos
    weapons/              Weapon definitions, projectiles, pooling, upgrades
    powerups/             Power-up definitions + timers
    enemies/              Enemy base + one module per enemy type
    bosses/               Boss state machines
    environment/          Interactive / destructible objects
    fx/                   Particles, screen shake, hit sparks, popups
    camera/               Camera director (look-ahead, boss framing, co-op ready)
  levels/
    level-format.ts       Level data types
    level-loader.ts       ASCII map → tilemap + entity spawns
    data/                 One module per stage
  scenes/                 Boot, Title, CharacterSelect, Level, Hud, Pause, Results, GameOver, Options…
  ui/                     Bitmap text, menu widgets, HUD components
tests/
  unit/                   Vitest
  e2e/                    Playwright smoke + gameplay scripts
tools/                    art export, misc dev scripts
```

### Key design decisions

- **One damage pipeline.** Everything that can hurt or be hurt implements `Damageable`
  (`takeHit(hit: HitInfo)`). Player attacks, projectiles, explosions, hazards and
  _launched enemies_ all produce `HitInfo`. This is what makes chain reactions and
  "enemy bowling" work without special cases.
- **Player = entity + controller + form.** The controller owns tight-platformer physics
  (coyote time, jump buffering, variable jump height, apex hang, wall jump, slide). A _form_
  (normal Bulgo, Wrecking Ball, …) supplies sprite set, hitbox, physics overrides and attack
  set. Transformations swap the form; nothing else needs to know.
- **Data-driven content.** Characters, weapons, power-ups, enemies and levels are
  definitions registered in tables. Adding content means adding a module, not editing the
  engine.
- **Co-op ready, not co-op built.** Input is per player index, players live in a list,
  the camera director tracks N targets. Single-player ships first.
- **Object pooling** for projectiles, particles and popups (Phaser groups with
  `maxSize`, recycled via `setActive/setVisible`).
- **Levels as ASCII.** Stages are authored as text grids with a legend (tiles + spawns),
  auto-tiled at load. Readable in code review, diffable, and quick to iterate. Tiled/LDtk
  import can be added later if a level designer joins.
- **Test hooks.** In dev builds with `?debug`, a small `window.gunkDebug` API exposes game
  state to Playwright (player position, scene, spawn helpers) and an overlay shows hitboxes.

---

## 7. Milestones

Each milestone ends with: format + lint + typecheck + unit tests + Playwright smoke test +
visual check of screenshots, and an update to `CHECKLIST.md`.

| #       | Milestone                   | Exit criteria                                                                                                                                                         |
| ------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M0**  | Plan, scaffold, tooling     | This doc, README, checklist; `npm run dev/build/test/lint` all work.                                                                                                  |
| **M1**  | Core engine                 | Pixel-perfect scaling, input (kbd + pad), raster library, tile/level loader, camera, parallax, tight movement physics in a test level.                                |
| **M2**  | Bulgo, fully animated       | Full sprite sheet (idle, walk, run, jump, fall, land, crouch, slide, 3-hit combo, shoot, hurt, special, transform, victory, death), health/lives/respawn, quips.      |
| **M3**  | Audio foundation            | Synth instruments, sequencer, Sewer theme with prominent slap bass, dynamic layers, core SFX set.                                                                     |
| **M4**  | Combat & weapons            | Damage pipeline, hit-stop, knockback, particles; Sock Cannon, Snot Blaster, Chicken Launcher with 3 upgrade levels each; switching.                                   |
| **M5**  | Enemies                     | Sewer Rat, Toilet Chomper, Sludge Blob (splits), Turnip Grenadier (lobs), Disco Roach (swoops); enemy bowling.                                                        |
| **M6**  | Interactive world           | Launch toilets, toxic barrels (chain reactions), vending machine (topples onto enemies), hydrants, vent fans, crates, cracked walls, sludge hazard, moving platforms. |
| **M7**  | Power-ups & transformations | Wrecking Ball transformation, Infinite Socks, Hyper Grease (slippery trail), stingers.                                                                                |
| **M8**  | Stage 1-1 "Flush Hour"      | Full level: secrets, alt route, collectibles, weapon caches, mini-boss The Clog.                                                                                      |
| **M9**  | Boss                        | Professor Stinkbottom / Flush-o-Tron 3000: intro, 3 phases, arena destruction, defeat sequence.                                                                       |
| **M10** | Presentation                | Animated title, character select, HUD, pause, options, results, game over, high scores.                                                                               |
| **M11** | Vertical-slice polish       | Balance, juice, secrets, performance pass, controller pass, bug bash.                                                                                                 |
| later   | Expansion                   | Bonus stages, Slickwick & King Refuse, Worlds 2–5, costumes, achievements, co-op.                                                                                     |

---

## 8. Technical limitations & risks

1. **No hand-painted art.** Pixel art is authored in code (rigs + pixel maps). It will be
   genuine frame-by-frame pixel art, but the ceiling is below a dedicated pixel artist. I
   review rendered sheets as images and iterate. The pipeline leaves room for real artists.
2. **No recorded audio.** No slap-bass samples or voice actors — everything is synthesised.
   Synth slap bass can sound great in a 16-bit context (that _is_ how 16-bit consoles did
   it), but it's an approximation. Voices are gibberish blabber + speech bubbles.
3. **I can't hear the audio.** Verified numerically, not by ear. Plan a listening pass.
4. **Browser autoplay rules.** Audio can't start until a key press/click. The title screen
   is designed around this.
5. **Gamepads.** The browser Gamepad API only exposes a pad after a button press, and only
   "standard" mappings are reliable. Keyboard is the primary scheme; Xbox/PlayStation pads
   on standard mapping are supported.
6. **Headless testing ≠ real performance.** Playwright runs Chromium with software WebGL in
   the container; it checks correctness and catches errors, not real-world frame rates.
7. **Non-integer scaling.** At arbitrary window sizes some pixels render 1 screen-px wider.
   Integer scaling is offered as an option.
8. **Scope.** The full spec is many months of work for a team. This plan delivers a
   polished slice first and expands in content milestones.
9. **Ephemeral environment.** This runs in a cloud container with no git remote yet. Work
   must be pushed to a repository to persist.
