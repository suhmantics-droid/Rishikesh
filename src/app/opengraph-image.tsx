import { ImageResponse } from "next/og";
import { connection } from "next/server";
import { heroPhotoDataUrl, OG, ogFonts, Tape } from "@/lib/og";
import { SITE } from "@/lib/site";

export const alt = `${SITE.name}: every flyer in Tapovan, Rishikesh, on one wall`;
export const size = { width: OG.width, height: OG.height };
export const contentType = "image/png";

// Your banner photo of the Ganga with the headline over it; river colours until one is uploaded.
export default async function Image() {
  await connection();
  const photo = await heroPhotoDataUrl();
  return new ImageResponse(
    (
      <div style={{ display: "flex", position: "relative", width: "100%", height: "100%", background: OG.dusk, fontFamily: "Anek" }}>
        {photo ? <img src={photo} width={OG.width} height={OG.height} style={{ position: "absolute", top: 0, left: 0 }} alt="" /> : null}
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 0,
            left: 0,
            width: OG.width,
            height: OG.height,
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "56px 72px",
            backgroundImage: "linear-gradient(to top, rgba(0,0,0,0.62), rgba(0,0,0,0.12))",
            color: "#fff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Tape />
            <span style={{ fontFamily: "AnekCond", fontSize: 44 }}>{SITE.name}</span>
            <span style={{ fontSize: 28, opacity: 0.85 }}>{SITE.place}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontFamily: "AnekCond", fontSize: 96, lineHeight: 1.02, letterSpacing: -1 }}>Every flyer in Tapovan, on one wall</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18 }}>
              <span style={{ fontSize: 32, opacity: 0.92 }}>Yoga · kirtan · sound · live music · satsang</span>
              <span style={{ fontSize: 26, fontWeight: 700 }}>{SITE.url.replace(/^https?:\/\//, "")}</span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
