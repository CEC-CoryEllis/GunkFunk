/**
 * End-to-end combat test (M4): pickups and upgrades, all three weapons
 * against training dummies, weapon switching, the charged mega punch, and a
 * knocked-off dummy head bowling over its neighbour.
 *
 *   node tests/e2e/combat.mjs
 */
import { createReport, openGame, screenshotDir, startVite, tileFloor } from "./harness.mjs";

const PORT = 5196;
const OUT = screenshotDir("combat");
const report = createReport();
const { check } = report;

async function run() {
  const vite = await startVite(PORT);
  const game = await openGame(PORT, { stage: "sewer-test" });
  const { wait, player, dummies, hold, release, teleport, tap, shot } = game;
  const dummyNear = async (x) => (await dummies()).find((d) => Math.abs(d.x - x) < 4);
  try {
    await game.startStage();
    await wait(2500);

    let p = await player();
    check(
      "starts with a level-1 Sock Cannon",
      p.weapon?.id === "sock" && p.weapon.level === 1,
      JSON.stringify(p.weapon),
    );

    // Sock pickup at tile 6 → upgrade to level 2.
    await hold("right");
    await wait(250);
    await release("right");
    await wait(300);
    p = await player();
    check(
      "collecting a second sock pickup upgrades to level 2",
      p.weapon?.level === 2,
      JSON.stringify(p.weapon),
    );
    await shot(OUT, "01-upgrade");

    // Shoot the first dummy (tile 9).
    const firstDummyX = 9 * 16 + 8;
    // A volley into open space first (point-blank socks hit on their first step).
    await tap("left", 40);
    await hold("shoot");
    let inFlight = 0;
    for (let i = 0; i < 8; i++) {
      inFlight = Math.max(inFlight, await game.page.evaluate(() => window.gunkDebug.projectiles()));
      await wait(20);
    }
    await release("shoot");
    check("holding shoot puts socks in the air", inFlight > 0, `peak ${inFlight} projectiles`);
    await tap("right", 40);
    await wait(250);
    await hold("shoot");
    await wait(60);
    p = await player();
    check("shooting shows the gun pose", p.shooting && p.anim.includes("shoot"), p.anim);
    await shot(OUT, "02-sock-volley");
    await wait(900);
    await release("shoot");
    await wait(200);
    const first = await dummyNear(firstDummyX);
    check("socks knock out a dummy", first?.knockedOut === true, JSON.stringify(first));
    check("hits score points", (await game.page.evaluate(() => window.gunkDebug.score())) >= 150);

    // Snot Blaster pickup (tile 24), then switch weapons back and forth.
    await teleport(...tileFloor(23, 15));
    await wait(200);
    await hold("right");
    await wait(220);
    await release("right");
    await wait(300);
    p = await player();
    check("picking up a new weapon equips it", p.weapon?.id === "snot", JSON.stringify(p.weapons));
    await tap("switchWeapon");
    await wait(100);
    check("switch cycles to the next weapon", (await player()).weapon?.id === "sock");
    await tap("switchWeapon");
    await wait(100);
    check("switch cycles back", (await player()).weapon?.id === "snot");

    // Snot globs at the dummy row (tiles 40/43/46).
    await teleport(...tileFloor(37, 15));
    await wait(300);
    const before = (await dummyNear(40 * 16 + 8)).health;
    await hold("shoot");
    await wait(700);
    await shot(OUT, "03-snot");
    await release("shoot");
    await wait(600);
    const afterSnot = await dummyNear(40 * 16 + 8);
    check(
      "snot globs damage a dummy",
      afterSnot.health < before || afterSnot.knockedOut,
      `${before} -> ${afterSnot.health}`,
    );

    // Mega punch the middle dummy (43) so its head bowls into dummy 46.
    await wait(3000); // let everything respawn
    const neighbourBefore = (await dummyNear(46 * 16 + 8)).health;
    await teleport(43 * 16 - 10, 16 * 16);
    await wait(300);
    await hold("attack");
    await wait(1100);
    p = await player();
    check("holding punch charges up", p.charging && p.anim === "bulgo:charge", p.anim);
    await shot(OUT, "04-charging");
    await release("attack");
    await wait(120);
    check(
      "releasing a full charge throws the mega punch",
      (await player()).anim === "bulgo:mega_punch",
    );
    await shot(OUT, "05-mega-punch");
    await wait(500);
    const middle = await dummyNear(43 * 16 + 8);
    check(
      "mega punch deals heavy damage",
      middle.health <= 4 || middle.knockedOut,
      JSON.stringify(middle),
    );
    // Finish it off with jabs so its head flies right into the neighbour.
    for (let i = 0; i < 4 && !(await dummyNear(43 * 16 + 8)).knockedOut; i++) {
      await tap("attack");
      await wait(260);
    }
    await wait(400);
    await shot(OUT, "06-bowling");
    const neighbour = await dummyNear(46 * 16 + 8);
    check(
      "a knocked-off head bowls over the next dummy",
      neighbour.health < neighbourBefore || neighbour.knockedOut,
      `${neighbourBefore} -> ${neighbour.health}`,
    );

    // Chicken Launcher (tile 95) against the dummy at 105.
    await teleport(...tileFloor(94, 15));
    await wait(200);
    await hold("right");
    await wait(200);
    await release("right");
    await wait(300);
    p = await player();
    check("chicken launcher collected", p.weapon?.id === "chicken", JSON.stringify(p.weapons));
    // Fire from where the pickup left us: the chicken arcs over the spikes into the dummy.
    const chickenTarget = (await dummyNear(105 * 16 + 8)).health;
    await tap("shoot");
    await wait(900);
    await shot(OUT, "07-chicken");
    const blasted = await dummyNear(105 * 16 + 8);
    check(
      "exploding chickens damage targets",
      blasted.health < chickenTarget || blasted.knockedOut,
      `${chickenTarget} -> ${blasted.health}`,
    );
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
