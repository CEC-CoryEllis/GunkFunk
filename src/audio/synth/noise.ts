/** Noise buffers (cached per context) and noise sources. */
import { createRng } from "./random";

export type NoiseColor = "white" | "pink" | "brown";

const BUFFER_SECONDS = 2;
const cache = new WeakMap<BaseAudioContext, Map<NoiseColor, AudioBuffer>>();
const offsetRng = createRng(0x5eed);

function noiseBuffer(ctx: BaseAudioContext, color: NoiseColor = "white"): AudioBuffer {
  let perContext = cache.get(ctx);
  if (!perContext) {
    perContext = new Map();
    cache.set(ctx, perContext);
  }
  let buffer = perContext.get(color);
  if (!buffer) {
    buffer = createNoiseBuffer(ctx, color);
    perContext.set(color, buffer);
  }
  return buffer;
}

/**
 * A looping noise source that starts at a pseudo-random offset (so repeated hits
 * never sound identical) and stops at `stop`.
 */
export function noiseSource(
  ctx: BaseAudioContext,
  color: NoiseColor,
  start: number,
  stop: number,
): AudioBufferSourceNode {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx, color);
  source.loop = true;
  source.start(start, offsetRng() * (BUFFER_SECONDS - 0.1));
  source.stop(Math.max(stop, start + 0.001));
  return source;
}

function createNoiseBuffer(ctx: BaseAudioContext, color: NoiseColor): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * BUFFER_SECONDS);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const rng = createRng(color === "white" ? 1 : color === "pink" ? 2 : 3);
  if (color === "white") {
    for (let i = 0; i < length; i++) data[i] = rng() * 2 - 1;
  } else if (color === "pink") {
    fillPink(data, rng);
  } else {
    let last = 0;
    for (let i = 0; i < length; i++) {
      last = (last + 0.02 * (rng() * 2 - 1)) / 1.02;
      data[i] = last * 3.5;
    }
  }
  return buffer;
}

/** Paul Kellet's refined pink-noise filter. */
function fillPink(data: Float32Array, rng: () => number): void {
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;
  for (let i = 0; i < data.length; i++) {
    const white = rng() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
}
