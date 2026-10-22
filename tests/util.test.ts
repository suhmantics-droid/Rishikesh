import assert from "node:assert/strict";
import { test } from "node:test";
import { instagramHandle, priceLabel, priceShort, safeUrl, slugify, whatsappNumber } from "../src/lib/util";

test("whatsappNumber normalises Indian numbers", () => {
  assert.equal(whatsappNumber("98765 43210"), "919876543210");
  assert.equal(whatsappNumber("+91 98765-43210"), "919876543210");
  assert.equal(whatsappNumber("09876543210"), "919876543210");
  assert.equal(whatsappNumber("+44 7700 900123"), "447700900123");
  assert.equal(whatsappNumber("123"), null);
});

test("instagramHandle accepts @handles and profile links", () => {
  assert.equal(instagramHandle("@ecstatic.tapovan"), "ecstatic.tapovan");
  assert.equal(instagramHandle("https://instagram.com/12monks_rishikesh/"), "12monks_rishikesh");
  assert.equal(instagramHandle(""), null);
});

test("safeUrl only allows http(s)", () => {
  assert.equal(safeUrl("example.com/tickets"), "https://example.com/tickets");
  assert.equal(safeUrl("javascript:alert(1)"), null);
});

test("prices read naturally", () => {
  const p = (price_type: string, price_min: number | null = null, price_max: number | null = null) => ({ price_type, price_min, price_max });
  assert.equal(priceLabel(p("free")), "Free");
  assert.equal(priceLabel(p("donation", 300)), "Donation (₹300 suggested)");
  assert.equal(priceLabel(p("paid", 600)), "₹600");
  assert.equal(priceLabel(p("paid", 800, 1000)), "₹800–1000");
  assert.equal(priceShort(p("paid", 800, 1000)), "₹800+");
});

test("slugify", () => {
  assert.equal(slugify("Ecstatic Dance & Cacao Journey!"), "ecstatic-dance-cacao-journey");
  assert.equal(slugify("Café Šiva"), "cafe-siva");
  assert.equal(slugify("!!!"), "event");
});
