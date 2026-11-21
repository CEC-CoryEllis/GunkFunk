/**
 * Shared Playwright plumbing for the e2e scripts: starts Vite, opens the game
 * with `?debug`, records console errors, and wraps the `window.gunkDebug`
 * hooks in small helpers.
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = join(import.meta.dirname, "..", "..");

/** Starts Vite in its own process group so the whole tree can be stopped afterwards. */
export async function startVite(port) {
  const configArgs = process.env.VITE_CONFIG ? ["--config", process.env.VITE_CONFIG] : [];
  const viteBin = join(ROOT, "node_modules", "vite", "bin", "vite.js");
  const vite = spawn(
    process.execPath,
    [viteBin, "--port", String(port), "--strictPort", ...configArgs],
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
      if (output.includes(`localhost:${port}`)) {
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

export function createReport() {
  const failures = [];
  return {
    failures,
    check(name, condition, detail = "") {
      console.log(`${condition ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
      if (!condition) failures.push(name);
    },
    finish(consoleErrors, outDir) {
      this.check(
        "no console errors",
        consoleErrors.length === 0,
        consoleErrors.slice(0, 5).join(" | "),
      );
      console.log(`\nScreenshots: ${outDir}`);
      if (failures.length > 0) {
        console.error(`\n${failures.length} check(s) failed: ${failures.join(", ")}`);
        process.exit(1);
      }
      console.log("\nAll checks passed.");
    },
  };
}

export function screenshotDir(name) {
  const dir = process.env.SCREENSHOT_DIR
    ? join(process.env.SCREENSHOT_DIR, name)
    : join(ROOT, "test-results", name);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** Launches Chromium, opens the game and returns a page plus driving helpers. */
export async function openGame(port) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));
  await page.goto(`http://localhost:${port}/?debug`);
  await page.waitForSelector("canvas");

  const wait = (ms) => page.waitForTimeout(ms);
  const debug = (fn, arg) => page.evaluate(fn, arg);
  const helpers = {
    page,
    browser,
    consoleErrors,
    wait,
    player: () => debug(() => window.gunkDebug.player()),
    dummies: () => debug(() => window.gunkDebug.dummies()),
    hold: (action) => debug((a) => window.gunkDebug.hold(a), action),
    release: (action) => debug((a) => window.gunkDebug.release(a), action),
    teleport: (tx, ty) => debug(([x, y]) => window.gunkDebug.teleport(x, y), [tx, ty]),
    async tap(action, ms = 60) {
      await helpers.hold(action);
      await wait(ms);
      await helpers.release(action);
    },
    shot: (dir, name) => page.screenshot({ path: join(dir, `${name}.png`) }),
    /** Title → menu → start game; resolves once the stage's test hooks exist. */
    async startStage() {
      await wait(1200);
      await page.keyboard.press("KeyZ");
      await wait(400);
      await page.keyboard.press("KeyZ");
      await page.waitForFunction(() => window.gunkDebug !== undefined, null, { timeout: 10000 });
    },
  };
  return helpers;
}

/** Tile coordinates → the world position a player standing on that tile's floor would have. */
export const tileFloor = (tx, ty) => [tx * 16 + 8, (ty + 1) * 16];
