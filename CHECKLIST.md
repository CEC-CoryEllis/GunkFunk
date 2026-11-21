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
- [x] Level-design lint: every stage is checked for ledges with too little headroom to jump onto (unit test); the wall-jump shaft climb is covered by the smoke test
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

- [x] Enemy framework (`src/gameplay/enemies/enemy.ts`): physics, hurtboxes with headroom, flash, stun, slime slow-down, knockback scaled by weight, contact damage, hazard deaths, knockout "pop" with comic word
- [x] Tumbling: knockouts and heavy hits launch enemies, which bowl over other enemies (chain reactions)
- [x] Sewer Rat: patrols, spots you, rears up, charges — and trips 25% of the time
- [x] Toilet Chomper: hops and bites; closed lid blocks frontal socks and jabs ("CLANK!"); open lid, attacks from behind, explosions, launched enemies and the mega punch get through
- [x] Sludge Blob: hops; a hit splits a big blob into two small ones; immune to sludge; Snot Blaster heals it ("YUM!")
- [x] Turnip Grenadier: lobs stink bombs on true ballistic arcs (unit-tested solver), panics and hops away up close
- [x] Disco Roach: hovers in a figure-of-eight, strikes a disco pose, dive-bombs, climbs back; only dangerous mid-swoop
- [x] Kill combo: knockouts within 2.5 s multiply points up to ×5 with a "COMBO ×N" popup (unit tested)
- [x] Dynamic music: the full band joins when two or more enemies are near Bulgo, backs off 4 s after (unit tested)
- [x] Crouch-shooting (Down + shoot) so short enemies can be hit; lower jab hitbox
- [x] Level markers `R` `T` `B` `G` `F`; enemies placed across the test stage; Training Arena sandbox (`?debug&stage=arena`)
- [x] e2e enemy test (`tests/e2e/enemies.mjs`): one scenario per enemy, bowling, combo, hazards

## M6 — Interactive world

- [x] Prop framework (`src/gameplay/props/`): `PropContext` (launch / lift / carry / heal the player, spawn items, lift enemies, report gems and secrets), shared `BreakableProp` base on the "neutral" team, and a new "environment" team whose hits (blasts, toppling machines) hurt everyone — chain reactions come from the shared damage pipeline
- [x] Prop art: items (burger snack, mystery-meat feast, Funk Gem), crate, toxic barrel + fuse flash, trash can (wobble / tipped), hydrant, Snack-O-Matic (+ cracked), launch toilet + geyser flush, vent fan, moving platform; new splinter / water / junk / brick particles; cracked brick tiles
- [x] Crate: breaks in 3 hits (or one big one), always drops a snack
- [x] Toxic barrel: fuse (0.7 s, 0.22 s when caught in a blast) then an environment explosion — barrels chain down a row and hurt Bulgo too
- [x] Trash can: tips over spilling a surprise — snack, Funk Gem or a rat (weighted table, unit tested)
- [x] Snack-O-Matic: each whack shakes a snack loose; broken, it topples away from the hit and crushes whatever is there (enemies, Bulgo, props), spilling a feast
- [x] Launch toilet: land on the seat → geyser flush launches ~8.5 tiles and refunds the double jump
- [x] Hydrant: punch the cap off → 4 s water jet that shoves enemies down the corridor (onto spikes, into sludge)
- [x] Vent fan: 6-tile updraft for Bulgo and enemies; tapering wind + air drag so you hover near the top instead of yo-yoing (lift and drag unit tested)
- [x] Moving platforms (`==` between `:` stops, sideways or up/down; path finding unit tested): one-way from above, carries riders both ways
- [x] Cracked walls (`%`): solid until a heavy hit (combo finisher, Mega Punch, explosion, bowled enemy) — otherwise "TINK!"; the wall's region crumbles and re-autotiles
- [x] Secret areas (`*`): hidden under a fake-brick cover (neighbours autotile as if solid) that fades when you step in; first visit = stinger + 1000 bonus + banner, lounge music while inside, stage music when you leave
- [x] Items: snacks heal 1, feasts heal 3 (100 points if already full); dropped food bounces and spoils after 12 s; gems score 500 and count on the HUD
- [x] Props placed across the test stage (crates, can, barrels, vending machine, toilet shortcut, hydrant by the spikes, platform over the spikes, fan up to the end grate, secret lounge behind the end wall); Training Arena gains a secret room
- [x] e2e prop test (`tests/e2e/props.mjs`): every prop, chain reactions, crushing, riding, hovering, wall + secret + music

## M7 — Power-ups & transformations

- [x] Power-up framework (`src/gameplay/powerups/`): definitions, timers that stack and refresh (unit tested), sunburst pickups (`w` `i` `g`), banner + stinger on pickup, HUD timer icons with draining bars that blink near the end, quips
- [x] Wrecking Ball (12 s) — the first transformation, built as a _form_ that takes over Bulgo's sprite and body:
  - own 40×40 sheet: eight true pixel-art roll frames (face and spots turn with the ball), squash, ground pound, inflate, deflate; Bulgo's own `inflate` animation leads in
  - pure `BallController` (unit tested): heavy rolling momentum, rubbery floor and wall bounces, big bouncy jump, ground pound with rebound, rides fans and launch toilets
  - anything rolled into at speed is bowled over (enemies tumble into others, props break); hard enough smashes cracked walls; ground pound sends a radial shockwave
  - immune to enemies, spikes and sludge (bounces off them); explosions pop it early ("POP!") at no health cost; flashes in its last 2.5 s, then deflates ("PFFFT!") with a grace period
  - the full band plays while transformed
- [x] Infinite Socks (15 s): equips the Sock Cannon, free ammo, ~2× fire rate
- [x] Hyper Grease (12 s): 1.55× run speed with slippery stopping and turning; drips and leaves glossy slicks that make grounded enemies slip and tumble (bowling others over), fading after 5 s
- [x] Power-ups stack, refresh on re-collect, and all end on death
- [x] Placed in the test stage: Wrecking Ball above the second step (roll across the sludge pit into the dummy row), Infinite Socks atop the wall-jump shaft, Hyper Grease before the barrels and slide tunnel
- [x] `player.ts` kept reviewable: body shape (`player-shape.ts`), attack resolution (`player-attacks.ts`) and power-up orchestration (`player-transformations.ts`) extracted
- [x] e2e power-up test (`tests/e2e/powerups.mjs`)

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
- `player.ts` (~470 lines) is orchestration only; the death/respawn lifecycle is the next thing to extract if it grows further. Hazard detection now lives in `LevelWorld.hazardAt`, shared with enemies; the player keeps only its bounce-and-quip reaction.
- Enemy AI has only been tuned against scripted tests and screenshots — it needs a hands-on difficulty pass (M11).
- Enemies, projectiles and dropped items don't collide with moving platforms (only Bulgo rides them); items also fall through one-way grates. Fine for the test stage; revisit when M8 needs it.
- Moving platforms are always two tiles wide (`==`).
- The Wrecking Ball can't climb ladders or wall-jump; if it rolls somewhere only Bulgo can leave, you wait out the timer.
