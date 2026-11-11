/** Registry of every looping music track, keyed by the public `MusicTrackId`. */
import type { MusicTrackId } from "../../audio-types";
import type { SongDef } from "../song-types";
import { boss } from "./boss";
import { miniboss } from "./miniboss";
import { secretLounge } from "./secret-lounge";
import { select } from "./select";
import { sewer } from "./sewer";
import { title } from "./title";

export const TRACKS: Record<MusicTrackId, SongDef> = {
  title,
  select,
  sewer,
  secret_lounge: secretLounge,
  miniboss,
  boss,
};
