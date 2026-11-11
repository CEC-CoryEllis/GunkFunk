/** Waveshaper transfer curves (context-independent, cached) and a node factory. */

const CURVE_SIZE = 2048;
const curves = new Map<string, Float32Array<ArrayBuffer>>();

function buildCurve(key: string, transfer: (x: number) => number): Float32Array<ArrayBuffer> {
  const cached = curves.get(key);
  if (cached) return cached;
  const curve = new Float32Array(CURVE_SIZE);
  for (let i = 0; i < CURVE_SIZE; i++) {
    const x = (i / (CURVE_SIZE - 1)) * 2 - 1;
    curve[i] = transfer(x);
  }
  curves.set(key, curve);
  return curve;
}

/** Smooth tanh saturation, normalised so that ±1 maps to ±1. */
export function driveCurve(drive: number): Float32Array<ArrayBuffer> {
  const norm = Math.tanh(drive);
  return buildCurve(`drive:${drive}`, (x) => Math.tanh(drive * x) / norm);
}

/** Aggressive, slightly asymmetric fuzz for distorted guitars and monster voices. */
export function fuzzCurve(drive: number): Float32Array<ArrayBuffer> {
  const norm = 1 - Math.exp(-drive);
  return buildCurve(`fuzz:${drive}`, (x) => {
    const shaped = (Math.sign(x) * (1 - Math.exp(-drive * Math.abs(x)))) / norm;
    return x > 0 ? shaped : shaped * 0.92;
  });
}

/**
 * Transparent below `knee`, then a tanh shoulder that never exceeds `ceiling`.
 * Used as the master safety limiter.
 */
export function limiterCurve(knee: number, ceiling: number): Float32Array<ArrayBuffer> {
  const room = ceiling - knee;
  return buildCurve(`limit:${knee}:${ceiling}`, (x) => {
    const mag = Math.abs(x);
    if (mag <= knee) return x;
    return Math.sign(x) * (knee + room * Math.tanh((mag - knee) / room));
  });
}

export function shaper(
  ctx: BaseAudioContext,
  curve: Float32Array<ArrayBuffer>,
  oversample: OverSampleType = "2x",
): WaveShaperNode {
  const node = ctx.createWaveShaper();
  node.curve = curve;
  node.oversample = oversample;
  return node;
}
