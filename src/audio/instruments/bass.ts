/**
 * Bass voices. The slap bass is the star of the soundtrack: thumb slaps (bright filter
 * "pop" + click), popped octaves (higher, snappier), dead notes (muted thud), slides
 * and hammer-ons. The soft bass is a round finger/upright bass for the lounge muzak.
 */
import { adsr, glide, pluck } from "../synth/envelope";
import { noiseSource } from "../synth/noise";
import { chain, filter, gain, osc, run } from "../synth/nodes";
import { midiToFreq } from "../synth/pitch";
import { driveCurve, shaper } from "../synth/shaper";
import type { NoteSpec, PitchedInstrument } from "./types";

const SLIDE_TIME = 0.075;
/** Output trim after the drive + EQ stage. */
const SLAP_LEVEL = 0.35;
const HAMMER_TIME = 0.022;

export function createSlapBass(ctx: BaseAudioContext, out: AudioNode): PitchedInstrument {
  const input = gain(ctx, 1);
  const drive = shaper(ctx, driveCurve(1.7), "2x");
  const body = filter(ctx, "lowshelf", 110, undefined, 3);
  const presence = filter(ctx, "peaking", 1000, 0.8, 4);
  const rumbleCut = filter(ctx, "highpass", 32, 0.7);
  chain(input, drive, body, presence, rumbleCut, gain(ctx, SLAP_LEVEL), out);
  return {
    play(t, note) {
      if (note.art.dead) deadNote(ctx, input, t, note);
      else slapNote(ctx, input, t, note);
    },
  };
}

function slapNote(ctx: BaseAudioContext, out: AudioNode, t: number, note: NoteSpec): void {
  const pop = note.art.pop === true;
  const hammer = note.art.hammer === true;
  const vel = Math.min(1.15, note.velocity * (note.art.accent ? 1.12 : 1));
  const f = midiToFreq(note.midis[0]);
  const end = t + Math.max(0.07, note.duration);
  const stop = end + 0.15;
  const from =
    note.glideFrom !== undefined && (note.art.slide || hammer) ? midiToFreq(note.glideFrom) : 0;

  const saw = osc(ctx, "sawtooth", f);
  const square = osc(ctx, "square", f);
  const sources = [saw, square];
  const sub = f < 130 && !pop ? osc(ctx, "sine", f) : null;
  if (sub) sources.push(sub);
  for (const source of sources) {
    if (from) glide(source.frequency, t, from, f, hammer ? HAMMER_TIME : SLIDE_TIME);
    else {
      // Pluck "twang": the string starts slightly sharp and settles.
      source.detune.setValueAtTime(pop ? 28 : 16, t);
      source.detune.setTargetAtTime(0, t, 0.014);
    }
  }

  const lp = filter(ctx, "lowpass", 400, pop ? 6 : 3.6);
  const peakHz = (pop ? 4300 + 2600 * vel : 2500 + 1700 * vel) * (note.art.accent ? 1.15 : 1);
  const restHz = Math.max(220, f * (pop ? 5 : 3));
  lp.frequency.setValueAtTime(hammer ? restHz * 2.2 : peakHz, t);
  lp.frequency.setTargetAtTime(restHz, t + 0.003, pop ? 0.045 : 0.07);

  const amp = gain(ctx, 0);
  const peak = vel * (pop ? 0.6 : 0.68);
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(peak, t + (hammer ? 0.012 : 0.002));
  amp.gain.setTargetAtTime(peak * 0.55, t + 0.005, pop ? 0.07 : 0.15);
  amp.gain.setTargetAtTime(0, end, 0.022);

  chain(saw, gain(ctx, 0.55), lp);
  chain(square, gain(ctx, 0.3), lp);
  chain(lp, amp, out);
  if (sub) chain(sub, gain(ctx, 0.5), amp);
  for (const source of sources) run(source, t, stop);
  if (!hammer) slapClick(ctx, out, t, vel, pop);
}

/** The thumb / fingernail transient that makes it a *slap*. */
function slapClick(ctx: BaseAudioContext, out: AudioNode, t: number, vel: number, pop: boolean) {
  const noise = noiseSource(ctx, "white", t, t + 0.06);
  const band = filter(ctx, "bandpass", pop ? 3800 : 2300, pop ? 1.6 : 1.1);
  const level = gain(ctx, 0);
  pluck(level.gain, t, vel * (pop ? 0.5 : 0.4), 0.0006, pop ? 0.02 : 0.032);
  chain(noise, band, level, out);
  if (pop) return;
  const thump = osc(ctx, "triangle", 190);
  glide(thump.frequency, t, 190, 70, 0.03);
  const thumpLevel = gain(ctx, 0);
  pluck(thumpLevel.gain, t, vel * 0.32, 0.001, 0.045);
  chain(thump, thumpLevel, out);
  run(thump, t, t + 0.06);
}

/** Muted "thwk": the string is choked by the fretting hand. */
function deadNote(ctx: BaseAudioContext, out: AudioNode, t: number, note: NoteSpec): void {
  const vel = note.velocity;
  const tone = osc(ctx, "sawtooth", midiToFreq(note.midis[0]));
  const lp = filter(ctx, "lowpass", 900, 1.6);
  lp.frequency.setValueAtTime(1100, t);
  lp.frequency.exponentialRampToValueAtTime(180, t + 0.05);
  const toneLevel = gain(ctx, 0);
  pluck(toneLevel.gain, t, vel * 0.5, 0.0015, 0.05);
  chain(tone, lp, toneLevel, out);
  run(tone, t, t + 0.08);

  const noise = noiseSource(ctx, "pink", t, t + 0.05);
  const band = filter(ctx, "bandpass", 1300, 0.9);
  const noiseLevel = gain(ctx, 0);
  pluck(noiseLevel.gain, t, vel * 0.42, 0.0008, 0.028);
  chain(noise, band, noiseLevel, out);
}

/** Round, warm finger bass (lounge, sad trombone accompaniment). */
export function createSoftBass(ctx: BaseAudioContext, out: AudioNode): PitchedInstrument {
  const lp = filter(ctx, "lowpass", 950, 0.8);
  lp.connect(out);
  return {
    play(t, note) {
      const f = midiToFreq(note.midis[0]);
      const vel = note.velocity;
      const end = t + Math.max(0.08, note.duration);
      const amp = gain(ctx, 0);
      const stop = adsr(amp.gain, t, vel * 0.85, end, {
        attack: 0.008,
        decay: 0.45,
        sustain: 0.5,
        release: 0.12,
      });
      const tri = osc(ctx, "triangle", f);
      const sine = osc(ctx, "sine", f);
      for (const source of [tri, sine]) {
        if (note.glideFrom !== undefined && note.art.slide) {
          glide(source.frequency, t, midiToFreq(note.glideFrom), f, SLIDE_TIME * 1.5);
        }
        run(source, t, stop);
      }
      chain(tri, gain(ctx, 0.7), amp);
      chain(sine, gain(ctx, 0.6), amp);
      amp.connect(lp);
      // Finger thump.
      const noise = noiseSource(ctx, "brown", t, t + 0.05);
      const thump = gain(ctx, 0);
      pluck(thump.gain, t, vel * 0.5, 0.002, 0.04);
      chain(noise, filter(ctx, "lowpass", 500), thump, lp);
    },
  };
}
