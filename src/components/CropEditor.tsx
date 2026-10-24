"use client";

import { useRef, useState } from "react";

export type Corners = [[number, number], [number, number], [number, number], [number, number]];

const DEFAULT: Corners = [
  [0.06, 0.05],
  [0.94, 0.05],
  [0.94, 0.95],
  [0.06, 0.95],
];
const clamp = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Drag four dots onto the flyer's corners; the server flattens and crops the photo to them.
 * Made for phone photos of flyers taped to walls, shot at an angle.
 */
export function CropEditor({
  src,
  initial,
  onCancel,
  onDone,
}: {
  src: string;
  initial?: Corners | null;
  onCancel: () => void;
  onDone: (corners: Corners) => Promise<void>;
}) {
  const [pts, setPts] = useState<Corners>(initial ?? DEFAULT);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const dragging = useRef<number | null>(null);

  function move(e: React.PointerEvent) {
    const i = dragging.current;
    if (i == null || !box.current) return;
    const r = box.current.getBoundingClientRect();
    const p: [number, number] = [clamp((e.clientX - r.left) / r.width), clamp((e.clientY - r.top) / r.height)];
    setPts((cur) => cur.map((q, j) => (j === i ? p : q)) as Corners);
  }

  async function apply() {
    setBusy(true);
    setError(null);
    try {
      await onDone(pts);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  const poly = pts.map(([x, y]) => `${x * 100},${y * 100}`).join(" ");
  return (
    <div className="fixed inset-0 z-[2000] flex flex-col bg-black/90 p-3 text-white" role="dialog" aria-modal aria-label="Straighten the flyer">
      <p className="text-center text-sm font-semibold">Drag the four dots onto the corners of the flyer</p>
      <p className="mb-2 text-center text-xs text-white/70">We&apos;ll flatten it and cut away the wall around it.</p>
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div ref={box} className="relative touch-none select-none" onPointerMove={move} onPointerUp={() => (dragging.current = null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="Your photo" draggable={false} className="block max-h-[calc(100svh-11rem)] max-w-full" />
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <defs>
              <mask id="crop-outside">
                <rect width="100" height="100" fill="white" />
                <polygon points={poly} fill="black" />
              </mask>
            </defs>
            <rect width="100" height="100" fill="rgba(0,0,0,.55)" mask="url(#crop-outside)" />
            <polygon points={poly} fill="none" stroke="#ff8a3d" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </svg>
          {pts.map(([x, y], i) => (
            <button
              key={i}
              type="button"
              aria-label={["Top-left corner", "Top-right corner", "Bottom-right corner", "Bottom-left corner"][i]}
              onPointerDown={(e) => {
                dragging.current = i;
                (e.currentTarget.parentElement as HTMLElement).setPointerCapture(e.pointerId);
              }}
              className="absolute h-9 w-9 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-[3px] border-white bg-[#e8672a]/80 shadow-lg active:cursor-grabbing"
              style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
            />
          ))}
        </div>
      </div>
      {error ? <p className="mt-2 text-center text-sm font-semibold text-red-300">{error}</p> : null}
      <div className="mx-auto mt-3 flex w-full max-w-md gap-2">
        <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-white/30 py-3 font-bold">
          Cancel
        </button>
        <button type="button" onClick={() => setPts(DEFAULT)} className="rounded-xl border border-white/30 px-4 py-3 font-bold">
          Reset
        </button>
        <button type="button" onClick={apply} disabled={busy} className="flex-1 rounded-xl bg-saffron py-3 font-extrabold text-white disabled:opacity-60">
          {busy ? "Straightening…" : "Straighten"}
        </button>
      </div>
    </div>
  );
}
