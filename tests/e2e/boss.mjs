/**
 * End-to-end boss test (M9) in "The Throne Room": the Flush-o-Tron 3000's
 * intro, armour and exposed windows, all three phases with the arena being
 * wrecked between them, the fight resetting (and the arena repairing itself)
 * when Bulgo loses a life, and the defeat that completes World 1.
 *
 *   node tests/e2e/boss.mjs
 */
import { createReport, openGame, screenshotDir, startVite } from "./harness.mjs";

const PORT = 5194;
const OUT = screenshotDir("boss");
const TILE = 16;
const report = createReport();
const { check } = report;

async function run() {
  const vite = await startVite(PORT);
  const game = await openGame(PORT, { stage: "throne-room" });
  const { page, wait, waitFor, player, hold, release, shot } = game;
  const hook = (fn, arg) => page.evaluate(fn, arg);
  const boss = () => hook(() => window.gunkDebug.boss());
  const hitBoss = (damage) => hook((d) => window.gunkDebug.hitBoss(d), damage);
  const setHealth = (h) => hook((v) => window.gunkDebug.setBossHealth(v), h);
  const terrain = (tx, ty) =>
    hook(([x, y]) => window.gunkDebug.terrainAt(x, y), [tx * TILE + 8, ty * TILE + 8]);
  const action = async () => (await boss()).action;
  const heal = () => hook(() => window.gunkDebug.heal());
  const sceneActive = (key) => page.evaluate((k) => window.gunkGame.scene.isActive(k), key);

  async function enterArena() {
    await hold("right");
    await waitFor(async () => (await boss()).arena === "fighting", 5000);
    await release("right");
  }

  try {
    await game.startStage();
    await wait(2400);
    check(
      "the Throne Room has its gem and no secrets",
      (await hook(() => window.gunkDebug.stage())).gemsTotal === 1,
    );

    // ── Intro ──────────────────────────────────────────────────────────────
    await enterArena();
    check("walking in starts the fight", (await boss()).arena === "fighting");
    check("boss music plays", (await hook(() => window.gunkDebug.audio())).track === "boss");
    check(
      "the gates seal the throne room",
      (await terrain(20, 10)) === "solid" && (await terrain(45, 10)) === "solid",
    );
    check("Stinkbottom gloats first", (await action()) === "intro");
    await hitBoss(5);
    check("it can't be hurt during the intro", (await boss()).health === 48);
    await wait(1500);
    await shot(OUT, "01-intro");

    // ── Phase 1: armour, and the vent window ──────────────────────────────
    await waitFor(async () => (await action()) === "walk", 6000);
    await hitBoss(1);
    check("weak hits clank off its armour", (await boss()).health === 48);
    await hitBoss(3);
    check("bigger hits get through, dulled", (await boss()).health === 46);
    await heal();
    const vented = await waitFor(async () => (await action()) === "vent", 15000);
    check("after its attacks it kneels to vent", vented);
    await shot(OUT, "02-vent");
    const beforeVent = (await boss()).health;
    await hitBoss(3);
    check("venting, it takes full damage", (await boss()).health === beforeVent - 3);

    // ── Breakdown 1 → phase 2 ─────────────────────────────────────────────
    await heal();
    await setHealth(34);
    await waitFor(async () => !["vent", "intro"].includes(await action()), 4000);
    await hitBoss(20);
    check("a phase can't be skipped with one huge hit", (await boss()).health === 32);
    check("the legs blow off", await waitFor(async () => (await action()) === "breakdown1", 1000));
    await wait(1600);
    await shot(OUT, "03-breakdown1");
    await waitFor(async () => (await boss()).phase === 2, 4000);
    check(
      "the fragile grates are smashed",
      (await terrain(25, 10)) === "empty" && (await terrain(40, 10)) === "empty",
    );
    await wait(1200);
    const hovering = await boss();
    check(
      "phase 2: it flies on rocket jets",
      hovering.y < 240 - 40,
      `hull bottom ${Math.round(hovering.y)}`,
    );
    await shot(OUT, "04-phase2");
    await heal();
    const overheated = await waitFor(async () => (await action()) === "overheat", 15000);
    check("it overheats and sputters down", overheated);
    const beforeHeat = (await boss()).health;
    await hitBoss(2);
    check("overheated, it takes full damage", (await boss()).health === beforeHeat - 2);
    await shot(OUT, "05-overheat");

    // ── Breakdown 2 → phase 3 ─────────────────────────────────────────────
    await heal();
    await setHealth(18);
    await waitFor(async () => (await action()) !== "overheat", 4000);
    await hitBoss(20);
    await waitFor(async () => (await boss()).phase === 3, 5000);
    check("phase 3: the wreck hops about", (await boss()).phase === 3);
    check("the middle of the floor caves into sludge", (await terrain(30, 15)) === "sludge");
    await wait(800);
    await shot(OUT, "06-phase3");
    const beforeWreck = (await boss()).health;
    await hitBoss(1);
    check("the wreck has no armour left", (await boss()).health === beforeWreck - 1);

    // ── Losing a life resets the fight and repairs the room ───────────────
    await hook(() => window.gunkDebug.heal(1));
    const p = await player();
    await hook(([x, y]) => window.gunkDebug.blast(x, y), [p.x, p.y - 12]);
    const reset = await waitFor(
      async () => (await player()).life === "alive" && (await boss()).arena === "waiting",
      7000,
    );
    const fresh = await boss();
    check(
      "dying resets the boss to phase 1",
      reset && fresh.health === 48 && fresh.phase === 1,
      JSON.stringify(fresh),
    );
    check("…the grates are back", (await terrain(25, 10)) === "oneWay");
    check("…the floor is back", (await terrain(30, 15)) === "solid");
    check("…the gates are open", (await terrain(20, 10)) === "empty");

    // ── Defeat completes World 1 ──────────────────────────────────────────
    await heal();
    await enterArena();
    await waitFor(async () => (await action()) === "walk", 7000);
    await setHealth(1);
    await waitFor(
      async () => (await boss()).phase === 3 && (await action()) !== "breakdown2",
      9000,
    );
    await hitBoss(3);
    check("the last hit starts the big finish", (await action()) === "defeated");
    await wait(1200);
    await shot(OUT, "07-defeat");
    const done = await waitFor(() => sceneActive("StageClear"), 8000);
    check(
      "beating it clears the stage",
      done && (await hook(() => window.gunkDebug.stage())).cleared,
    );
    await wait(4000);
    await shot(OUT, "08-world-complete");
    await page.keyboard.press("KeyZ");
    check("…and World 1 ends back at the title", await waitFor(() => sceneActive("Title"), 3000));
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
