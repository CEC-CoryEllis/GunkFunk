/** Custom periodic waveforms (pulse widths, organ drawbars), cached per context. */

const HARMONICS = 64;
const cache = new WeakMap<BaseAudioContext, Map<string, PeriodicWave>>();

function cached(ctx: BaseAudioContext, key: string, build: () => PeriodicWave): PeriodicWave {
  let perContext = cache.get(ctx);
  if (!perContext) {
    perContext = new Map();
    cache.set(ctx, perContext);
  }
  let wave = perContext.get(key);
  if (!wave) {
    wave = build();
    perContext.set(key, wave);
  }
  return wave;
}

/** Band-limited pulse wave with the given duty cycle (0.5 = square). */
export function pulseWave(ctx: BaseAudioContext, duty: number): PeriodicWave {
  return cached(ctx, `pulse:${duty}`, () => {
    const real = new Float32Array(HARMONICS);
    const imag = new Float32Array(HARMONICS);
    for (let n = 1; n < HARMONICS; n++)
      real[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
    return ctx.createPeriodicWave(real, imag);
  });
}

/** Additive wave: `partials[k]` is the amplitude of harmonic k + 1. */
export function additiveWave(
  ctx: BaseAudioContext,
  name: string,
  partials: readonly number[],
): PeriodicWave {
  return cached(ctx, `additive:${name}`, () => {
    const real = new Float32Array(partials.length + 1);
    const imag = new Float32Array(partials.length + 1);
    partials.forEach((amp, i) => {
      imag[i + 1] = amp;
    });
    return ctx.createPeriodicWave(real, imag);
  });
}
