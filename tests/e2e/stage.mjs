/**
 * End-to-end stage test (M8) for Stage 1-1 "Flush Hour": checkpoints and
 * respawning, the toilet route up to the catwalks, the whole fight with THE
 * CLOG (armour, stun window, reset on death, defeat), and the stage exit with
 * its tally and the way back to the title.
 *
 *   node tests/e2e/stage.mjs
 */
import { createReport, openGame, screenshotDir, startVite } from "./harness.mjs";

const PORT = 5198;
const OUT = screenshotDir("stage");
const FLOOR = 368; // Flush Hour floor (row 23)
const TILE = 16;
const report = createReport();
const { check } = report;

async function run() {
  const vite = await startVite(PORT);
  const game = await openGame(PORT);
  const { page, wait, waitFor, player, hold, release, tap, shot } = game;
  const hook = (fn, arg) => page.evaluate(fn, arg);
  const stage = () => hook(() => window.gunkDebug.stage());
  const boss = () => hook(() => window.gunkDebug.boss());
  const session = () => hook(() => window.gunkDebug.session());
  const track = async () => (await hook(() => window.gunkDebug.audio())).track;
  const teleport = (x, y = FLOOR) => hook(([px, py]) => window.gunkDebug.teleport(px, py), [x, y]);
  const terrain = (tx, ty) =>
    hook(([x, y]) => window.gunkDebug.terrainAt(x, y), [tx * TILE + 8, ty * TILE + 8]);
  const sceneActive = (key) => page.evaluate((k) => window.gunkGame.scene.isActive(k), key);

  try {
    await game.startStage();
    await wait(2400);
    const info = await stage();
    check(
      "START opens Flush Hour",
      info.gemsTotal === 5 && info.secretsTotal === 2,
      JSON.stringify(info),
    );
    await shot(OUT, "01-start");

    // ── Checkpoints: touch one, lose a life, come back there ────────────────
    await teleport(47 * TILE + 8);
    await wait(400);
    check(
      "touching a checkpoint moves the respawn point",
      Math.abs((await stage()).respawnX - 760) < 2,
    );
    await shot(OUT, "02-checkpoint");
    const livesBefore = (await session()).lives;
    await hook(() => window.gunkDebug.heal(1));
    await teleport(56 * TILE, 330); // into the first sludge pit
    const respawned = await waitFor(async () => {
      const p = await player();
      return p.life === "alive" && (await session()).lives < livesBefore;
    }, 6000);
    const back = await player();
    check(
      "losing a life respawns at the checkpoint",
      respawned && Math.abs(back.x - 760) < 24,
      `x ${Math.round(back.x)}`,
    );

    // ── The high road: launch toilet + double jump onto the catwalk ────────
    // Drop straight onto the seat, then steer once airborne.
    await teleport(50 * TILE + 11, 300);
    await waitFor(async () => (await player()).vy < -300, 2000);
    await hold("right");
    await waitFor(async () => (await player()).vy > -60, 2000);
    await tap("jump", 150);
    await waitFor(async () => (await player()).y < 185, 1500);
    await release("right");
    await wait(900);
    const top = await player();
    check(
      "the toilet route reaches the catwalks",
      top.y <= 193 && top.state === "ground",
      `${Math.round(top.x)},${Math.round(top.y)} ${top.state}`,
    );
    await shot(OUT, "03-catwalk");

    // ── THE CLOG: the arena locks ───────────────────────────────────────────
    await hook(() => window.gunkDebug.heal());
    await teleport(264 * TILE + 8);
    await wait(300);
    await hold("right");
    await waitFor(async () => (await boss()).arena === "fighting", 3000);
    await release("right");
    check("walking into the arena starts the fight", (await boss()).arena === "fighting");
    check(
      "the gates slam shut behind and ahead",
      (await terrain(270, 20)) === "solid" && (await terrain(293, 20)) === "solid",
    );
    check("boss music plays", (await track()) === "miniboss", await track());
    await wait(300);
    await shot(OUT, "04-arena");

    // Hair armour: socks fizzle while it isn't stunned.
    await tap("right", 30);
    await hold("shoot");
    await wait(900);
    await release("shoot");
    await wait(300);
    const armoured = await boss();
    check(
      "its hair soaks up socks unless it's stunned",
      armoured.health === 24 || armoured.action === "stunned",
      JSON.stringify(armoured),
    );

    // The roll ends in a bonk: stunned and open to a beating.
    await hook(() => window.gunkDebug.heal());
    const stunned = await waitFor(async () => (await boss()).action === "stunned", 12000);
    check("rolling into the wall leaves it stunned", stunned);
    await shot(OUT, "05-stunned");
    const before = await boss();
    await teleport(before.x - 34);
    await tap("right", 30);
    for (let i = 0; i < 3; i++) {
      await tap("attack", 40);
      await wait(i === 2 ? 400 : 110);
    }
    const after = await boss();
    check(
      "punches land while it's stunned",
      after.health < before.health,
      `${before.health} -> ${after.health}`,
    );

    // Losing a life mid-fight resets it.
    await hook(() => window.gunkDebug.heal(1));
    const p = await player();
    await hook(([x, y]) => window.gunkDebug.blast(x, y), [p.x, p.y - 12]);
    const reset = await waitFor(
      async () => (await player()).life === "alive" && (await boss()).arena === "waiting",
      6000,
    );
    const afterReset = await boss();
    check(
      "dying mid-fight resets the boss",
      reset && afterReset.health === 24,
      JSON.stringify(afterReset),
    );
    check("…and opens the gates again", (await terrain(270, 20)) === "empty");
    check(
      "…back at the checkpoint before the arena",
      Math.abs((await player()).x - (264 * TILE + 8)) < 24,
    );

    // Second attempt: finish it.
    await hook(() => window.gunkDebug.heal());
    await hold("right");
    await waitFor(async () => (await boss()).arena === "fighting", 3000);
    await release("right");
    await wait(1600);
    await hook(() => window.gunkDebug.setBossHealth(2));
    await hook(() => window.gunkDebug.collect("chicken"));
    const target = await boss();
    await tap((await player()).x < target.x ? "right" : "left", 30);
    for (let i = 0; i < 6 && !(await boss()).gone && (await boss()).health > 0; i++) {
      await tap("shoot", 40);
      await wait(600);
    }
    const won = await waitFor(async () => (await boss()).arena === "won", 5000);
    check("chickens finish The Clog off", won);
    check("the gates lift after the fight", (await terrain(293, 20)) === "empty");
    check("stage music returns", (await track()) === "sewer", await track());
    await shot(OUT, "06-won");

    // ── The exit and the tally ─────────────────────────────────────────────
    await teleport(296 * TILE);
    await hold("right");
    await wait(700);
    await release("right");
    check("walking into the exit pipe clears the stage", (await stage()).cleared);
    const tally = await waitFor(() => sceneActive("StageClear"), 4000);
    check("the stage-clear tally appears", tally);
    await wait(3500);
    await shot(OUT, "07-tally");
    await page.keyboard.press("KeyZ");
    const title = await waitFor(() => sceneActive("Title"), 3000);
    check("any button returns to the title", title);
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
