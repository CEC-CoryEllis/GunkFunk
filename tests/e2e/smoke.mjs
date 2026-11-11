/**
 * End-to-end smoke test: boots the real game in headless Chromium, walks
 * through title → menu → stage, drives Bulgo with scripted input via the
 * `?debug` test hooks, asserts gameplay outcomes, saves screenshots, and fails
 * on any console error.
 *
 *   npm run test:e2e            (starts its own Vite dev server)
 *   SCREENSHOT_DIR=... npm run test:e2e
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const PORT = 5199;
const URL = `http://localhost:${PORT}/?debug`;
const OUT =
  process.env.SCREENSHOT_DIR ?? join(import.meta.dirname, "..", "..", "test-results", "smoke");
mkdirSync(OUT, { recursive: true });

const failures = [];
const consoleErrors = [];

function check(name, condition, detail = "") {
  console.log(`${condition ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!condition) failures.push(name);
}

/** Starts Vite in its own process group so the whole tree can be stopped afterwards. */
async function startVite() {
  const configArgs = process.env.VITE_CONFIG ? ["--config", process.env.VITE_CONFIG] : [];
  const viteBin = join(import.meta.dirname, "..", "..", "node_modules", "vite", "bin", "vite.js");
  const vite = spawn(
    process.execPath,
    [viteBin, "--port", String(PORT), "--strictPort", ...configArgs],
    {
      stdio: ["ignore", "pipe", "pipe"],
      // No colour codes in the output, so the ready banner can be matched as plain text.
      env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
      detached: true,
    },
  );
  let output = "";
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Vite did not start:\n${output}`)), 30000);
    const onData = (chunk) => {
      output += String(chunk);
      if (output.includes(`localhost:${PORT}`)) {
        clearTimeout(timer);
        resolve();
      }
    };
    vite.stdout.on("data", onData);
    vite.stderr.on("data", onData);
    vite.on("exit", (code) => reject(new Error(`Vite exited with ${code}:\n${output}`)));
  });
  return { stop: () => process.kill(-vite.pid, "SIGTERM") };
}

const wait = (page, ms) => page.waitForTimeout(ms);
const player = (page) => page.evaluate(() => window.gunkDebug.player());
const hold = (page, action) => page.evaluate((a) => window.gunkDebug.hold(a), action);
const release = (page, action) => page.evaluate((a) => window.gunkDebug.release(a), action);

async function tap(page, action, ms = 60) {
  await hold(page, action);
  await wait(page, ms);
  await release(page, action);
}

async function shot(page, name) {
  await page.screenshot({ path: join(OUT, `${name}.png`) });
}

async function run() {
  const vite = await startVite();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrors.push(String(err)));

    await page.goto(URL);
    await page.waitForSelector("canvas");
    await wait(page, 1200);
    await shot(page, "01-title");

    // Title → menu → start game.
    await page.keyboard.press("KeyZ");
    await wait(page, 400);
    await shot(page, "02-title-menu");
    await page.keyboard.press("KeyZ");
    await page.waitForFunction(() => window.gunkDebug !== undefined, null, { timeout: 10000 });
    await wait(page, 900);
    await shot(page, "03-stage-intro");
    await wait(page, 1500);

    const sound = await page.evaluate(() => window.gunkDebug.audio());
    check("audio unlocked by the title key press", sound.unlocked);
    check("stage music is playing", sound.track === "sewer", String(sound.track));

    let p = await player(page);
    check(
      "player spawned alive on the floor",
      p.life === "alive" && p.state === "ground",
      `${p.state}/${p.life}`,
    );
    const startX = p.x;

    await hold(page, "right");
    await wait(page, 700);
    p = await player(page);
    check("running right moves the player", p.x - startX > 60, `dx=${Math.round(p.x - startX)}`);
    check("run animation plays", p.anim === "bulgo:run", p.anim);
    await shot(page, "04-running");
    await release(page, "right");
    await wait(page, 300);

    // Jump: hold for full height, sample the peak.
    const groundY = (await player(page)).y;
    await hold(page, "jump");
    let peak = groundY;
    for (let i = 0; i < 12; i++) {
      await wait(page, 40);
      peak = Math.min(peak, (await player(page)).y);
      if (i === 5) await shot(page, "05-jump");
    }
    await release(page, "jump");
    check("full jump rises 50+ px", groundY - peak > 50, `height=${Math.round(groundY - peak)}`);
    await wait(page, 900);
    p = await player(page);
    check("lands back on the ground", p.state === "ground", p.state);

    // Punch combo.
    await tap(page, "attack");
    await wait(page, 40);
    p = await player(page);
    check("punch starts the combo", p.anim.startsWith("bulgo:punch"), p.anim);
    await shot(page, "06-punch");
    await tap(page, "attack");
    await wait(page, 120);
    await tap(page, "attack");
    await wait(page, 150);
    await shot(page, "07-belly-bump");
    await wait(page, 500);

    // Slide: run on open floor (tiles 38-49) then press down.
    await page.evaluate(() => window.gunkDebug.teleport(38 * 16, 15 * 16));
    await wait(page, 400);
    await hold(page, "right");
    await wait(page, 500);
    await hold(page, "down");
    await wait(page, 80);
    p = await player(page);
    check("down while running starts a slide", p.state === "slide", p.state);
    await shot(page, "08-slide");
    await release(page, "down");
    await release(page, "right");
    await wait(page, 600);

    // Hazard: drop into the sludge pit (tiles 27-36 on row 16).
    const before = (await player(page)).health;
    // x = 512 is centred in the two-tile gap between the grates over the pit.
    await page.evaluate(() => window.gunkDebug.teleport(32 * 16, 12 * 16));
    await wait(page, 600);
    p = await player(page);
    check("sludge damages the player", p.health < before, `${before} -> ${p.health}`);
    await shot(page, "09-sludge");
    await wait(page, 1500);

    // Wall shaft: wall-jump test area (walls at x=58 and x=64).
    await page.evaluate(() => window.gunkDebug.teleport(61 * 16, 15 * 16));
    await wait(page, 500);
    await hold(page, "right");
    await tap(page, "jump", 250);
    await wait(page, 450);
    p = await player(page);
    check("pushing into a wall mid-air wall-slides", p.state === "wallSlide", p.state);
    await shot(page, "10-wall-slide");
    await release(page, "right");
    await wait(page, 800);

    // Ladder: climb up the ladder at x=73.
    await page.evaluate(() => window.gunkDebug.teleport(73 * 16 + 8, 15 * 16));
    await wait(page, 400);
    await hold(page, "up");
    await wait(page, 600);
    p = await player(page);
    check("up on a ladder climbs", p.state === "climb", p.state);
    await shot(page, "11-climb");
    await release(page, "up");

    // Pause menu.
    await page.keyboard.press("Enter");
    await wait(page, 400);
    await shot(page, "12-pause");
    const paused = await page.evaluate(() => window.gunkGame.scene.isActive("Pause"));
    check("enter opens the pause menu", paused);
    await page.keyboard.press("KeyZ"); // RESUME
    await wait(page, 400);
    const resumed = await page.evaluate(
      () => window.gunkGame.scene.isActive("Level") && !window.gunkGame.scene.isActive("Pause"),
    );
    check("resume returns to the level", resumed);

    // Idle long enough for the bored animation + quip.
    await page.evaluate(() => window.gunkDebug.teleport(6 * 16, 15 * 16));
    await wait(page, 8500);
    p = await player(page);
    check("bored idle kicks in", p.anim === "bulgo:bored", p.anim);
    await shot(page, "13-bored");

    // Death: repeated sludge dips until a life is lost.
    for (let i = 0; i < 8 && (await player(page)).life !== "dying"; i++) {
      await page.evaluate(() => window.gunkDebug.teleport(32 * 16, 13 * 16));
      await wait(page, 1500);
    }
    p = await player(page);
    check("running out of health triggers death", p.life === "dying", p.life);
    await wait(page, 700);
    await shot(page, "14-death-melt");
    await wait(page, 3200);
    p = await player(page);
    check("player respawns after dying", p.life === "alive" || p.life === "respawning", p.life);
    await shot(page, "15-respawn");
  } finally {
    await browser.close();
    vite.stop();
  }

  check("no console errors", consoleErrors.length === 0, consoleErrors.slice(0, 5).join(" | "));
  console.log(`\nScreenshots: ${OUT}`);
  if (failures.length > 0) {
    console.error(`\n${failures.length} check(s) failed: ${failures.join(", ")}`);
    process.exit(1);
  }
  console.log("\nAll smoke checks passed.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
