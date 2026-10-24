// Straightens a photo of a flyer taken at an angle on a wall: maps the flyer's four corners
// onto a flat rectangle (a perspective transform), cropping away the wall around it.

import sharp from "sharp";

export type Pt = [number, number];
/** Corners as fractions (0–1) of the photo's width and height: top-left, top-right, bottom-right, bottom-left. */
export type Corners = [Pt, Pt, Pt, Pt];

const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Solves A·x = b for an 8×8 system (Gaussian elimination with partial pivoting). */
function solve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    if (Math.abs(M[c][c]) < 1e-12) throw new Error("Those corners don't make a shape we can straighten.");
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

/** Homography taking output pixel (u, v) to source pixel (x, y). */
export function homography(src: Corners, w: number, h: number) {
  const dst: Corners = [
    [0, 0],
    [w - 1, 0],
    [w - 1, h - 1],
    [0, h - 1],
  ];
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [u, v] = dst[i];
    const [x, y] = src[i];
    A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]);
    b.push(x);
    A.push([0, 0, 0, u, v, 1, -u * y, -v * y]);
    b.push(y);
  }
  const [a, bb, c, d, e, f, g, hh] = solve(A, b);
  return (u: number, v: number): Pt => {
    const z = g * u + hh * v + 1;
    return [(a * u + bb * v + c) / z, (d * u + e * v + f) / z];
  };
}

/** Returns a JPEG of the flyer, flattened and cropped to its corners. */
export async function straighten(input: Buffer, corners: Corners, maxSide = 2000): Promise<Buffer> {
  const { data, info } = await sharp(input).rotate().removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const src = corners.map(([x, y]) => [Math.min(1, Math.max(0, x)) * (W - 1), Math.min(1, Math.max(0, y)) * (H - 1)] as Pt) as Corners;
  let w = Math.max(dist(src[0], src[1]), dist(src[3], src[2]));
  let h = Math.max(dist(src[0], src[3]), dist(src[1], src[2]));
  if (w < 40 || h < 40) throw new Error("That crop is too small.");
  const scale = Math.min(1, maxSide / Math.max(w, h));
  w = Math.round(w * scale);
  h = Math.round(h * scale);
  const map = homography(src, w, h);
  const out = Buffer.alloc(w * h * 3);
  for (let v = 0; v < h; v++) {
    for (let u = 0; u < w; u++) {
      const [x, y] = map(u, v);
      // Bilinear sample, clamped to the photo's edges.
      const x0 = Math.max(0, Math.min(W - 2, Math.floor(x)));
      const y0 = Math.max(0, Math.min(H - 2, Math.floor(y)));
      const fx = Math.max(0, Math.min(1, x - x0));
      const fy = Math.max(0, Math.min(1, y - y0));
      const i00 = (y0 * W + x0) * C;
      const i10 = i00 + C;
      const i01 = i00 + W * C;
      const i11 = i01 + C;
      const o = (v * w + u) * 3;
      for (let k = 0; k < 3; k++) {
        const top = data[i00 + k] + (data[i10 + k] - data[i00 + k]) * fx;
        const bot = data[i01 + k] + (data[i11 + k] - data[i01 + k]) * fx;
        out[o + k] = top + (bot - top) * fy;
      }
    }
  }
  return sharp(out, { raw: { width: w, height: h, channels: 3 } }).jpeg({ quality: 92 }).toBuffer();
}

/** True when the corners are close to the photo's own edges, i.e. there's nothing to straighten. */
export function isWholeImage(c: Corners, tolerance = 0.01) {
  const full: Corners = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ];
  return c.every((p, i) => dist(p, full[i]) < tolerance);
}
