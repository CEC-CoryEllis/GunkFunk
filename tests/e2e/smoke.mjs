/**
 * End-to-end smoke test: boots the real game in headless Chromium, walks
 * through title → menu → stage, drives Bulgo with scripted input via the
 * `?debug` test hooks, asserts gameplay outcomes, saves screenshots, and fails
 * on any console error.
 *
 *   npm run test:e2e            (starts its own Vite dev server)
 *   SCREENSHOT_DIR=... npm run test:e2e
 */
import { createReport, openGame, screenshotDir, startVite } from "./harness.mjs";

const PORT = 5199;
const OUT = screenshotDir("smoke");
const report = createReport();
const { check } = report;

async function run() {
  const vite = await startVite(PORT);
  const game = await openGame(PORT);
  const { page, wait, player, hold, release, tap } = game;
  const shot = (name) => game.shot(OUT, name);
  try {
    await wait(1200);
    await shot("01-title");

    // Title → menu → start game.
    await page.keyboard.press("KeyZ");
    await wait(400);
    await shot("02-title-menu");
    await page.keyboard.press("KeyZ");
    await page.waitForFunction(() => window.gunkDebug !== undefined, null, { timeout: 10000 });
    // Enemies have their own suite (enemies.mjs); keep this one deterministic.
    await page.evaluate(() => window.gunkDebug.clearEnemies());
    await wait(900);
    await shot("03-stage-intro");
    await wait(1500);

    const sound = await page.evaluate(() => window.gunkDebug.audio());
    check("audio unlocked by the title key press", sound.unlocked);
    check("stage music is playing", sound.track === "sewer", String(sound.track));

    let p = await player();
    check(
      "player spawned alive on the floor",
      p.life === "alive" && p.state === "ground",
      `${p.state}/${p.life}`,
    );
    const startX = p.x;

    await hold("right");
    await wait(700);
    p = await player();
    check("running right moves the player", p.x - startX > 60, `dx=${Math.round(p.x - startX)}`);
    check("run animation plays", p.anim === "bulgo:run", p.anim);
    await shot("04-running");
    await release("right");
    await wait(300);

    // Jump: hold for full height, sample the peak.
    const groundY = (await player()).y;
    await hold("jump");
    let peak = groundY;
    for (let i = 0; i < 12; i++) {
      await wait(40);
      peak = Math.min(peak, (await player()).y);
      if (i === 5) await shot("05-jump");
    }
    await release("jump");
    check("full jump rises 50+ px", groundY - peak > 50, `height=${Math.round(groundY - peak)}`);
    await wait(900);
    p = await player();
    check("lands back on the ground", p.state === "ground", p.state);

    // Punch combo.
    await tap("attack");
    await wait(40);
    p = await player();
    check("punch starts the combo", p.anim.startsWith("bulgo:punch"), p.anim);
    await shot("06-punch");
    await tap("attack");
    await wait(120);
    await tap("attack");
    await wait(150);
    await shot("07-belly-bump");
    await wait(500);

    // Slide: run on open floor (tiles 38-49) then press down.
    await page.evaluate(() => window.gunkDebug.teleport(38 * 16, 15 * 16));
    await wait(400);
    await hold("right");
    await wait(500);
    await hold("down");
    await wait(80);
    p = await player();
    check("down while running starts a slide", p.state === "slide", p.state);
    await shot("08-slide");
    await release("down");
    await release("right");
    await wait(600);

    // Hazard: drop into the sludge pit (tiles 27-36 on row 16).
    const before = (await player()).health;
    // x = 512 is centred in the two-tile gap between the grates over the pit.
    await page.evaluate(() => window.gunkDebug.teleport(32 * 16, 12 * 16));
    await wait(600);
    p = await player();
    check("sludge damages the player", p.health < before, `${before} -> ${p.health}`);
    await shot("09-sludge");
    await wait(1500);

    // Wall shaft: wall-jump test area (walls at x=58 and x=64).
    await page.evaluate(() => window.gunkDebug.teleport(61 * 16, 15 * 16));
    await wait(500);
    await hold("right");
    await tap("jump", 250);
    await wait(450);
    p = await player();
    check("pushing into a wall mid-air wall-slides", p.state === "wallSlide", p.state);
    await shot("10-wall-slide");

    // Climb out: wall-jump back and forth until Bulgo lands on the exit ledge
    // (row 8, top at y = 128). Guards against ceilings that make it impossible.
    const LEDGE_TOP = 8 * 16;
    for (let bounce = 0; bounce < 6; bounce++) {
      let t = 0;
      do {
        p = await player();
        await wait(15);
        t += 15;
      } while (p.state !== "wallSlide" && !(p.state === "ground" && p.y <= LEDGE_TOP) && t < 1500);
      if (p.state !== "wallSlide") break;
      // Steer toward the opposite wall and jump off this one.
      await release("left");
      await release("right");
      await hold(p.facing > 0 ? "left" : "right");
      await tap("jump", 200);
    }
    await wait(400);
    p = await player();
    check(
      "the wall-jump shaft can be climbed out onto the ledge",
      p.state === "ground" && p.y <= LEDGE_TOP && p.x > 64 * 16,
      `${p.state} at ${Math.round(p.x)},${Math.round(p.y)}`,
    );
    await shot("10b-shaft-exit");
    await release("left");
    await release("right");
    await wait(300);

    // Ladder: climb up the ladder at x=73.
    await page.evaluate(() => window.gunkDebug.teleport(73 * 16 + 8, 15 * 16));
    await wait(400);
    await hold("up");
    await wait(600);
    p = await player();
    check("up on a ladder climbs", p.state === "climb", p.state);
    await shot("11-climb");
    await release("up");

    // Pause menu.
    await page.keyboard.press("Enter");
    await wait(400);
    await shot("12-pause");
    const paused = await page.evaluate(() => window.gunkGame.scene.isActive("Pause"));
    check("enter opens the pause menu", paused);
    await page.keyboard.press("KeyZ"); // RESUME
    await wait(400);
    const resumed = await page.evaluate(
      () => window.gunkGame.scene.isActive("Level") && !window.gunkGame.scene.isActive("Pause"),
    );
    check("resume returns to the level", resumed);

    // Idle long enough for the bored animation + quip.
    await page.evaluate(() => window.gunkDebug.teleport(6 * 16, 15 * 16));
    await wait(8500);
    p = await player();
    check("bored idle kicks in", p.anim === "bulgo:bored", p.anim);
    await shot("13-bored");

    // Death: repeated sludge dips until a life is lost.
    for (let i = 0; i < 8 && (await player()).life !== "dying"; i++) {
      await page.evaluate(() => window.gunkDebug.teleport(32 * 16, 13 * 16));
      await wait(1500);
    }
    p = await player();
    check("running out of health triggers death", p.life === "dying", p.life);
    await wait(700);
    await shot("14-death-melt");
    await wait(3200);
    p = await player();
    check("player respawns after dying", p.life === "alive" || p.life === "respawning", p.life);
    await shot("15-respawn");
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
