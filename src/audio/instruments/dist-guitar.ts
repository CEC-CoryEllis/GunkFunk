/**
 * Distorted guitar for intensity layers and the boss: detuned saw power chords summed
 * into a shared amp (pre-gain → fuzz WaveShaper → cabinet filters), so chords
 * intermodulate like a real overdriven amp. Staccato / muted notes become palm-mute chugs.
 */
import { adsr, pluck } from "../synth/envelope";
import { noiseSource } from "../synth/noise";
import { chain, filter, gain, osc, run } from "../synth/nodes";
import { midiToFreq } from "../synth/pitch";
import { fuzzCurve, shaper } from "../synth/shaper";
import type { NoteSpec, PitchedInstrument } from "./types";

export function createDistGuitar(ctx: BaseAudioContext, out: AudioNode): PitchedInstrument {
  const amp = gain(ctx, 4);
  chain(
    amp,
    filter(ctx, "highpass", 110, 0.7),
    shaper(ctx, fuzzCurve(5), "4x"),
    filter(ctx, "peaking", 1600, 1, 3),
    filter(ctx, "lowpass", 4300, 0.9),
    filter(ctx, "lowpass", 6500, 0.7),
    gain(ctx, 0.32),
    out,
  );
  return {
    play(t, note) {
      if (note.art.dead) muteScratch(ctx, amp, t, note.velocity);
      else powerChord(ctx, amp, t, note);
    },
  };
}

function chordTones(note: NoteSpec): number[] {
  if (note.midis.length > 1) return [...note.midis];
  const root = note.midis[0];
  return [root, root + 7, root + 12];
}

function powerChord(ctx: BaseAudioContext, out: AudioNode, t: number, note: NoteSpec): void {
  const palmMute = note.art.staccato === true || note.art.mute === true;
  const vel = note.velocity * (note.art.accent ? 1.1 : 1);
  const end = t + Math.max(0.06, note.duration);
  const level = gain(ctx, 0);
  const stop = adsr(level.gain, t, vel * 0.5, end, {
    attack: 0.004,
    decay: palmMute ? 0.08 : 0.6,
    sustain: palmMute ? 0.15 : 0.75,
    release: palmMute ? 0.03 : 0.07,
  });
  const tone = palmMute ? filter(ctx, "lowpass", 650, 1) : filter(ctx, "lowpass", 6000, 0.7);
  chain(tone, level, out);
  for (const midi of chordTones(note)) {
    for (const cents of [-7, 7]) {
      const string = osc(ctx, "sawtooth", midiToFreq(midi));
      string.detune.value = cents;
      if (note.art.fall) {
        string.frequency.setValueAtTime(midiToFreq(midi), Math.max(t + 0.01, end - 0.12));
        string.frequency.exponentialRampToValueAtTime(midiToFreq(midi - 7), end + 0.1);
      }
      string.connect(tone);
      run(string, t, stop + 0.1);
    }
  }
}

function muteScratch(ctx: BaseAudioContext, out: AudioNode, t: number, vel: number): void {
  const noise = noiseSource(ctx, "pink", t, t + 0.05);
  const level = gain(ctx, 0);
  pluck(level.gain, t, vel * 0.3, 0.001, 0.03);
  chain(noise, filter(ctx, "bandpass", 900, 1.2), level, out);
}
