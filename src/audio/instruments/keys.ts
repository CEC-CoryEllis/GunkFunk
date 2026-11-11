/**
 * Keyboards for the muzak and the boss: drawbar organ with tremolo, vibraphone with
 * motor tremolo, and an FM electric piano with auto-pan.
 */
import { adsr, pluck } from "../synth/envelope";
import { noiseSource } from "../synth/noise";
import { chain, filter, gain, osc, panner, run } from "../synth/nodes";
import { midiToFreq } from "../synth/pitch";
import { additiveWave } from "../synth/waves";
import type { PitchedInstrument } from "./types";

/** A free-running LFO modulating `param` around its value; returns a stopper. */
function lfo(ctx: BaseAudioContext, param: AudioParam, rate: number, depth: number): () => void {
  const source = osc(ctx, "sine", rate);
  const amount = gain(ctx, depth);
  chain(source, amount);
  amount.connect(param);
  source.start();
  return () => {
    source.stop();
    source.disconnect();
  };
}

const DRAWBARS = [1, 0.75, 0.45, 0.35, 0, 0.18, 0, 0.12];

export function createOrgan(ctx: BaseAudioContext, out: AudioNode): PitchedInstrument {
  const tremolo = gain(ctx, 0.85);
  chain(tremolo, filter(ctx, "lowpass", 5500), out);
  const stopLfo = lfo(ctx, tremolo.gain, 6.3, 0.12);
  return {
    play(t, note) {
      const end = t + Math.max(0.06, note.duration);
      const amp = gain(ctx, 0);
      const peak = (note.velocity * 0.58) / Math.sqrt(note.midis.length);
      const stop = adsr(amp.gain, t, peak, end, {
        attack: 0.006,
        decay: 0.1,
        sustain: 1,
        release: 0.06,
      });
      amp.connect(tremolo);
      for (const midi of note.midis) {
        const pipe = osc(ctx, additiveWave(ctx, "drawbar", DRAWBARS), midiToFreq(midi));
        pipe.connect(amp);
        run(pipe, t, stop);
      }
      const click = noiseSource(ctx, "white", t, t + 0.02);
      const clickLevel = gain(ctx, 0);
      pluck(clickLevel.gain, t, note.velocity * 0.05, 0.0005, 0.008);
      chain(click, filter(ctx, "highpass", 2500), clickLevel, out);
    },
    dispose: stopLfo,
  };
}

export function createVibes(ctx: BaseAudioContext, out: AudioNode): PitchedInstrument {
  const motor = gain(ctx, 0.8);
  motor.connect(out);
  const stopLfo = lfo(ctx, motor.gain, 5.2, 0.22);
  return {
    play(t, note) {
      const dampAt = t + Math.max(0.25, note.duration + 0.2);
      for (const midi of note.midis) {
        const f = midiToFreq(midi);
        const partials: [number, number, number][] = [
          [1, 0.42, 2.2],
          [4, 0.09, 0.45],
          [10, 0.03, 0.05],
        ];
        for (const [ratio, level, decay] of partials) {
          const bar = osc(ctx, "sine", f * ratio);
          const amp = gain(ctx, 0);
          const peak = (note.velocity * level) / Math.sqrt(note.midis.length);
          amp.gain.setValueAtTime(0, t);
          amp.gain.linearRampToValueAtTime(peak, t + 0.002);
          amp.gain.setTargetAtTime(0, t + 0.002, decay / 4);
          amp.gain.setTargetAtTime(0, dampAt, 0.08);
          chain(bar, amp, motor);
          run(bar, t, Math.min(t + decay * 1.3, dampAt + 0.4));
        }
      }
    },
    dispose: stopLfo,
  };
}

export function createEPiano(ctx: BaseAudioContext, out: AudioNode): PitchedInstrument {
  const pan = panner(ctx, 0);
  pan.connect(out);
  const stopLfo = lfo(ctx, pan.pan, 3.2, 0.45);
  return {
    play(t, note) {
      const end = t + Math.max(0.1, note.duration);
      for (const midi of note.midis) {
        const f = midiToFreq(midi);
        const carrier = osc(ctx, "sine", f);
        const modulator = osc(ctx, "sine", f);
        const index = gain(ctx, 0);
        index.gain.setValueAtTime(f * 2.4 * note.velocity, t);
        index.gain.setTargetAtTime(f * 0.25, t, 0.18);
        chain(modulator, index);
        index.connect(carrier.frequency);
        const amp = gain(ctx, 0);
        const stop = adsr(amp.gain, t, (note.velocity * 0.3) / Math.sqrt(note.midis.length), end, {
          attack: 0.003,
          decay: 1.4,
          sustain: 0.35,
          release: 0.3,
        });
        chain(carrier, amp, pan);
        run(carrier, t, stop);
        run(modulator, t, stop);
      }
    },
    dispose: stopLfo,
  };
}
