import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, daysLabel, expandWeekly, formatTime, formatTimeRange, isValidDate, isValidTime, weekday, whenRange } from "../src/lib/dates";

// 2026-10-19 is a Monday.
const MON = "2026-10-19";

test("weekday and addDays", () => {
  assert.equal(weekday(MON), 1);
  assert.equal(addDays(MON, 13), "2026-11-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
});

test("whenRange: today / tomorrow / week", () => {
  assert.deepEqual(whenRange("today", MON), { from: MON, to: MON });
  assert.deepEqual(whenRange("tomorrow", MON), { from: "2026-10-20", to: "2026-10-20" });
  assert.deepEqual(whenRange("week", MON), { from: MON, to: "2026-10-25" });
  assert.deepEqual(whenRange("2026-11-02", MON), { from: "2026-11-02", to: "2026-11-02" });
});

test("whenRange: weekend is Fri–Sun, or what's left of it", () => {
  assert.deepEqual(whenRange("weekend", MON), { from: "2026-10-23", to: "2026-10-25" }); // Mon → Fri..Sun
  assert.deepEqual(whenRange("weekend", "2026-10-22"), { from: "2026-10-23", to: "2026-10-25" }); // Thu
  assert.deepEqual(whenRange("weekend", "2026-10-23"), { from: "2026-10-23", to: "2026-10-25" }); // Fri
  assert.deepEqual(whenRange("weekend", "2026-10-24"), { from: "2026-10-24", to: "2026-10-25" }); // Sat
  assert.deepEqual(whenRange("weekend", "2026-10-25"), { from: "2026-10-25", to: "2026-10-25" }); // Sun
});

test("expandWeekly picks the right weekdays up to the end date", () => {
  assert.deepEqual(expandWeekly(MON, "2026-11-01", [6]), ["2026-10-24", "2026-10-31"]);
  assert.deepEqual(expandWeekly(MON, "2026-10-22", [1, 4]), [MON, "2026-10-22"]);
  assert.equal(expandWeekly(MON, "2027-12-31", [0, 1, 2, 3, 4, 5, 6], 60).length, 60);
});

test("validation and formatting", () => {
  assert.ok(isValidDate("2026-02-28"));
  assert.ok(!isValidDate("2026-02-30"));
  assert.ok(!isValidDate("28/02/2026"));
  assert.ok(isValidTime("23:59"));
  assert.ok(!isValidTime("24:00"));
  assert.equal(formatTime("19:00"), "7pm");
  assert.equal(formatTime("00:30"), "12:30am");
  assert.equal(formatTimeRange("17:30", "20:30"), "5:30pm–8:30pm");
});

test("daysLabel reads like a flyer: ranges, pairs and lists", () => {
  assert.equal(daysLabel([0, 1, 2, 3, 4, 5, 6]), "Daily");
  assert.equal(daysLabel([1, 2, 3, 4, 5, 6]), "Mon–Sat");
  assert.equal(daysLabel([3, 4, 5, 6, 0]), "Wed–Sun");
  assert.equal(daysLabel([2, 3, 4, 5, 6]), "Tue–Sat");
  assert.equal(daysLabel([6, 0, 1]), "Sat–Mon");
  assert.equal(daysLabel([4, 0]), "Thu & Sun");
  assert.equal(daysLabel([5, 1, 3]), "Mon, Wed & Fri");
  assert.equal(daysLabel([2]), "Tue");
  assert.equal(daysLabel([]), "");
});
