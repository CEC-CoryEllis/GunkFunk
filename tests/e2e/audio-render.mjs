/**
 * Audio verification. Renders every SFX, stinger and track (plus per-layer stems)
 * through the real mix graph in headless Chromium via `window.audioLab`, checks the
 * results numerically, exports 16-bit WAVs to audio-export/, verifies ducking / muffle /
 * intensity gating, and smoke-tests the realtime engine through the sound test UI.
 * Exits non-zero on any failure.   Usage: node tests/e2e/audio-render.mjs
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const EXPORT_DIR = join(ROOT, "audio-export");
const PORT = 5180;
const URL = `http://localhost:${PORT}/sound-test.html`;
const CONCURRENCY = 4;
const LAYERED = ["sewer", "boss"];
const LIMITS = { minRmsDb: -50, minPeakDb: -30, maxPeak: 0.99, minStemRmsDb: -60, silentDb: -90 };
/** Expected musical length of stingers in seconds (without tail). */
const STINGER_LENGTHS = {
  transform: [1, 2],
  level_clear: [3.5, 4.5],
  game_over: [2.5, 3.5],
  death: [1.2, 1.8],
};

const failures = [];
const fail = (message) => failures.push(message);

// ── Signal analysis ─────────────────────────────────────────────────────

const toDb = (value) => (value > 0 ? 20 * Math.log10(value) : -Infinity);
const fmt = (db, width = 7) => (Number.isFinite(db) ? db.toFixed(1) : "-inf").padStart(width);

