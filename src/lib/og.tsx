// Shared bits for generated share images (the preview WhatsApp and others show for a link).
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { getPhoto } from "./photos";
import { readFile as readStored } from "./storage";

const dir = path.join(process.cwd(), "assets/fonts");

export async function ogFonts() {
  const [regular, bold, cond] = await Promise.all([
    readFile(path.join(dir, "anek-400.woff")),
    readFile(path.join(dir, "anek-700.woff")),
    readFile(path.join(dir, "anek-800-condensed.woff")),
  ]);
  return [
    { name: "Anek", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Anek", data: bold, weight: 700 as const, style: "normal" as const },
    { name: "AnekCond", data: cond, weight: 800 as const, style: "normal" as const },
  ];
}

// The Wall palette: lime-washed wall, paper slips, ink, marigold for now, jade for actions, dusk for evening.
export const OG = {
  width: 1200,
  height: 630,
  paper: "#eae8e3",
  ink: "#1b1a17",
  muted: "#4e4b44",
  accent: "#0b5f54",
  now: "#f2a33a",
  line: "#cfcbc2",
  card: "#fffdf7",
  tape: "rgba(222,203,150,0.85)",
  dusk: "#2a2320",
  duskInk: "#f6e7c8",
};

/** The uploaded banner photo, cropped to the share-image size, as a data URL (or null). */
export async function heroPhotoDataUrl(width = OG.width, height = OG.height) {
  const photo = await getPhoto("hero");
  const image = photo && (await readStored(`${photo.id}.webp`));
  if (!image) return null;
  try {
    const jpg = await sharp(image).resize(width, height, { fit: "cover" }).jpeg({ quality: 82 }).toBuffer();
    return `data:image/jpeg;base64,${jpg.toString("base64")}`;
  } catch {
    return null;
  }
}

/** A strip of tape, the brand's small mark: a flyer pinned to the wall. */
export function Tape({ width = 64, rotate = -4 }: { width?: number; rotate?: number }) {
  return <div style={{ display: "flex", width, height: Math.round(width * 0.36), background: OG.tape, transform: `rotate(${rotate}deg)` }} />;
}
