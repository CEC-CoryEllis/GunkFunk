/**
 * Funk clavinet / rhythm guitar: a narrow pulse wave through a per-hit envelope
 * filter ("quack" wah), plus muted 16th-note scratches ("chk").
 */
import { pluck } from "../synth/envelope";
import { noiseSource } from "../synth/noise";
import { chain, filter, gain, osc, run } from "../synth/nodes";
import { midiToFreq } from "../synth/pitch";
import { pulseWave } from "../synth/waves";
import type { NoteSpec, PitchedInstrument } from "./types";

export function createClav(ctx: BaseAudioContext, out: AudioNode): PitchedInstrument {
  const bus = gain(ctx, 1);
  chain(bus, filter(ctx, "highpass", 170, 0.7), out);
  return {
    play(t, note) {
      if (note.art.mute || note.art.dead) scratch(ctx, bus, t, note);
      else stab(ctx, bus, t, note);
    },
  };
}

function stab(ctx: BaseAudioContext, out: AudioNode, t: number, note: NoteSpec): void {
  const vel = note.velocity * (note.art.accent ? 1.1 : 1);
  const dur = Math.max(0.05, note.duration);
  const end = t + dur;
  const wah = filter(ctx, "lowpass", 400, 7);
  const open = 1500 + 1500 * vel;
  wah.frequency.setValueAtTime(380, t);
  wah.frequency.exponentialRampToValueAtTime(open, t + 0.022);
  wah.frequency.exponentialRampToValueAtTime(650, t + 0.022 + Math.min(0.16, dur));
  const amp = gain(ctx, 0);
  const peak = (vel * 0.8) / Math.sqrt(note.midis.length);
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(peak, t + 0.002);
  amp.gain.setTargetAtTime(peak * 0.4, t + 0.002, 0.07);
  amp.gain.setTargetAtTime(0, end, 0.015);
  chain(wah, amp, out);
  const wave = pulseWave(ctx, 0.22);
  note.midis.forEach((midi, i) => {
    const tone = osc(ctx, wave, midiToFreq(midi));
    tone.detune.value = (i % 2 === 0 ? 1 : -1) * (3 + i);
    tone.connect(wah);
    run(tone, t, end + 0.1);
  });
  // Pick attack.
  const pick = noiseSource(ctx, "white", t, t + 0.02);
  const pickLevel = gain(ctx, 0);
  pluck(pickLevel.gain, t, vel * 0.24, 0.0005, 0.01);
  chain(pick, filter(ctx, "bandpass", 3000, 1.2), pickLevel, out);
}

/** Muted "chk": strings damped by the fretting hand. */
function scratch(ctx: BaseAudioContext, out: AudioNode, t: number, note: NoteSpec): void {
  const vel = note.velocity;
  const noise = noiseSource(ctx, "white", t, t + 0.05);
  const noiseLevel = gain(ctx, 0);
  pluck(noiseLevel.gain, t, vel * 0.6, 0.001, 0.03);
  chain(noise, filter(ctx, "bandpass", 1700, 1.4), noiseLevel, out);
  const lp = filter(ctx, "lowpass", 900, 2);
  const toneLevel = gain(ctx, 0);
  pluck(toneLevel.gain, t, vel * 0.36, 0.001, 0.025);
  chain(lp, toneLevel, out);
  const wave = pulseWave(ctx, 0.22);
  for (const midi of note.midis.slice(0, 3)) {
    const tone = osc(ctx, wave, midiToFreq(midi));
    tone.connect(lp);
    run(tone, t, t + 0.04);
  }
}