function biquad(input, [b0, b1, b2, a0, a1, a2]) {
  const out = new Float32Array(input.length);
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  for (let i = 0; i < input.length; i++) {
    const y = (b0 * input[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1;
    x1 = input[i];
    y2 = y1;
    y1 = y;
    out[i] = y;
  }
  return out;
}

/** ITU-R BS.1770 K-weighting (high shelf + RLB high-pass), RBJ coefficients for any rate. */
function kWeight(data, fs) {
  const A = 10 ** (4 / 40);
  let w = (2 * Math.PI * 1500) / fs,
    cos = Math.cos(w),
    alpha = Math.sin(w) / (2 * Math.SQRT1_2),
    sq = 2 * Math.sqrt(A) * alpha;
  const shelf = [
    A * (A + 1 + (A - 1) * cos + sq),
    -2 * A * (A - 1 + (A + 1) * cos),
    A * (A + 1 + (A - 1) * cos - sq),
    A + 1 - (A - 1) * cos + sq,
    2 * (A - 1 - (A + 1) * cos),
    A + 1 - (A - 1) * cos - sq,
  ];
  w = (2 * Math.PI * 38) / fs;
  cos = Math.cos(w);
  alpha = Math.sin(w);
  const highpass = [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2, 1 + alpha, -2 * cos, 1 - alpha];
  return biquad(biquad(data, shelf), highpass);
}

function meanSquare(data, from = 0, to = data.length) {
  let sum = 0;
  for (let i = from; i < to; i++) sum += data[i] * data[i];
  return sum / Math.max(1, to - from);
}

function analyze(channels, fs) {
  let peak = 0,
    invalid = 0;
  for (const data of channels)
    for (const s of data) {
      if (!Number.isFinite(s)) invalid++;
      else if (Math.abs(s) > peak) peak = Math.abs(s);
    }
  const rms = Math.sqrt(channels.reduce((sum, ch) => sum + meanSquare(ch), 0) / channels.length);
  const weighted = channels.map((ch) => kWeight(ch, fs));
  const lufs = -0.691 + 10 * Math.log10(weighted.reduce((s, ch) => s + meanSquare(ch), 0) || 1e-12);
  const win = Math.floor(0.4 * fs);
  let momentary = -Infinity;
  for (let i = 0; i + win <= weighted[0].length; i += Math.floor(0.1 * fs)) {
    const ms = weighted.reduce((s, ch) => s + meanSquare(ch, i, i + win), 0);
    momentary = Math.max(momentary, -0.691 + 10 * Math.log10(ms || 1e-12));
  }
  if (!Number.isFinite(momentary)) {
    // Shorter than one 400 ms window: measure it zero-padded to the window length.
    const energy = weighted.reduce((sum, ch) => sum + meanSquare(ch) * ch.length, 0);
    momentary = -0.691 + 10 * Math.log10(energy / win || 1e-12);
  }
  return { peak, rms, lufs, momentary, invalid, duration: channels[0].length / fs };
}

/** RMS (dB) of a time window, optionally through a 24 dB/oct high-pass to isolate treble. */
function windowDb(channels, fs, from, to, highpassHz = 0) {
  const w = (2 * Math.PI * highpassHz) / fs,
    cos = Math.cos(w),
    alpha = Math.sin(w) / (2 * Math.SQRT1_2);
  const highpass = [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2, 1 + alpha, -2 * cos, 1 - alpha];
  const filtered = channels.map((data) =>
    highpassHz ? biquad(biquad(data, highpass), highpass) : data,
  );
  const sum = filtered.reduce(
    (s, data) =>
      s + meanSquare(data, Math.floor(from * fs), Math.floor(Math.min(data.length / fs, to) * fs)),
    0,
  );
  return 10 * Math.log10(sum / filtered.length || 1e-12);
}

/** 16-bit PCM WAV, interleaved. */
function encodeWav(channels, fs) {
  const frames = channels[0].length,
    blockAlign = channels.length * 2,
    bytes = frames * blockAlign;
  const out = Buffer.alloc(44 + bytes);
  out.write("RIFF", 0);
  out.writeUInt32LE(36 + bytes, 4);
  out.write("WAVE", 8);
  out.write("fmt ", 12);
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(channels.length, 22);
  out.writeUInt32LE(fs, 24);
  out.writeUInt32LE(fs * blockAlign, 28);
  out.writeUInt16LE(blockAlign, 32);
  out.writeUInt16LE(16, 34);
  out.write("data", 36);
  out.writeUInt32LE(bytes, 40);
  let offset = 44;
  for (let i = 0; i < frames; i++)
    for (const data of channels) {
      const s = Number.isFinite(data[i]) ? Math.max(-1, Math.min(1, data[i])) : 0;
      out.writeInt16LE(Math.round(s < 0 ? s * 0x8000 : s * 0x7fff), offset);
      offset += 2;
    }
  return out;
}

// ── Rendering through the page ──────────────────────────────────────────

/** `method` is an `AudioLab` method name; results come back as base64 Float32 PCM. */
async function render(page, method, ...args) {
  const result = await page.evaluate(
    async ([name, params]) => {
      const lab = window.audioLab;
      const rendered = await lab[name](...params);
      const channels = rendered.map((f32) => {
        const bytes = new Uint8Array(f32.buffer, f32.byteOffset, f32.byteLength);
        let text = "";
        for (let i = 0; i < bytes.length; i += 0x8000) {
          text += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        }
        return btoa(text);
      });
      return { fs: lab.sampleRate, channels };
    },
    [method, args],
  );
  const channels = result.channels.map((b64) => {
    const bytes = Buffer.from(b64, "base64");
    return new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length));
  });
  return { channels, fs: result.fs };
}

async function pool(items, worker) {
  const results = Array.from({ length: items.length });
  let next = 0;
  const run = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index]);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, run));
  return results;
}

/** Renders, checks and (optionally) exports one item; returns its table row. */
async function renderItem(page, { kind, label, method, args, file, minDuration, maxDuration }) {
  const { channels, fs } = await render(page, method, ...args);
  const stats = analyze(channels, fs);
  const problems = [];
  if (stats.invalid > 0) problems.push(`${stats.invalid} NaN/Inf samples`);
  if (stats.peak >= LIMITS.maxPeak)
    problems.push(`peak ${stats.peak.toFixed(3)} >= ${LIMITS.maxPeak}`);
  if (toDb(stats.rms) < LIMITS.minRmsDb || toDb(stats.peak) < LIMITS.minPeakDb)
    problems.push(`too quiet (silent?)`);
  if (stats.duration < minDuration || stats.duration > maxDuration)
    problems.push(
      `duration ${stats.duration.toFixed(2)} s outside [${minDuration}, ${maxDuration}]`,
    );
  for (const problem of problems) fail(`${kind} ${label}: ${problem}`);
  if (file) {
    mkdirSync(dirname(join(EXPORT_DIR, file)), { recursive: true });
    writeFileSync(join(EXPORT_DIR, file), encodeWav(channels, fs));
  }
  return { kind, label, ...stats, ok: problems.length === 0 };
}

