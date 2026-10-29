import assert from "node:assert/strict";
import { test } from "node:test";
import { listingStatus } from "../src/lib/status";

const today = "2026-10-29";

test("listingStatus uses the organiser's words for each stage", () => {
  assert.equal(listingStatus({ status: "pending_payment", live_until: null }, false, today).word, "Not sent yet");
  assert.equal(listingStatus({ status: "pending_review", live_until: null }, false, today).word, "In review");
  assert.equal(listingStatus({ status: "live", live_until: "2026-11-20" }, true, today).word, "Live");
  assert.equal(listingStatus({ status: "live", live_until: "2026-11-02" }, true, today).word, "Ending soon");
  assert.equal(listingStatus({ status: "live", live_until: "2026-10-20" }, false, today).word, "Ended");
  assert.equal(listingStatus({ status: "hidden", live_until: null }, false, today).word, "Taken down");
});
