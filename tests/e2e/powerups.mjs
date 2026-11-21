/**
 * End-to-end power-up test (M7), run in the Training Arena: the Wrecking
 * Ball (pickup, transform, bowling, immunity, ground pound, sludge bounce,
 * smashing the cracked wall, timing out, popping), Hyper Grease (speed,
 * slicks, slipping enemies) and Infinite Socks (free rapid fire).
 *
 *   node tests/e2e/powerups.mjs
 */
import { createReport, openGame, screenshotDir, startVite } from "./harness.mjs";

const PORT = 5197;
const OUT = screenshotDir("powerups");
const FLOOR = 192; // arena floor (row 12)
const report = createReport();
/** Gone, out of health, or flying through the air. */
const knockedOut = (e) => !e || e.health <= 0 || e.state === "tumbling";
const { check } = report;

async function run() {
  const vite = await startVite(PORT);
  const game = await openGame(PORT, { stage: "arena" });
  const { page, wait, player, hold, release, tap, shot } = game;
  const hook = (fn, arg) => page.evaluate(fn, arg);
  const enemies = () => hook(() => window.gunkDebug.enemies());
  const powerUps = () => hook(() => window.gunkDebug.powerUps());
  const spawnEnemy = (kind, x) =>
    hook(([k, ex]) => window.gunkDebug.spawnEnemy(k, ex, 192), [kind, x]);
  const teleport = (x, y = FLOOR) => hook(([px, py]) => window.gunkDebug.teleport(px, py), [x, y]);
  const grant = (id) => hook((p) => window.gunkDebug.grantPowerUp(p), id);

  async function reset(x) {
    await hook(() => window.gunkDebug.clearEnemies());
    await hook(() => window.gunkDebug.heal());
    await teleport(x);
    await wait(200);
  }

  try {
    await game.startStage();
    await wait(2300);

    // ── Wrecking Ball: pickup and transformation ───────────────────────────
    await reset(64);
    const scoreBefore = await hook(() => window.gunkDebug.score());
    await hook(() => window.gunkDebug.spawnPowerUp("wreckingBall", 110, 176));
    await hold("right");
    await wait(350);
    await release("right");
    await wait(100);
    check("touching the pickup starts the transformation", (await player()).form === "inflating");
    check("power-up pickups score", (await hook(() => window.gunkDebug.score())) > scoreBefore);
    check(
      "the HUD gets a Wrecking Ball timer",
      (await powerUps()).some((p) => p.id === "wreckingBall"),
    );
    await shot(OUT, "01-inflate");
    await wait(750);
    const ball = await player();
    check(
      "Bulgo pops into a ball",
      ball.form === "rolling" && ball.anim.startsWith("bulgo-ball:"),
      ball.anim,
    );
    const ballStart = Date.now();

    // ── Rolling bowls enemies over, and they can't hurt the ball ──────────
    const pins = [];
    for (const x of [260, 290, 320]) pins.push(await spawnEnemy("rat", x));
    await hold("right");
    let topSpeed = 0;
    for (let i = 0; i < 12; i++) {
      await wait(100);
      topSpeed = Math.max(topSpeed, (await player()).vx);
    }
    await release("right");
    await shot(OUT, "02-bowling");
    const pinsLeft = await enemies();
    const bowled = pins.filter((id) => knockedOut(pinsLeft.find((e) => e.id === id))).length;
    check("the ball builds real speed", topSpeed > 280, `${Math.round(topSpeed)} px/s`);
    check("rolling bowls over a row of rats", bowled >= 2, `${bowled}/3`);
    check("enemies can't hurt the ball", (await player()).health === 6);

    // ── Ground pound shockwave ─────────────────────────────────────────────
    await hook(() => window.gunkDebug.clearEnemies());
    const here = (await player()).x;
    const target = await spawnEnemy("turnip", here + 36);
    await tap("jump", 60);
    await wait(280);
    await tap("down", 60);
    await wait(40);
    check("down in mid-air starts a ground pound", (await player()).slamming === true);
    await shot(OUT, "03-slam");
    await wait(500);
    check(
      "the ground pound's shockwave flattens a nearby enemy",
      knockedOut((await enemies()).find((e) => e.id === target)),
      JSON.stringify((await enemies()).find((e) => e.id === target)),
    );

    // ── Sludge bounces the ball; rolling hard smashes the cracked wall ─────
    await hook(() => window.gunkDebug.clearEnemies());
    await teleport(540);
    await wait(150);
    await hold("right");
    let bouncedOverSludge = false;
    for (let i = 0; i < 18; i++) {
      await wait(100);
      const p = await player();
      if (p.x > 640 && p.x < 720 && p.y < FLOOR - 20) bouncedOverSludge = true;
    }
    await release("right");
    check("sludge just bounces the ball", bouncedOverSludge);
    check("…without hurting it", (await player()).health === 6);
    check(
      "rolling into the cracked wall at speed smashes it",
      (await hook(() => window.gunkDebug.terrainAt(760, 180))) === "empty",
    );
    await shot(OUT, "04-wall");

    // ── Time's up: the ball deflates back into Bulgo ───────────────────────
    const left = 12.6 - (Date.now() - ballStart) / 1000;
    if (left > 0) await wait(left * 1000);
    await wait(600);
    const after = await player();
    check(
      "the ball deflates back into Bulgo when time runs out",
      after.form === "bulgo",
      after.form,
    );
    check("…and Bulgo's own animations come back", after.anim.startsWith("bulgo:"), after.anim);
    check("the timer leaves the HUD", (await powerUps()).length === 0);

    // ── Explosions pop the ball early ──────────────────────────────────────
    await reset(200);
    await grant("wreckingBall");
    await wait(900);
    await hook(() => window.gunkDebug.blast(200, 180));
    await wait(80);
    const popped = await player();
    check(
      "an explosion pops the ball",
      popped.form === "deflating" || popped.form === "bulgo",
      popped.form,
    );
    check("…without costing health", popped.health === 6);
    await wait(700);
    check("popping ends the power-up", (await powerUps()).length === 0);

    // ── Hyper Grease: faster, and enemies slip on the trail ───────────────
    await reset(80);
    await grant("hyperGrease");
    await wait(200);
    const greased = await player();
    check("Hyper Grease makes Bulgo much faster", greased.runSpeed > 200, `${greased.runSpeed}`);
    await hold("right");
    await wait(900);
    await release("right");
    await wait(300);
    const slicks = await hook(() => window.gunkDebug.greaseSlicks());
    check("running leaves a grease trail", slicks >= 8, `${slicks} slicks`);
    await shot(OUT, "05-grease");
    const slipper = await spawnEnemy("rat", 200);
    let slipped = false;
    for (let i = 0; i < 20 && !slipped; i++) {
      await wait(100);
      const rat = (await enemies()).find((e) => e.id === slipper);
      slipped = !rat || rat.state === "tumbling" || rat.health < 2;
    }
    check("enemies slip on the grease", slipped);

    // ── Infinite Socks: free rapid fire (stacks with grease) ──────────────
    await hook(() => window.gunkDebug.clearEnemies());
    await grant("infiniteSocks");
    await wait(100);
    const armed = await player();
    check(
      "Infinite Socks equips the Sock Cannon",
      armed.weapon?.id === "sock" && armed.infiniteAmmo,
    );
    check("power-ups stack", (await powerUps()).length === 2);
    const ammoBefore = armed.weapon.ammo;
    await hold("shoot");
    let peak = 0;
    for (let i = 0; i < 10; i++) {
      await wait(60);
      peak = Math.max(peak, await hook(() => window.gunkDebug.projectiles()));
    }
    await release("shoot");
    await shot(OUT, "06-socks");
    check("socks are free", (await player()).weapon?.ammo === ammoBefore);
    check("…and fire fast", peak >= 6, `peak ${peak} in flight`);
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
