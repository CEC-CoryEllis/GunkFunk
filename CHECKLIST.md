# Development Checklist

Legend: `[x]` implemented **and tested** · `[~]` partially done (see note) · `[ ]` not started.
A box is only ticked after it has been exercised by a unit test, the e2e smoke test, or a
visual review of rendered output. Architecture: [`docs/DEVELOPMENT_PLAN.md`](docs/DEVELOPMENT_PLAN.md).

## M0 — Plan, scaffold, tooling

- [x] Development plan (architecture, pipeline, milestones, limitations)
- [x] Vite + TypeScript (strict) + Phaser 3.90 scaffold
- [x] Oxlint + Oxfmt + Vitest + Playwright scripts (`npm run check`, `npm run test:e2e`)
- [x] README

## M1 — Core engine

- [x] 384×216 internal resolution, pixel-perfect rendering, FIT scaling
- [ ] Integer-scaling option (Options menu, M10)
- [x] Pixel-art raster library: shapes, dithered ramp shading, auto-outline, pixel maps, sheet packing (unit tested)
- [x] PNG review export (`npm run art:export`)
- [x] Texture registry: sheets → Phaser textures + animations at boot
- [x] Action-based input: keyboard (by physical key) + standard gamepad, per-player, scripted input for tests
- [x] ASCII level format + parser with validation (unit tested)
- [x] Autotiled sewer tileset (16 edge masks + interior variants), one-way grates, ladders, spikes
- [x] Animated toxic sludge hazard
- [x] 3-layer parallax background
- [x] Camera director: look-ahead, platform-snapped vertical follow, bounds, multi-target ready
- [x] Gameplay on the fixed 60 Hz physics step (refresh-rate independent)
- [x] Movement: accel/decel, skid turns, variable jump, apex hang, fast-fall, coyote time, jump buffer, double jump, wall slide/jump, crouch, slide, ladders, drop-through (unit + e2e tested)
- [x] Engine test stage "Pipe Dream Proving Grounds"
- [x] `?debug` overlay + `window.gunkDebug` test hooks

## M2 — Bulgo, fully animated

- [x] Posable rig: gorilla torso, bulldog head with mismatched eyes and underbite fangs, stretchy arms, stubby legs, shorts, high-tops
- [x] Expressions: 7 eye styles, 4 brows, 8 mouths; props (sweat, stars, booger, motion lines, heart)
- [x] 25 animations / 123 frames: idle, bored (nose-pick + flick), walk, run, skid, jump, fall, double-jump spin, land, crouch, slide, wall slide, climb, jab, uppercut, belly bump, air punch, shoot, charge, hurt, talk, victory dance, death melt, respawn, inflate
- [x] Health (6-segment gut meter), invulnerability flicker, knockback, hazard bounce
- [x] Lives, death → melt → respawn at checkpoint, game over screen
- [x] Speech-bubble quips with gibberish voice, cooldowns and no immediate repeats
- [x] Punch combo lands hits through the shared damage pipeline (M4)
- [~] `talk`, `inflate`, `victory` animations exist but are wired up in M7/M8 (`shoot` and `charge` are live as of M4)

## M3 — Audio foundation

- [x] Web Audio engine: lazy context, unlock on first input, music / stinger / SFX buses, compressor + soft limiter (render-tested, peaks ≤ -2 dBFS)
- [x] Instruments: slap bass (slap, pop, dead note, slide, hammer-on), drum kit + hand percussion, clav with wah, distorted guitar, pulse lead, brass, trombone, organ, vibraphone, e-piano
- [x] Tracker-style pattern notation, song compiler, lookahead scheduler with swing (unit tested)
- [x] 6 songs: title, select, sewer (3 intensity layers), secret-room elevator muzak, miniboss, boss (3 intensity layers)
- [x] 10 stingers and 58 cartoon SFX recipes with per-play variation and voice caps
- [x] Dynamic music: layer crossfades, stinger ducking (-10 dB), pause muffle (render-tested)
- [x] Sound Test dev page (`sound-test.html`); render test exports every cue as WAV to `audio-export/`
- [x] Wired into the game: title theme, sewer theme (intensity 1), movement / punch / hurt / death SFX, death and game-over stingers, gibberish quip voices, menu sounds, pause muffle (e2e checks music is playing)
- [ ] **Human listening pass** — audio has only been verified numerically and by spectrogram
- [ ] In-game Sound Test menu entry (M10)

