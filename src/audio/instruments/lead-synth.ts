/**
 * Quirky lead synth: two detuned pulse waves (25 % + 12.5 %) with a goofy pitch
 * "scoop" on attacks, delayed vibrato, portamento slides and comedic pitch falls.
 */
import { adsr } from "../synth/envelope";
import { chain, filter, gain, osc, run } from "../synth/nodes";
import { midiToFreq } from "../synth/pitch";
import { pulseWave } from "../synth/waves";
import type { PitchedInstrument } from "./types";

const PORTAMENTO = 0.07;

export function createLead(ctx: BaseAudioContext, out: AudioNode): PitchedInstrument {
  const tone = filter(ctx, "lowpass", 4200, 1.2);
  tone.connect(out);
  return {
    play(t, note) {
      const f = midiToFreq(note.midis[0]);
      const vel = note.velocity * (note.art.accent ? 1.1 : 1);
      const end = t + Math.max(0.05, note.duration);
      const amp = gain(ctx, 0);
      const stop = adsr(amp.gain, t, vel * 0.95, end, {
        attack: 0.006,
        decay: 0.25,
        sustain: 0.72,
        release: 0.06,
      });
      amp.connect(tone);

      // Delayed vibrato: depth fades in after the attack on longer notes.
      const lfo = osc(ctx, "sine", 5.8);
      const depth = gain(ctx, 0);
      depth.gain.setValueAtTime(0, t);
      depth.gain.linearRampToValueAtTime(note.duration > 0.25 ? 22 : 6, t + 0.3);
      lfo.connect(depth);
      run(lfo, t, stop);

      const voices: [number, number, number][] = [
        [0.25, 0, 0.6],
        [0.125, 9, 0.4],
      ];
      for (const [duty, cents, level] of voices) {
        const voice = osc(ctx, pulseWave(ctx, duty), f);
        voice.detune.value = cents;
        depth.connect(voice.detune);
        const fq = voice.frequency;
        if (note.glideFrom !== undefined && (note.art.slide || note.art.hammer)) {
          fq.setValueAtTime(midiToFreq(note.glideFrom), t);
          fq.exponentialRampToValueAtTime(f, t + (note.art.hammer ? 0.03 : PORTAMENTO));
        } else if (!note.art.staccato) {
          // Cartoon scoop up into the note.
          fq.setValueAtTime(f * 0.96, t);
          fq.exponentialRampToValueAtTime(f, t + 0.04);
        }
        if (note.art.fall) {
          fq.setValueAtTime(f, Math.max(t + 0.08, t + (end - t) * 0.3));
          fq.exponentialRampToValueAtTime(f * 0.25, end + 0.05);
        }
        chain(voice, gain(ctx, level), amp);
        run(voice, t, stop);
      }
    },
  };
}
