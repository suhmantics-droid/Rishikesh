import assert from "node:assert/strict";
import { test } from "node:test";
import { layoutCollage } from "../src/lib/collage";

test("collage cards never overlap each other or a venue dot", () => {
  // Six venues within a few pixels of each other, as on a zoomed-out Tapovan map.
  const venues = Array.from({ length: 6 }, (_, v) => ({
    key: `v${v}`,
    x: 400 + (v % 3) * 20,
    y: 300 + Math.floor(v / 3) * 20,
    cards: Array.from({ length: 3 }, () => ({ w: 58, h: 72 })),
  }));
  const { placed, hidden } = layoutCollage(venues);
  assert.equal(placed.length + Object.values(hidden).reduce((a, b) => a + b, 0), 18);
  const rects = placed.map((p) => {
    const v = venues.find((x) => x.key === p.venue)!;
    return { x0: v.x + p.dx - 29, x1: v.x + p.dx + 29, y0: v.y + p.dy - 36, y1: v.y + p.dy + 36 };
  });
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i];
      const b = rects[j];
      assert.ok(!(a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1), `cards ${i} and ${j} overlap`);
    }
    for (const v of venues) assert.ok(!(rects[i].x0 < v.x && v.x < rects[i].x1 && rects[i].y0 < v.y && v.y < rects[i].y1), "a card covers a venue dot");
  }
});

test("a lone flyer sits straight above its venue", () => {
  const { placed } = layoutCollage([{ key: "a", x: 0, y: 0, cards: [{ w: 50, h: 60 }] }]);
  assert.deepEqual(placed, [{ venue: "a", card: 0, dx: 0, dy: -44 }]);
});
