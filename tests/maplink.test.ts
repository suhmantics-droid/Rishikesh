import assert from "node:assert/strict";
import { test } from "node:test";
import { coordsFromText, resolveMapLink } from "../src/lib/maplink";

test("reads coordinates from the usual kinds of Google Maps links", () => {
  const place =
    "https://www.google.com/maps/place/Tapashala/@30.1301,78.3190,17z/data=!3m1!4b1!4m6!3m5!1s0x39093f:0x1!8m2!3d30.1325961!4d78.3207234!16s";
  assert.deepEqual(coordsFromText(place), { lat: 30.1325961, lng: 78.3207234 }, "prefers the place over the map centre");
  assert.deepEqual(coordsFromText("https://www.google.com/maps/@30.1302,78.3228,16z"), { lat: 30.1302, lng: 78.3228 });
  assert.deepEqual(coordsFromText("https://maps.google.com/?q=30.13251,78.32072"), { lat: 30.13251, lng: 78.32072 });
  assert.deepEqual(coordsFromText("https://www.google.com/maps/search/30.1325,+78.3207?entry=tts"), { lat: 30.1325, lng: 78.3207 });
  assert.deepEqual(coordsFromText(" 30.1325, 78.3207 "), { lat: 30.1325, lng: 78.3207 });
  assert.equal(coordsFromText("51.5072, -0.1276"), null, "outside Rishikesh");
  assert.equal(coordsFromText("https://maps.app.goo.gl/8z3iTPWDy7LTff8e9"), null);
});

test("follows a short link's redirects to the coordinates", async () => {
  const hops: Record<string, Response> = {
    "https://maps.app.goo.gl/abc": new Response(null, { status: 302, headers: { location: "https://www.google.com/maps?q=Tapashala&ftid=0x1" } }),
    "https://www.google.com/maps?q=Tapashala&ftid=0x1": new Response(null, {
      status: 302,
      headers: { location: "https://www.google.com/maps/place/Tapashala/data=!4m2!3m1!1s0x1!8m2!3d30.1325961!4d78.3207234" },
    }),
  };
  const fake = (async (u: string | URL | Request) => hops[String(u)] ?? new Response("", { status: 404 })) as typeof fetch;
  assert.deepEqual(await resolveMapLink("https://maps.app.goo.gl/abc", fake), { lat: 30.1325961, lng: 78.3207234 });
  assert.equal(await resolveMapLink("https://example.com/maps/abc", fake), null, "only Google links are followed");
});