// ── Bus effects & realtime ──────────────────────────────────────────────

async function busEffects(page) {
  const [dry, ducked, muffled] = await Promise.all([
    render(page, "renderTrackFx", "sewer", 4, {}),
    render(page, "renderTrackFx", "sewer", 4, { duck: [3, 6] }),
    render(page, "renderTrackFx", "sewer", 4, { muffled: true }),
  ]);
  const duckDb =
    windowDb(ducked.channels, ducked.fs, 3.4, 5.9) - windowDb(dry.channels, dry.fs, 3.4, 5.9);
  const restoredDb =
    windowDb(ducked.channels, ducked.fs, 7, 8.5) - windowDb(dry.channels, dry.fs, 7, 8.5);
  const end = dry.channels[0].length / dry.fs;
  const trebleDb =
    windowDb(muffled.channels, muffled.fs, 0.5, end, 3000) -
    windowDb(dry.channels, dry.fs, 0.5, end, 3000);
  if (!(duckDb < -8 && duckDb > -15))
    fail(`duck: song level changed ${duckDb.toFixed(1)} dB (expected ≈ -12)`);
  if (!(Math.abs(restoredDb) < 1.5))
    fail(`duck: level not restored after the stinger (${restoredDb.toFixed(1)} dB)`);
  if (!(trebleDb < -15)) fail(`muffle: treble only dropped ${trebleDb.toFixed(1)} dB`);
  return [
    `  duck ${duckDb.toFixed(1)} dB during stinger, ${restoredDb.toFixed(1)} dB after`,
    `  muffle: content above 3 kHz ${trebleDb.toFixed(1)} dB`,
  ];
}

async function realtimeSmoke(page, lists) {
  const sampleDb = (ms) =>
    page.evaluate(async (durationMs) => {
      let max = -Infinity;
      const end = performance.now() + durationMs;
      while (performance.now() < end) {
        max = Math.max(max, window.soundTestHooks.system.outputPeakDb());
        await new Promise((r) => setTimeout(r, 30));
      }
      return max;
    }, ms);
  const system = (expr) => page.evaluate(`window.soundTestHooks.system.${expr}`);
  const report = [];
  await page.click('[data-testid="track-title"]');
  await page.waitForTimeout(400);
  if (!(await system("unlocked")))
    return (fail("realtime: AudioContext never reached 'running'"), report);
  for (const track of lists.tracks) {
    await page.click(`[data-testid="track-${track}"]`);
    await page.waitForTimeout(1100);
    const db = await sampleDb(900);
    if ((await system("music.currentTrack")) !== track)
      fail(`realtime: currentTrack is not ${track}`);
    if (!(db > -40)) fail(`realtime: ${track} live output ${db.toFixed(1)} dBFS (silent?)`);
    report.push(`  ${track.padEnd(14)} live output peak ${db.toFixed(1)} dBFS`);
  }
  for (const level of [2, 1, 0]) await page.click(`[data-testid="intensity-${level}"]`);
  for (let i = 0; i < 2; i++) await page.click('[data-testid="muffle"]');
  for (const id of lists.stingers) {
    await page.click(`[data-testid="stinger-${id}"]`);
    await page.waitForTimeout(200);
  }
  for (const id of lists.sfx) await page.click(`[data-testid="sfx-${id}"]`);
  for (let i = 0; i < 12; i++) await page.click('[data-testid="sfx-coin"]');
  const voices = await system('sfx.activeVoices("coin")');
  if (voices > 3) fail(`realtime: coin voice cap exceeded (${voices} voices)`);
  report.push(
    `  58-sfx burst  live output peak ${(await sampleDb(300)).toFixed(1)} dBFS; coin voices after 12 rapid plays: ${voices}`,
  );
  await page.click('[data-testid="track-stop"]');
  if ((await system("music.currentTrack")) !== null)
    fail("realtime: stop() did not clear currentTrack");
  return report;
}

