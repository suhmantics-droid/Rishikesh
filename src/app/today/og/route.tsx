import { ImageResponse } from "next/og";
import { getWhatsOn } from "@/lib/data";
import { formatDate, formatTime } from "@/lib/dates";
import { OG, ogFonts, Pin } from "@/lib/og";
import { category, SITE } from "@/lib/site";

// Share image for /today: the day's list as a picture, so a link pasted into a WhatsApp group
// already shows what's on. The page links here with ?d=<date> so chat apps don't reuse yesterday's.
export async function GET() {
  const { agenda, today } = await getWhatsOn({ when: "today" });
  // Events lead; class timetables only fill spare rows.
  const ordered = [...agenda.filter((e) => e.kind !== "classes"), ...agenda.filter((e) => e.kind === "classes")];
  const items = ordered.slice(0, 6);
  return new ImageResponse(
    (
      <div style={{ display: "flex", position: "relative", width: "100%", height: "100%", background: OG.paper, padding: "44px 64px", flexDirection: "column", fontFamily: "Inter" }}>
        <div style={{ display: "flex", position: "absolute", left: 0, bottom: 0, width: 1200, height: 22, backgroundImage: OG.river }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Pin size={38} />
            <span style={{ fontFamily: "Display", fontSize: 36, color: OG.ink }}>{SITE.name}</span>
          </div>
          <span style={{ fontSize: 26, color: OG.muted }}>{SITE.url.replace(/^https?:\/\//, "")}</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 26 }}>
          <span style={{ fontFamily: "Display", fontSize: 64, color: OG.ink, letterSpacing: -1 }}>Today in Tapovan</span>
          <span style={{ fontSize: 30, color: OG.saffron, fontWeight: 700 }}>{formatDate(today)}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 22, gap: 10 }}>
          {items.length === 0 ? (
            <span style={{ fontSize: 34, color: OG.muted }}>Nothing pinned for today yet — see the week ahead.</span>
          ) : (
            items.map((e) => (
              <div key={`${e.id}-${e.occ.start_time}`} style={{ display: "flex", alignItems: "center", gap: 20, background: OG.card, border: `2px solid ${OG.line}`, borderRadius: 18, padding: "10px 22px" }}>
                <span style={{ width: 120, fontSize: 28, fontWeight: 700, color: OG.ink }}>{formatTime(e.occ.start_time) || "All day"}</span>
                <span style={{ width: 14, height: 14, borderRadius: 7, background: category(e.category).color }} />
                <span style={{ flex: 1, fontSize: 30, fontWeight: 700, color: OG.ink, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{e.occ.label ?? e.title}</span>
                <span style={{ fontSize: 24, color: OG.muted, maxWidth: 330, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{e.venue.name}</span>
              </div>
            ))
          )}
          {agenda.length > items.length ? <span style={{ fontSize: 26, color: OG.muted, marginTop: 4 }}>+ {agenda.length - items.length} more on the map</span> : null}
        </div>
      </div>
    ),
    { width: OG.width, height: OG.height, fonts: await ogFonts(), headers: { "Cache-Control": "public, max-age=600" } },
  );
}
