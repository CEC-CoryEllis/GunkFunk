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
- [~] Punch combo animates and produces timed hitboxes (visible with `?debug`); nothing to hit until enemies/objects exist (M4–M6)
- [~] `shoot`, `charge`, `talk`, `inflate`, `victory` animations exist but are wired up in M4/M7/M8

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

- [ ] Shared damage pipeline (`Damageable`, `HitInfo`), hit-stop, knockback reactions
- [ ] Sock Cannon, Snot Blaster, Chicken Launcher (3 upgrade levels each), switching, pooling
- [ ] Charged punch

## M5 — Enemies

- [ ] Sewer Rat, Toilet Chomper, Sludge Blob (splits), Turnip Grenadier (lobs), Disco Roach (swoops)
- [ ] Enemy bowling (launched enemies damage others)

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
