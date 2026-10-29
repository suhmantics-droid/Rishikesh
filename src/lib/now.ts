import type { AgendaItem } from "./data";
import { TONIGHT_FROM } from "./site";

/** "Now" means on now, or starting in the next two hours. */
export const SOON_MINUTES = 120;

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** On now, or starting within the next two hours. Finished sessions are already left out of the agenda. */
export function nowOrSoon(o: AgendaItem, now: string) {
  if (!o.occ.start_time) return false;
  return toMin(o.occ.start_time) <= toMin(now) + SOON_MINUTES;
}

/** Starts from 6pm, or is still going at 6pm. */
export function isTonight(o: AgendaItem) {
  const s = o.occ.start_time;
  if (!s) return false;
  return s >= TONIGHT_FROM || (!!o.occ.end_time && o.occ.end_time > TONIGHT_FROM);
}
