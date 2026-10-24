// Reads the QR codes printed on a flyer. Half of Tapovan's flyers carry one (WhatsApp, Instagram,
// a booking form, a Google Maps pin) — useless to someone looking at the flyer on their own phone,
// so we turn them into links they can tap.

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { FlyerLink } from "./links";
import { safeUrl } from "./util";

export { LINK_LABELS, type FlyerLink, type LinkKind } from "./links";

type Reader = typeof import("zxing-wasm/reader");
let reader: Promise<Reader> | null = null;

function loadReader() {
  reader ??= (async () => {
    const mod = await import("zxing-wasm/reader");
    // Hand the WebAssembly binary over directly: the library's own loader expects a browser fetch().
    const wasm = fs.readFileSync(path.join(process.cwd(), "node_modules/zxing-wasm/dist/reader/zxing_reader.wasm"));
    await mod.prepareZXingModule({
      overrides: { wasmBinary: wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength) as ArrayBuffer },
      fireImmediately: true,
    });
    return mod;
  })();
  return reader;
}

/**
 * Every QR code's text. Scans twice: large (small codes need the pixels — smaller photos are
 * enlarged for this pass) and medium (blurry codes read better smaller).
 */
export async function scanQr(image: Buffer): Promise<string[]> {
  const { readBarcodes } = await loadReader();
  const found = new Set<string>();
  for (const size of [2600, 1600]) {
    const { data, info } = await sharp(image)
      .rotate()
      .resize(size, size, { fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const results = await readBarcodes(
      { data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength), width: info.width, height: info.height, colorSpace: "srgb" },
      { formats: ["QRCode"], tryHarder: true, maxNumberOfSymbols: 12 },
    );
    for (const r of results) if (r.isValid && r.text) found.add(r.text.trim());
  }
  return [...found];
}

/** Sorts a scanned code into something we can show as a button. Payment codes (upi://) are left out on purpose. */
export function classifyLink(text: string): FlyerLink | null {
  let raw = text.trim();
  if (/^www\./i.test(raw)) raw = `https://${raw}`;
  if (!/^https?:\/\//i.test(raw)) return null;
  const url = safeUrl(raw); // also lower-cases the scheme and host ("HTTPS://SITE.COM" is common on posters)
  if (!url) return null;
  const host = new URL(url).hostname.replace(/^www\./, "");
  if (host === "chat.whatsapp.com") return { kind: "whatsapp-group", url };
  if (host === "wa.me" || host === "api.whatsapp.com" || host === "whatsapp.com") return { kind: "whatsapp", url };
  if (host === "instagram.com" || host === "instagr.am") return { kind: "instagram", url };
  if (host === "maps.app.goo.gl" || host === "goo.gl" || host.startsWith("maps.google.") || (host.startsWith("google.") && url.includes("/maps"))) {
    return { kind: "map", url };
  }
  if (host === "forms.gle" || (host === "docs.google.com" && url.includes("/forms/"))) return { kind: "form", url };
  return { kind: "website", url };
}

export function linksFromCodes(codes: string[]): FlyerLink[] {
  const out: FlyerLink[] = [];
  for (const c of codes) {
    const l = classifyLink(c);
    if (l && !out.some((o) => o.url === l.url)) out.push(l);
  }
  return out.slice(0, 8);
}

/** Phone digits from a wa.me/<number> link, if it has one. */
export function phoneFromWaLink(url: string): string | null {
  const m = url.match(/wa\.me\/(\d{10,15})/) ?? url.match(/[?&]phone=(\d{10,15})/);
  return m ? `+${m[1]}` : null;
}