// ── Main ────────────────────────────────────────────────────────────────

async function waitForServer(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(URL)).ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Vite did not start on port ${PORT}`);
}

function printTable(rows) {
  console.log(
    `\n${"KIND".padEnd(8)}${"ID".padEnd(28)}${"DUR s".padStart(7)}${"PEAK".padStart(8)}${"RMS".padStart(8)}${"LUFS".padStart(8)}${"MOM".padStart(8)}  OK`,
  );
  console.log(
    `${"".padEnd(36)}${"".padStart(7)}${"dBFS".padStart(8)}${"dBFS".padStart(8)}${"integr".padStart(8)}${"max".padStart(8)}`,
  );
  for (const r of rows) {
    console.log(
      `${r.kind.padEnd(8)}${r.label.padEnd(28)}${r.duration.toFixed(2).padStart(7)} ${fmt(toDb(r.peak))} ${fmt(toDb(r.rms))} ${fmt(r.lufs)} ${fmt(r.momentary)}  ${r.ok ? "ok" : "FAIL"}`,
    );
  }
}

async function main() {
  const vite = spawn("npx", ["vite", "--port", String(PORT), "--strictPort"], {
    cwd: ROOT,
    detached: true,
    stdio: ["ignore", "ignore", "pipe"],
  });
  vite.stderr.on("data", (chunk) => process.stderr.write(`[vite] ${chunk}`));
  const consoleErrors = [];
  let browser;
  try {
    await waitForServer(30000);
    browser = await chromium.launch();
    const page = await browser.newPage();
    page.on("console", (msg) => msg.type() === "error" && consoleErrors.push(msg.text()));
    page.on("pageerror", (error) => consoleErrors.push(String(error)));
    await page.goto(URL);
    await page.waitForFunction(() => window.audioLab !== undefined);
    const lists = await page.evaluate(() => {
      const lab = window.audioLab;
      const tracks = lab.listTracks();
      return {
        sfx: lab.listSfx(),
        stingers: lab.listStingers(),
        tracks,
        layers: Object.fromEntries(tracks.map((t) => [t, lab.listLayers(t)])),
        bars: Object.fromEntries(tracks.map((t) => [t, lab.trackBars(t)])),
        stingerSeconds: Object.fromEntries(
          lab.listStingers().map((s) => [s, lab.stingerSeconds(s)]),
        ),
      };
    });
    const started = Date.now();
    const jobs = [
      ...lists.sfx.map((id) => ({
        kind: "sfx",
        label: id,
        method: "renderSfx",
        args: [id],
        file: `sfx/${id}.wav`,
        minDuration: 0.05,
        maxDuration: 4,
      })),
      ...lists.stingers.map((id) => ({
        kind: "stinger",
        label: id,
        method: "renderStinger",
        args: [id],
        file: `stingers/${id}.wav`,
        minDuration: lists.stingerSeconds[id],
        maxDuration: lists.stingerSeconds[id] + 3,
      })),
      ...lists.tracks.flatMap((id) => [
        {
          kind: "track",
          label: `${id} full i2`,
          method: "renderTrack",
          args: [id, lists.bars[id], 2],
          file: `tracks/${id}.wav`,
          minDuration: lists.bars[id] * 1.5,
          maxDuration: lists.bars[id] * 3 + 3,
        },
        ...(LAYERED.includes(id) ? [0, 1] : []).map((i) => ({
          kind: "track",
          label: `${id} full i${i}`,
          method: "renderTrack",
          args: [id, lists.bars[id], i],
          file: `tracks/${id}-intensity${i}.wav`,
          minDuration: lists.bars[id] * 1.5,
          maxDuration: lists.bars[id] * 3 + 3,
        })),
      ]),
    ];
    const rows = await pool(jobs, (job) => renderItem(page, job));
    for (const [id, seconds] of Object.entries(lists.stingerSeconds)) {
      const [min, max] = STINGER_LENGTHS[id] ?? [0.8, 3];
      if (seconds < min || seconds > max)
        fail(`stinger ${id}: musical length ${seconds.toFixed(2)} s outside [${min}, ${max}]`);
    }
    const intensityReport = LAYERED.map((id) => {
      const lufs = [0, 1, 2].map((i) => rows.find((r) => r.label === `${id} full i${i}`).lufs);
      if (!(lufs[2] > lufs[0] + 0.3)) fail(`${id}: intensity 2 is not louder than intensity 0`);
      return `  ${id.padEnd(14)} ${lufs.map((l, i) => `i${i} ${l.toFixed(1)}`).join("  ")} LUFS`;
    });
    // Stems: whole arrangement per layer at intensity 2; gated layers must be silent at 0.
    const stemJobs = lists.tracks.flatMap((id) => lists.layers[id].map((layer) => ({ id, layer })));
    const stems = await pool(stemJobs, async ({ id, layer }) => {
      const at2 = analyze(
        (await render(page, "renderTrack", id, lists.bars[id], 2, layer)).channels,
        44100,
      );
      if (!(toDb(at2.rms) > LIMITS.minStemRmsDb))
        fail(`${id} stem ${layer}: silent at intensity 2`);
      let gated = "";
      if (LAYERED.includes(id)) {
        const at0 = analyze((await render(page, "renderTrack", id, 4, 0, layer)).channels, 44100);
        gated = toDb(at0.peak) < LIMITS.silentDb ? " (off@i0)" : "";
      }
      return { id, layer, lufs: at2.lufs, gated };
    });
    for (const id of LAYERED) {
      const gatedLayers = stems
        .filter((s) => s.id === id && s.gated)
        .map((s) => s.layer)
        .toSorted();
      const expected =
        id === "sewer" ? ["guitar", "lead", "perc"] : ["brass", "lead", "organ", "perc"];
      if (gatedLayers.join() !== expected.join())
        fail(`${id}: layers silent at intensity 0 are [${gatedLayers}], expected [${expected}]`);
    }
    const stemReport = lists.tracks.map(
      (id) =>
        `  ${id.padEnd(14)} ${stems
          .filter((s) => s.id === id)
          .map((s) => `${s.layer} ${s.lufs.toFixed(1)}${s.gated}`)
          .join(" | ")}`,
    );
    const fxReport = await busEffects(page);
    const renderSeconds = (Date.now() - started) / 1000;
    const realtimeReport = await realtimeSmoke(page, lists);
    for (const error of consoleErrors) fail(`console error: ${error}`);

    printTable(rows);
    console.log(
      `\nIntensity (whole arrangement, integrated loudness):\n${intensityReport.join("\n")}`,
    );
    console.log(
      `\nLayer stems (LUFS over the whole arrangement at intensity 2; "off@i0" = silent at intensity 0):\n${stemReport.join("\n")}`,
    );
    console.log(`\nBus effects (sewer):\n${fxReport.join("\n")}`);
    console.log(`\nRealtime smoke test:\n${realtimeReport.join("\n")}`);
    console.log(
      `\nRendered ${rows.length} items + ${stems.length} stems in ${renderSeconds.toFixed(1)} s; WAVs in ${EXPORT_DIR}`,
    );
  } finally {
    await browser?.close();
    try {
      process.kill(-vite.pid, "SIGTERM");
    } catch {
      vite.kill("SIGTERM");
    }
  }
  if (failures.length > 0) {
    console.error(`\n${failures.length} FAILURE(S):\n - ${failures.join("\n - ")}`);
    process.exit(1);
  }
  console.log("\nAll audio checks passed (no console errors).");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
