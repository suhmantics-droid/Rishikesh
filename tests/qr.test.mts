import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const { classifyLink, linksFromCodes, scanQr } = await import("../src/lib/qr");
const { straighten } = await import("../src/lib/warp");
const sharp = (await import("sharp")).default;

test("QR links are sorted into buttons; payment codes are dropped", () => {
  assert.equal(classifyLink("https://chat.whatsapp.com/abc")?.kind, "whatsapp-group");
  assert.equal(classifyLink("https://wa.me/message/XYZ?src=qr")?.kind, "whatsapp");
  assert.equal(classifyLink("https://maps.app.goo.gl/8z3iTPWDy7LTff8e9")?.kind, "map");
  assert.equal(classifyLink("https://forms.gle/yDcfWK8K1bANLdzh7")?.kind, "form");
  assert.equal(classifyLink("https://www.instagram.com/tapashala.rishikesh?igsh=1")?.kind, "instagram");
  assert.deepEqual(classifyLink("HTTPS://WONDERGROUNDTHEFESTIVAL.COM"), { kind: "website", url: "https://wondergroundthefestival.com/" });
  assert.equal(classifyLink("upi://pay?pa=someone@bank"), null);
  assert.equal(classifyLink("javascript:alert(1)"), null);
  assert.equal(linksFromCodes(["https://a.example", "https://a.example", "upi://pay?pa=x"]).length, 1);
});

test("reads every QR code on a real flyer", async () => {
  const codes = await scanQr(fs.readFileSync("seed/starter/tapashala.webp"));
  assert.ok(codes.some((c) => c.startsWith("https://maps.app.goo.gl/")));
  assert.ok(codes.some((c) => c.startsWith("https://wa.me/")));
});

test("straightening maps the corners onto a flat rectangle", async () => {
  // A white 400x600 image with a black square in the top-left quarter of the region we crop.
  const img = await sharp({ create: { width: 400, height: 600, channels: 3, background: "#ffffff" } })
    .composite([{ input: await sharp({ create: { width: 100, height: 150, channels: 3, background: "#000000" } }).png().toBuffer(), left: 100, top: 150 }])
    .png()
    .toBuffer();
  const out = await straighten(img, [
    [0.25, 0.25],
    [0.75, 0.25],
    [0.75, 0.75],
    [0.25, 0.75],
  ]);
  const { data, info } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
  assert.ok(Math.abs(info.width - 200) <= 1 && Math.abs(info.height - 300) <= 1);
  const px = (x: number, y: number) => data[(y * info.width + x) * info.channels];
  assert.ok(px(20, 20) < 40, "top-left of the crop is the black square");
  assert.ok(px(info.width - 20, info.height - 20) > 215, "bottom-right is white");
});
