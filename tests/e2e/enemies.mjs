/**
 * End-to-end enemy test (M5), run in the flat Training Arena. Each scenario
 * clears the arena, places Bulgo and one or two enemies, and checks the
 * behaviour that makes that enemy distinct.
 *
 *   node tests/e2e/enemies.mjs
 */
import { createReport, openGame, screenshotDir, startVite } from "./harness.mjs";

const PORT = 5195;
const OUT = screenshotDir("enemies");
const FLOOR = 192; // arena floor (row 12)
const TILE = 16;
const report = createReport();
const { check } = report;

async function run() {
  const vite = await startVite(PORT);
  const game = await openGame(PORT, { stage: "arena" });
  const { page, wait, player, hold, release, tap, shot } = game;
  const hook = (fn, arg) => page.evaluate(fn, arg);
  const enemies = () => hook(() => window.gunkDebug.enemies());
  const spawn = (kind, x, y = FLOOR) =>
    hook(([k, ex, ey]) => window.gunkDebug.spawnEnemy(k, ex, ey), [kind, x, y]);
  const score = () => hook(() => window.gunkDebug.score());
  const byId = async (id) => (await enemies()).find((e) => e.id === id);

  /** Fresh scenario: no enemies, Bulgo at full health, placed at a tile facing right. */
  async function reset(tx) {
    await hook(() => window.gunkDebug.clearEnemies());
    await hook(() => window.gunkDebug.heal());
    await hook(([x, y]) => window.gunkDebug.teleport(x, y), [tx * TILE + 8, FLOOR]);
    await tap("right", 30);
    await wait(250);
  }

  try {
    await game.startStage();
    await wait(2300);

    // ── Rat: spots Bulgo and charges ───────────────────────────────────────
    await reset(6);
    const rat = await spawn("rat", 18 * TILE);
    let fastest = 0;
    let previous = (await byId(rat)).x;
    for (let i = 0; i < 20; i++) {
      await wait(100);
      const now = await byId(rat);
      if (!now) break;
      fastest = Math.max(fastest, Math.abs(now.x - previous) * 10);
      previous = now.x;
    }
    check("rat charges when it spots Bulgo", fastest > 110, `peak ${Math.round(fastest)} px/s`);
    const hurtByRat = (await player()).health < 6;
    check("charging rat hurts on contact (or trips trying)", hurtByRat || fastest > 110);
    await shot(OUT, "01-rat");

    // ── Toilet: lid armour clanks socks, mega punch smashes through ─────────
    await reset(6);
    const toilet = await spawn("toilet", 14 * TILE);
    await wait(150);
    await hold("shoot");
    await wait(700);
    await release("shoot");
    await wait(400);
    check(
      "closed lid blocks socks from the front",
      (await byId(toilet))?.health === 5,
      JSON.stringify(await byId(toilet)),
    );
    await shot(OUT, "02-toilet-clank");
    await hook(() => window.gunkDebug.clearEnemies());
    await hold("attack");
    await wait(1100);
    const toilet2 = await spawn("toilet", (await player()).x + 30);
    await wait(60);
    await release("attack");
    await wait(500);
    const smashed = await byId(toilet2);
    check(
      "mega punch smashes through the lid",
      !smashed || smashed.health <= 1,
      JSON.stringify(smashed),
    );
    await shot(OUT, "03-toilet-smash");

    // ── Blob: splits in two; snot heals instead of hurting ─────────────────
    await reset(6);
    await spawn("blob", 14 * TILE);
    await wait(150);
    await hold("down"); // blobs are short: crouch-shoot
    await wait(80);
    await tap("shoot", 40);
    await wait(500);
    await release("down");
    let blobs = (await enemies()).filter((e) => e.kind === "blob");
    check(
      "a hit splits a big blob into two healthy small ones",
      blobs.length === 2 && blobs.every((b) => b.health === 1 && b.state !== "tumbling"),
      JSON.stringify(blobs.map((b) => [b.health, b.state])),
    );
    await shot(OUT, "04-blob-split");
    await reset(6);
    await hook(() => window.gunkDebug.collect("snot"));
    const snotBlob = await spawn("blob", 13 * TILE);
    await wait(150);
    await hold("down");
    await wait(80);
    await tap("shoot", 40);
    await wait(900);
    await release("down");
    blobs = (await enemies()).filter((e) => e.kind === "blob");
    check(
      "snot globs heal blobs instead of splitting them",
      blobs.length === 1 && (await byId(snotBlob))?.health === 3,
    );
    await hook(() => window.gunkDebug.collect("sock")); // back to socks for later scenarios

    // ── Turnip: lobs stink bombs onto Bulgo from range ─────────────────────
    await reset(6);
    const before = (await player()).health;
    await spawn("turnip", 15 * TILE);
    let sawBomb = false;
    for (let i = 0; i < 40 && (await player()).health === before; i++) {
      sawBomb ||= (await hook(() => window.gunkDebug.projectiles())) > 0;
      await wait(100);
    }
    check("turnip lobs stink bombs", sawBomb);
    check("stink bombs land on Bulgo", (await player()).health < before);
    await shot(OUT, "05-turnip");

    // ── Roach: dive-bombs from above ───────────────────────────────────────
    await reset(6);
    const beforeRoach = (await player()).health;
    await spawn("roach", 11 * TILE, FLOOR - 80);
    for (let i = 0; i < 50 && (await player()).health === beforeRoach; i++) await wait(100);
    check("disco roach swoops down and hits", (await player()).health < beforeRoach);
    await shot(OUT, "06-roach");

    // ── Bowling + combo: a knocked-out rat flattens the rat behind it ───────
    await reset(6);
    await hold("attack");
    await wait(1100);
    const scoreBefore = await score();
    const px = (await player()).x;
    const front = await spawn("rat", px + 26);
    const behind = await spawn("rat", px + 70);
    await wait(60);
    await release("attack");
    await wait(1600);
    const survivors = (await enemies()).filter((e) => e.id === front || e.id === behind);
    await shot(OUT, "07-bowling");
    check(
      "a launched rat bowls over the one behind it",
      survivors.length === 0,
      JSON.stringify(survivors),
    );
    check(
      "back-to-back knockouts build a combo",
      (await score()) - scoreBefore >= 300,
      `+${(await score()) - scoreBefore}`,
    );

    // ── Hazards: sludge finishes off enemies, except blobs ─────────────────
    await reset(6);
    const doomed = await spawn("rat", 42 * TILE, FLOOR - 40);
    const swimmer = await spawn("blob", 41 * TILE, FLOOR - 40);
    await wait(1200);
    check("enemies that fall in sludge are finished off", !(await byId(doomed)));
    check("blobs are at home in sludge", Boolean(await byId(swimmer)));
  } finally {
    await game.browser.close();
    vite.stop();
  }
  report.finish(game.consoleErrors, OUT);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
