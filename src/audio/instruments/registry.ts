/** Instrument factories by id, as referenced from song data. */
import { createSlapBass, createSoftBass } from "./bass";
import { createBrass, createTrombone } from "./brass";
import { createClav } from "./clav";
import { createDistGuitar } from "./dist-guitar";
import { createEPiano, createOrgan, createVibes } from "./keys";
import { createLead } from "./lead-synth";
import type { InstrumentFactory, InstrumentId } from "./types";

export const INSTRUMENTS: Record<InstrumentId, InstrumentFactory> = {
  slapBass: createSlapBass,
  softBass: createSoftBass,
  clav: createClav,
  distGuitar: createDistGuitar,
  lead: createLead,
  brass: createBrass,
  trombone: createTrombone,
  organ: createOrgan,
  vibes: createVibes,
  epiano: createEPiano,
};

export { createDrumKit } from "./drum-kit";
