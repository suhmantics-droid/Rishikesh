// Lays flyer cards out around their venues on the map without overlapping — a collage of
// flyers, each tied to its spot by a thin line. Pure geometry in screen pixels, so it can be tested.

export type CollageVenue = { key: string; x: number; y: number; cards: { w: number; h: number }[] };
export type Placement = { venue: string; card: number; dx: number; dy: number };
export type Collage = { placed: Placement[]; hidden: Record<string, number> };

type Rect = { x0: number; y0: number; x1: number; y1: number };
const overlaps = (a: Rect, b: Rect) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

/** Angles to try around a venue, starting straight up (cards read best above their pin). */
function angles(step: number) {
  const out = [-90];
  for (let d = step; d <= 180; d += step) {
    out.push(-90 + d);
    if (d < 180) out.push(-90 - d);
  }
  return out.map((a) => (a * Math.PI) / 180);
}

export function layoutCollage(venues: CollageVenue[], { gap = 6, maxPerVenue = 6, rings = 5 } = {}): Collage {
  const taken: Rect[] = [];
  // Every venue dot stays visible.
  for (const v of venues) taken.push({ x0: v.x - 6, y0: v.y - 6, x1: v.x + 6, y1: v.y + 6 });
  const placed: Placement[] = [];
  const hidden: Record<string, number> = {};

  // Round-robin across venues so a venue with many flyers can't take every good spot.
  const queue: { v: CollageVenue; i: number }[] = [];
  const most = Math.max(0, ...venues.map((v) => v.cards.length));
  for (let i = 0; i < most; i++) for (const v of venues) if (i < v.cards.length) queue.push({ v, i });

  for (const { v, i } of queue) {
    if (i >= maxPerVenue) {
      hidden[v.key] = (hidden[v.key] ?? 0) + 1;
      continue;
    }
    const { w, h } = v.cards[i];
    const candidates: [number, number][] = [[0, -(h / 2 + 14)]];
    const unit = Math.max(w, h) * 0.95;
    for (let r = 1; r <= rings; r++) {
      for (const a of angles(r <= 2 ? 30 : 20)) candidates.push([Math.cos(a) * unit * r, Math.sin(a) * unit * r]);
    }
    let spot: [number, number] | null = null;
    for (const [dx, dy] of candidates) {
      const rect = { x0: v.x + dx - w / 2 - gap, y0: v.y + dy - h / 2 - gap, x1: v.x + dx + w / 2 + gap, y1: v.y + dy + h / 2 + gap };
      if (!taken.some((t) => overlaps(t, rect))) {
        taken.push(rect);
        spot = [dx, dy];
        break;
      }
    }
    if (spot) placed.push({ venue: v.key, card: i, dx: Math.round(spot[0]), dy: Math.round(spot[1]) });
    else hidden[v.key] = (hidden[v.key] ?? 0) + 1;
  }
  return { placed, hidden };
}