## M4 — Combat & weapons

- [x] Shared damage pipeline: `HitInfo` / `Damageable` / `CombatWorld` (team filtering, once-per-swing keys, radial explosion knockback, proximity checks, homing queries) — unit tested
- [x] Hit presentation: real hit-stop (freezes physics and animation), shake scaled by impact, sparks, comic sound words ("POW!", "BAWK!"), score popups
- [x] Sock Cannon: straight socks with heavy knockback → L2 double barrel → L3 triple-barrel spread (+1 damage)
- [x] Snot Blaster: bouncing globs that slime targets → L2 mega-globs (+1 damage) → L3 globs split in two on their first bounce
- [x] Chicken Launcher: arcing rubber chickens with a proximity fuse that explode into feathers → L2 two chickens → L3 three homing chickens
- [x] Inventory: collect / upgrade / ammo cap / cycle (unit tested); trigger auto-repeat and empty click (unit tested); pooled projectiles with pure, unit-tested flight and bounce physics
- [x] Weapon pickups (floating soap bubbles), level spawn markers `s` / `n` / `c`, pickup banner, upgrade quips and stinger
- [x] Held weapon sprite pinned to Bulgo's fist through every shooting frame (per-frame hand anchors); run-and-gun and air-shooting animations
- [x] HUD weapon box: icon, level pips, ammo, name flash
- [x] Charged mega punch: hold punch to wind up, flash when ready, release for a 4-damage stretchy haymaker
- [x] Training dummy ("Crash-Test Rat"): wobble and slime reactions, head pops off on KO and bowls over the next dummy, respawns — level marker `D`
- [x] e2e combat test (`tests/e2e/combat.mjs`): pickups, upgrades, all three weapons, switching, charge punch, bowling

## M5 — Enemies

- [ ] Sewer Rat, Toilet Chomper, Sludge Blob (splits), Turnip Grenadier (lobs), Disco Roach (swoops)
- [~] Enemy bowling: the launched-object hit kind exists and works for dummy heads; real enemies still to come

## M6 — Interactive world

- [ ] Launch toilets, toxic barrels with chain reactions, vending machine (topples), hydrants, vent fans
- [ ] Crates, cracked walls hiding secrets, moving platforms

## M7 — Power-ups & transformations

- [ ] Wrecking Ball transformation (own sprite sheet, physics, attacks, stinger)
- [ ] Infinite Socks, Hyper Grease (slippery trail)

## M8 — Stage 1-1 "Flush Hour"

- [ ] Full stage layout, secrets, alternate route, collectibles, weapon caches, checkpoints
- [ ] Mini-boss: The Clog

## M9 — Boss

- [ ] Professor Stinkbottom / Flush-o-Tron 3000: intro, 3 phases, arena destruction, defeat

## M10 — Presentation

- [~] Title screen (bouncing logo, dancing Bulgo, menu, controls panel) — full animated attract-mode version pending
- [x] HUD: portrait, health, lives, counting score
- [x] Pause menu (resume / restart / quit)
- [x] Game over screen
- [ ] Character select, options (volume, integer scaling), results screen, high scores, save data

## M11 — Vertical-slice polish

- [ ] Balance, performance pass, controller pass, bug bash

## Later

- [ ] Bonus stages · Slickwick & King Refuse · Worlds 2–5 · costumes · achievements · local co-op

## Known issues / temporary assets

- None of the art is temporary — all sprites, tiles, backgrounds and the font are final-pipeline generated art, though they will keep being refined.
- `player.ts` (~410 lines) is orchestration only; hazard handling moves to a shared module in M5, when enemies need it too.
