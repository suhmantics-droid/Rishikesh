// Shared bits for generated share images (the preview WhatsApp and others show for a link).
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { getPhoto } from "./photos";
import { readFile as readStored } from "./storage";

const dir = path.join(process.cwd(), "assets/fonts");

export async function ogFonts() {
  const [regular, bold, display] = await Promise.all([
    readFile(path.join(dir, "inter-latin-400-normal.woff")),
    readFile(path.join(dir, "inter-latin-700-normal.woff")),
    readFile(path.join(dir, "display.woff")),
  ]);
  return [
    { name: "Inter", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Inter", data: bold, weight: 700 as const, style: "normal" as const },
    { name: "Display", data: display, weight: 600 as const, style: "normal" as const },
  ];
}

export const OG = {
  width: 1200,
  height: 630,
  paper: "#f6f1e7",
  ink: "#1d1b16",
  muted: "#6b655a",
  saffron: "#e8672a",
  line: "#e2d7c3",
  card: "#fffdf8",
  river: "linear-gradient(135deg, #3cc4b1 0%, #0f8a7e 55%, #0b5550 100%)",
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

export function Pin({ size = 44, light = false }: { size?: number; light?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="6" fill={OG.saffron} />
      <circle cx="10" cy="6.2" r="1.8" fill="#fff" opacity="0.55" />
      <path d="M12 14v8" stroke={light ? "#fff" : OG.ink} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
