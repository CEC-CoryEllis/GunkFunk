/**
 * End-to-end interactive-world test (M6), run in the Training Arena. Props are
 * spawned through the debug hooks into separate stretches of the arena; the
 * cracked wall and secret lounge are part of the arena map itself.
 *
 *   node tests/e2e/props.mjs
 */
import { createReport, openGame, screenshotDir, startVite } from "./harness.mjs";

const PORT = 5196;
const OUT = screenshotDir("props");
const FLOOR = 192; // arena floor (row 12)
const report = createReport();
/** Props of a kind within `range` px of x. */
const near = (list, x, range = 40) => list.filter((p) => Math.abs(p.x - x) < range);
const { check } = report;

async function run() {
  const vite = await startVite(PORT);
  const game = await openGame(PORT, { stage: "arena" });
  const { page, wait, player, hold, release, tap, shot } = game;
  const hook = (fn, arg) => page.evaluate(fn, arg);
  const props = () => hook(() => window.gunkDebug.props());
  const propsOf = async (kind) => (await props()).filter((p) => p.kind === kind);
  const enemies = () => hook(() => window.gunkDebug.enemies());
  const session = () => hook(() => window.gunkDebug.session());
  const score = () => hook(() => window.gunkDebug.score());
  const spawnProp = (kind, x, surprise) =>
    hook(([k, px, s]) => window.gunkDebug.spawnProp(k, px, 192, s), [kind, x, surprise]);
  const spawnEnemy = (kind, x, y = FLOOR) =>
    hook(([k, ex, ey]) => window.gunkDebug.spawnEnemy(k, ex, ey), [kind, x, y]);

  /** Fresh scenario: no enemies, Bulgo at the given health, standing at x facing right. */
  async function reset(x, health) {
    await hook(() => window.gunkDebug.clearEnemies());
    await hook((h) => window.gunkDebug.heal(h), health);
    await hook(([px, py]) => window.gunkDebug.teleport(px, py), [x, FLOOR]);
    await tap("right", 30);
    await wait(250);
  }

  /** Three quick attack taps: jab, uppercut, haymaker (impact 1). */
  async function combo() {
    for (let i = 0; i < 3; i++) {
      await tap("attack", 40);
      await wait(i === 2 ? 450 : 110); // inside the chain window even without hit-stop
    }
  }

  try {
    await game.startStage();
    await wait(2300);

    // ── Crate: three hits splinter it and a snack heals ─────────────────────
    await reset(56, 4);
    await spawnProp("crate", 78);
    await combo();
    check("combo smashes a crate", (await propsOf("crate")).length === 0);
    await wait(700); // let the snack bounce to a stop
    const snacks = near(await propsOf("snack"), 78, 80);
    check("a snack pops out of the crate", snacks.length === 1, JSON.stringify(snacks));
    if (snacks[0]) {
      await hook(([px, py]) => window.gunkDebug.teleport(px, py), [snacks[0].x, FLOOR]);
      await wait(300);
    }
    check("eating the snack heals Bulgo", (await player()).health === 5);
    await shot(OUT, "01-crate");

    // ── Trash cans: a tenant and a treasure ────────────────────────────────
    await reset(136);
    await spawnProp("trashCan", 158, "rat");
    await tap("attack", 40);
    await wait(400);
    check(
      "trash can tips over",
      (await propsOf("trashCan")).some((t) => t.state === "broken"),
    );
    check(
      "a rat jumps out of the can",
      (await enemies()).some((e) => e.kind === "rat"),
    );
    await reset(136);
    const scoreBeforeGem = await score();
    await spawnProp("trashCan", 158, "gem");
    await tap("attack", 40);
    await wait(500);
    const gem = near(await propsOf("gem"), 158, 80)[0];
    check("another can spills a Funk Gem", gem !== undefined);
    if (gem) await hook(([px, py]) => window.gunkDebug.teleport(px, py), [gem.x, FLOOR]);
    await wait(300);
    check("picking up the gem counts it", (await session()).gems === 1);
    check("gems are worth 500", (await score()) - scoreBeforeGem >= 500);
    await shot(OUT, "02-trash");

    // ── Toxic barrels: chain reaction that hurts everyone nearby ────────────
    await reset(232);
    for (const x of [254, 280, 306]) await spawnProp("barrel", x);
    const turnip = await spawnEnemy("turnip", 332);
    await tap("attack", 40);
    await wait(250);
    await tap("attack", 40);
    await wait(150);
    check(
      "a broken barrel lights its fuse",
      (await propsOf("barrel")).some((b) => b.state === "lit"),
    );
    await shot(OUT, "03-barrel-fuse");
    await wait(1600);
    check("barrels chain-explode down the row", (await propsOf("barrel")).length === 0);
    const turnipAfter = (await enemies()).find((e) => e.id === turnip);
    check(
      "the blast knocks out the enemy past the last barrel",
      !turnipAfter || turnipAfter.health <= 0,
      JSON.stringify(turnipAfter),
    );
    check("the blast hurts Bulgo too (environment team)", (await player()).health < 6);
    await shot(OUT, "04-barrel-chain");

    // ── Vending machine: dispenses, then topples onto an enemy ─────────────
    await reset(360);
    await spawnProp("vending", 384);
    const victim = await spawnEnemy("turnip", 428);
    let dispensed = 0;
    for (let i = 0; i < 6 && (await propsOf("vending"))[0]?.state === "intact"; i++) {
      await combo();
      dispensed = Math.max(dispensed, near(await propsOf("snack"), 384, 90).length);
    }
    check("whacking the machine shakes snacks loose", dispensed >= 1, `${dispensed} snacks`);
    check("the machine breaks", (await propsOf("vending"))[0]?.state === "broken");
    await wait(700);
    await shot(OUT, "05-vending-topple");
    const victimAfter = (await enemies()).find((e) => e.id === victim);
    check(
      "it topples onto the enemy behind it",
      !victimAfter || victimAfter.health <= 0,
      JSON.stringify(victimAfter),
    );
    check("the crash spills a feast", near(await propsOf("feast"), 420, 100).length >= 1);

    // ── Hydrant: the jet shoves enemies away ───────────────────────────────
    await reset(488);
    await spawnProp("hydrant", 508);
    const pushed = await spawnEnemy("turnip", 548);
    await wait(200);
    const startX = (await enemies()).find((e) => e.id === pushed)?.x ?? 0;
    await tap("attack", 40);
    await wait(250);
    check(
      "punching the hydrant starts the spray",
      (await propsOf("hydrant"))[0]?.state === "spraying",
    );
    await shot(OUT, "06-hydrant");
    let furthest = startX;
    for (let i = 0; i < 12; i++) {
      await wait(100);
      const e = (await enemies()).find((en) => en.id === pushed);
      if (e) furthest = Math.max(furthest, e.x);
    }
    check(
      "the spray shoves the enemy down the corridor",
      furthest - startX > 20,
      `${Math.round(furthest - startX)} px`,
    );

    // ── Vent fan: lifts Bulgo and enemies ──────────────────────────────────
    await reset(540);
    await spawnProp("fan", 600);
    await hold("right");
    await wait(450);
    await release("right");
    let highest = FLOOR;
    for (let i = 0; i < 15; i++) {
      await wait(100);
      highest = Math.min(highest, (await player()).y);
    }
    check(
      "the updraft catches Bulgo walking over it",
      FLOOR - highest > 30,
      `${FLOOR - highest} px`,
    );
    await hook(([px, py]) => window.gunkDebug.teleport(px, py), [600, FLOOR]);
    await wait(1500);
    const hover = FLOOR - (await player()).y;
    check("Bulgo hovers at the top of the column", hover > 50 && hover < 110, `${hover} px`);
    await shot(OUT, "07-fan");
    await reset(520);
    const floater = await spawnEnemy("turnip", 600);
    await wait(900);
    const floaterAfter = (await enemies()).find((e) => e.id === floater);
    check(
      "enemies drift up in the updraft",
      floaterAfter && FLOOR - floaterAfter.y > 30,
      JSON.stringify(floaterAfter),
    );

    // ── Launch toilet: land on the seat, get flushed sky-high ──────────────
    await reset(140);
    await spawnProp("launchToilet", 200);
    await hook(() => window.gunkDebug.clearEnemies());
    await hook(([px, py]) => window.gunkDebug.teleport(px, py), [203, FLOOR - 60]);
    let peak = FLOOR;
    for (let i = 0; i < 12; i++) {
      await wait(80);
      peak = Math.min(peak, (await player()).y);
    }
    check("the toilet launches Bulgo way up", FLOOR - peak > 120, `${FLOOR - peak} px`);
    await shot(OUT, "08-toilet");

    // ── Moving platforms: carried sideways and down ────────────────────────
    await reset(40);
    await hook(() => window.gunkDebug.spawnPlatform(4, 8, 14, 8));
    await wait(100);
    await hook(([px, py]) => window.gunkDebug.teleport(px, py), [80, 126]);
    await wait(300);
    const startRide = await player();
    await wait(1800);
    const endRide = await player();
    check(
      "Bulgo rides the sideways platform",
      endRide.x - startRide.x > 40,
      `${Math.round(endRide.x - startRide.x)} px`,
    );
    check("…standing on top of it", Math.abs(endRide.y - 128) <= 3, `y ${endRide.y}`);
    await shot(OUT, "09-platform");
    await hook(() => window.gunkDebug.spawnPlatform(20, 3, 20, 9));
    await wait(100);
    await hook(([px, py]) => window.gunkDebug.teleport(px, py), [336, 46]);
    await wait(1700);
    const lift = (await propsOf("platform")).find((p) => Math.abs(p.x - 336) < 4);
    const rider = await player();
    check(
      "a descending platform takes Bulgo down with it",
      lift !== undefined && lift.y > 70 && Math.abs(rider.y - lift.y) <= 3,
      `player ${rider.y} platform ${lift?.y}`,
    );

    // ── Cracked wall + secret lounge ───────────────────────────────────────
    await reset(744);
    await tap("attack", 40);
    await wait(400);
    check("a jab just goes TINK", (await propsOf("crackedWall"))[0]?.state === "intact");
    await wait(400);
    await combo();
    check(
      "a combo finisher crumbles the cracked wall",
      !(await propsOf("crackedWall")).some((w) => w.state === "intact"),
    );
    check(
      "the wall's tiles are gone",
      (await hook(() => window.gunkDebug.terrainAt(760, 180))) === "empty",
    );
    await shot(OUT, "10-wall");
    const gemsBefore = (await session()).gems;
    await hold("right");
    await wait(700);
    await release("right");
    await wait(300);
    check("walking in finds the secret", (await session()).secrets === 1);
    check("the secret's gem is collected", (await session()).gems === gemsBefore + 1);
    const track = (await hook(() => window.gunkDebug.audio())).track;
    check("lounge music plays in the secret", track === "secret_lounge", track);
    await shot(OUT, "11-secret");
    await hold("left");
    await wait(900);
    await release("left");
    await wait(200);
    check(
      "stage music returns on the way out",
      (await hook(() => window.gunkDebug.audio())).track === "sewer",
    );
  } finally {
    await game.browser.close();
    vite.stop();
  }
  report.finish(game.consoleErrors, OUT);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
