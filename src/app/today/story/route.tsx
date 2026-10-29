import { ImageResponse } from "next/og";
import sharp from "sharp";
import { getWhatsOn, type EventCard } from "@/lib/data";
import { addDays, daysLabel, formatDate, formatTime, whenRange } from "@/lib/dates";
import { OG, ogFonts, Tape } from "@/lib/og";
import { SITE } from "@/lib/site";
import { readFile } from "@/lib/storage";

// A 1080×1920 story of the day's flyers, for Instagram and WhatsApp status:
// /today/story (today), ?when=tomorrow or ?when=weekend.

const W = 1080;
const H = 1920;

async function flyerImage(id: string | null, w: number, h: number) {
  const image = id && (await readFile(`${id}.webp`));
  if (!image) return null;
  try {
    const jpg = await sharp(image).resize(w, h, { fit: "cover", position: "top" }).jpeg({ quality: 80 }).toBuffer();
    return `data:image/jpeg;base64,${jpg.toString("base64")}`;
  } catch {
    return null;
  }
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

function whenText(e: EventCard, single: boolean) {
  if (e.kind === "classes") return `${daysLabel(e.days) || "Weekly"} classes`;
  const t = formatTime(e.next.start_time);
  return single ? t || "All day" : `${formatDate(e.next.date).split(" ")[0]} ${t}`.trim();
}

export async function GET(req: Request) {
  const param = new URL(req.url).searchParams.get("when");
  const when = param === "tomorrow" || param === "weekend" ? param : "today";
  const { wall, today } = await getWhatsOn({ when });
  const { from, to } = whenRange(when, today);
  const single = from === to;
  const items = [...wall.filter((e) => e.kind !== "classes"), ...wall.filter((e) => e.kind === "classes")];
  const shown = items.slice(0, 6);
  // Sized so two rows of cards always clear the heading and the footer.
  const n = shown.length;
  const cols = n <= 4 ? 2 : 3;
  const [cardW, imgH, gap] = n === 1 ? [540, 720, 0] : n === 2 ? [420, 600, 44] : n <= 4 ? [380, 400, 44] : [270, 365, 22];
  const images = await Promise.all(shown.map((e) => flyerImage(e.flyer, cardW * 2, imgH * 2)));
  const heading = when === "today" ? "Today in Tapovan" : when === "tomorrow" ? "Tomorrow in Tapovan" : "Weekend in Tapovan";
  const dateLine = single ? formatDate(from) : `${formatDate(from)} to ${formatDate(to)}`;
  const host = SITE.url.replace(/^https?:\/\//, "");
  const tilt = [-2, 1.5, -1, 2, -1.5, 1];

  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: W, height: H, background: OG.paper, fontFamily: "Anek", position: "relative" }}>
        <div style={{ display: "flex", position: "absolute", left: 0, bottom: 0, width: W, height: 260, background: OG.dusk }} />
        <div style={{ display: "flex", flexDirection: "column", padding: "84px 72px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Tape width={72} />
            <span style={{ fontFamily: "AnekCond", fontSize: 46, color: OG.ink }}>{SITE.name}</span>
            <span style={{ fontSize: 30, color: OG.muted, marginLeft: 4 }}>{SITE.place}</span>
          </div>
          <span style={{ fontFamily: "AnekCond", fontSize: 100, color: OG.ink, letterSpacing: -2, lineHeight: 1.02, marginTop: 44 }}>{heading}</span>
          <span style={{ fontSize: 44, color: OG.accent, fontWeight: 700, marginTop: 12 }}>{dateLine}</span>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap, padding: "52px 60px 0" }}>
          {shown.length === 0 ? (
            <span style={{ fontSize: 46, color: OG.muted, marginTop: 120, textAlign: "center", width: 900 }}>
              Nothing pinned yet. See the week ahead on the wall.
            </span>
          ) : (
            shown.map((e, i) => (
              <div
                key={e.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: cardW + 20,
                  padding: 10,
                  background: OG.card,
                  boxShadow: "0 10px 30px rgba(40,25,5,0.28)",
                  transform: `rotate(${tilt[i % tilt.length]}deg)`,
                }}
              >
                {images[i] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- rendered to a PNG by next/og, not the browser
                  <img src={images[i]!} width={cardW} height={imgH} alt="" />
                ) : (
                  <div style={{ display: "flex", width: cardW, height: imgH, background: OG.line }} />
                )}
                <div style={{ display: "flex", flexDirection: "column", padding: "12px 4px 4px" }}>
                  <span style={{ fontSize: cols === 2 ? 30 : 24, fontWeight: 700, color: OG.ink }}>{whenText(e, single)}</span>
                  <span style={{ fontSize: cols === 2 ? 32 : 25, fontWeight: 700, color: OG.ink, lineHeight: 1.15, marginTop: 4 }}>{clip(e.title, cols === 2 ? 40 : 30)}</span>
                  <span style={{ fontSize: cols === 2 ? 26 : 21, color: OG.muted, marginTop: 4 }}>{clip(e.venue.name, 30)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "absolute", left: 0, bottom: 70, width: W }}>
          {items.length > shown.length ? (
            <span style={{ fontSize: 34, color: OG.duskInk, marginBottom: 18 }}>+{items.length - shown.length} more on the wall</span>
          ) : null}
          <div style={{ display: "flex", alignItems: "center", gap: 16, background: "#fff", borderRadius: 60, padding: "22px 44px" }}>
            <span style={{ fontSize: 36, color: OG.ink, fontWeight: 700 }}>Every flyer, on one wall:</span>
            <span style={{ fontSize: 36, color: OG.accent, fontWeight: 700 }}>{host}</span>
          </div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: await ogFonts(),
      headers: { "Cache-Control": "public, max-age=600", "Content-Disposition": `inline; filename="tapovan-${when}-${addDays(today, 0)}.png"` },
    },
  );
}
