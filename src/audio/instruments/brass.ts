/**
 * Horn section: punchy synth-brass stabs (detuned saws, filter "blat", scoop up,
 * optional fall-off) and a plunger-muted trombone for the comedic stingers.
 */
import { adsr } from "../synth/envelope";
import { chain, filter, gain, osc, run } from "../synth/nodes";
import { midiToFreq } from "../synth/pitch";
import type { PitchedInstrument } from "./types";

export function createBrass(ctx: BaseAudioContext, out: AudioNode): PitchedInstrument {
  const bus = gain(ctx, 1);
  chain(bus, filter(ctx, "peaking", 1200, 0.8, 2), out);
  return {
    play(t, note) {
      const vel = note.velocity * (note.art.accent ? 1.1 : 1);
      const end = t + Math.max(0.08, note.duration);
      const amp = gain(ctx, 0);
      const stop = adsr(amp.gain, t, (vel * 1.05) / Math.sqrt(note.midis.length), end, {
        attack: 0.018,
        decay: 0.2,
        sustain: 0.7,
        release: note.art.fall ? 0.2 : 0.09,
      });
      const lp = filter(ctx, "lowpass", 700, 1.3);
      const bright = 1200 + 3400 * vel;
      lp.frequency.setValueAtTime(600, t);
      lp.frequency.exponentialRampToValueAtTime(bright, t + 0.04);
      lp.frequency.setTargetAtTime(bright * 0.55, t + 0.05, 0.12);
      chain(lp, amp, bus);
      for (const midi of note.midis) {
        const f = midiToFreq(midi);
        for (const cents of [-9, 0, 9]) {
          const horn = osc(ctx, "sawtooth", f);
          horn.detune.setValueAtTime(cents - 60, t);
          horn.detune.linearRampToValueAtTime(cents, t + 0.055);
          if (note.art.fall) {
            horn.frequency.setValueAtTime(f, end);
            horn.frequency.exponentialRampToValueAtTime(f * 0.6, end + 0.2);
          }
          chain(horn, gain(ctx, 0.33), lp);
          run(horn, t, stop);
        }
      }
    },
  };
}

/** Plunger-muted trombone: wide vibrato on long notes, legato slides, "wah" mute. */
export function createTrombone(ctx: BaseAudioContext, out: AudioNode): PitchedInstrument {
  return {
    play(t, note) {
      const f = midiToFreq(note.midis[0]);
      const end = t + Math.max(0.1, note.duration);
      const amp = gain(ctx, 0);
      const stop = adsr(amp.gain, t, note.velocity * 0.5, end, {
        attack: 0.045,
        decay: 0.3,
        sustain: 0.85,
        release: 0.14,
      });
      const mute = filter(ctx, "lowpass", 1100, 2.5);
      if (note.art.wah) {
        mute.frequency.setValueAtTime(320, t);
        mute.frequency.exponentialRampToValueAtTime(1500, t + Math.min(0.18, (end - t) * 0.5));
        mute.frequency.setTargetAtTime(500, end - 0.05, 0.08);
      }
      chain(mute, amp, out);
      const lfo = osc(ctx, "sine", 5.2);
      const depth = gain(ctx, 0);
      depth.gain.setValueAtTime(0, t);
      depth.gain.linearRampToValueAtTime(note.duration > 0.6 ? 45 : 12, Math.max(t + 0.2, end));
      lfo.connect(depth);
      run(lfo, t, stop);
      for (const [type, level] of [
        ["sawtooth", 0.5],
        ["square", 0.18],
      ] as const) {
        const horn = osc(ctx, type, f);
        depth.connect(horn.detune);
        if (note.glideFrom !== undefined && note.art.slide) {
          horn.frequency.setValueAtTime(midiToFreq(note.glideFrom), t);
          horn.frequency.exponentialRampToValueAtTime(f, t + 0.12);
        } else {
          horn.detune.setValueAtTime(-90, t);
          horn.detune.linearRampToValueAtTime(0, t + 0.08);
        }
        chain(horn, gain(ctx, level), mute);
        run(horn, t, stop);
      }
    },
  };
}
