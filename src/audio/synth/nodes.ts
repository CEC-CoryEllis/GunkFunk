/**
 * Terse constructors for Web Audio nodes so that instrument and SFX code reads as
 * signal flow ("osc → filter → gain → out") instead of property assignments.
 */

export type BasicWave = "sine" | "square" | "sawtooth" | "triangle";
export type Wave = BasicWave | PeriodicWave;

/** `PeriodicWave` is an empty interface in lib.dom, so `typeof` alone can't narrow it. */
function isBasicWave(wave: Wave): wave is BasicWave {
  return typeof wave === "string";
}

export function osc(ctx: BaseAudioContext, wave: Wave, frequency: number): OscillatorNode {
  const node = ctx.createOscillator();
  if (isBasicWave(wave)) node.type = wave;
  else node.setPeriodicWave(wave);
  node.frequency.value = frequency;
  return node;
}

export function gain(ctx: BaseAudioContext, value = 1): GainNode {
  const node = ctx.createGain();
  node.gain.value = value;
  return node;
}

export function filter(
  ctx: BaseAudioContext,
  type: BiquadFilterType,
  frequency: number,
  q = Math.SQRT1_2,
  gainDb = 0,
): BiquadFilterNode {
  const node = ctx.createBiquadFilter();
  node.type = type;
  node.frequency.value = frequency;
  node.Q.value = q;
  node.gain.value = gainDb;
  return node;
}

export function panner(ctx: BaseAudioContext, pan: number): StereoPannerNode {
  const node = ctx.createStereoPanner();
  node.pan.value = Math.max(-1, Math.min(1, pan));
  return node;
}

/** Connects the nodes in sequence and returns the last one. */
export function chain(...nodes: AudioNode[]): AudioNode {
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
  return nodes[nodes.length - 1];
}

/** Starts a source at `start` and schedules its stop. */
export function run(source: AudioScheduledSourceNode, start: number, stop: number): void {
  source.start(start);
  source.stop(Math.max(stop, start + 0.001));
}
