// EPIC-03 / EPIC-04 — pure slot logic.
//
// src/lib/slots.js has no React and no imports, so this runs under Node's own
// test runner with zero dependencies: `npm test`.

import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDaySlots, calendarDays, formatCountdown, fromIstParts, isPeak, istDayIndex,
  istMinutesOfDay, overlaps, recommendSlotsLocally, splitBookings, timeUntil,
} from "../src/lib/slots.js";

const DAY = istDayIndex("2030-04-01T12:00:00.000Z");
const at = (dayOffset, hour, minute = 0) =>
  fromIstParts(DAY + dayOffset, hour * 60 + minute).toISOString();
const NOW = at(0, 5, 0);

// --- IST conversion ---------------------------------------------------------

test("IST helpers round-trip a day index and minute-of-day", () => {
  const instant = fromIstParts(DAY, 17 * 60 + 30);
  assert.equal(istDayIndex(instant), DAY);
  assert.equal(istMinutesOfDay(instant), 17 * 60 + 30);
});

test("peak windows are inclusive at the start and exclusive at the end", () => {
  assert.equal(isPeak(at(0, 5, 59)), false, "05:59 is before the morning peak");
  assert.equal(isPeak(at(0, 6, 0)), true, "06:00 opens the morning peak");
  assert.equal(isPeak(at(0, 8, 59)), true, "08:59 is still peak");
  assert.equal(isPeak(at(0, 9, 0)), false, "09:00 closes the morning peak");
  assert.equal(isPeak(at(0, 16, 59)), false);
  assert.equal(isPeak(at(0, 17, 0)), true, "17:00 opens the evening peak");
  assert.equal(isPeak(at(0, 20, 59)), true);
  assert.equal(isPeak(at(0, 21, 0)), false, "21:00 closes the evening peak");
});

// --- Overlap ----------------------------------------------------------------

test("touching intervals do not overlap, matching the database's [) ranges", () => {
  // This is the case that silently breaks calendars: 10-11 and 11-12 are fine.
  assert.equal(overlaps(at(0, 10), at(0, 11), at(0, 11), at(0, 12)), false);
  assert.equal(overlaps(at(0, 11), at(0, 12), at(0, 10), at(0, 11)), false);
  assert.equal(overlaps(at(0, 10), at(0, 11), at(0, 10, 30), at(0, 11, 30)), true);
  assert.equal(overlaps(at(0, 10), at(0, 12), at(0, 10, 30), at(0, 11)), true, "fully contained");
  assert.equal(overlaps(at(0, 10, 30), at(0, 11), at(0, 10), at(0, 12)), true, "fully containing");
});

// --- Calendar grid (US-04A) -------------------------------------------------

test("US-04A: the strip offers seven consecutive days starting today", () => {
  const days = calendarDays(new Date(at(0, 12)));
  assert.equal(days.length, 7);
  assert.equal(days[0].isToday, true);
  days.forEach((day, index) => assert.equal(day.dayIndex, DAY + index));
});

test("US-04A: a day runs 06:00 to 23:00 IST and respects the chosen duration", () => {
  const hourly = buildDaySlots({ dayIndex: DAY, now: NOW });
  assert.equal(hourly.length, 17, "06:00 through 22:00 inclusive");
  assert.equal(istMinutesOfDay(hourly[0].startAt), 6 * 60);
  assert.equal(istMinutesOfDay(hourly[hourly.length - 1].endAt), 23 * 60);

  // Longer slots step by their own length, so the last one lands wherever it
  // fits — 20:00-22:00 for two hours. What matters is that none runs past 23:00.
  const twoHour = buildDaySlots({ dayIndex: DAY, slotMinutes: 120, now: NOW });
  assert.equal(istMinutesOfDay(twoHour[0].startAt), 6 * 60);
  assert.ok(istMinutesOfDay(twoHour[twoHour.length - 1].endAt) <= 23 * 60,
    "no slot may run past the end of the bookable day");
  for (const slot of twoHour) {
    assert.equal((new Date(slot.endAt) - new Date(slot.startAt)) / 60_000, 120);
  }
});

test("US-04A: each slot reports why it can or cannot be taken", () => {
  const slots = buildDaySlots({
    dayIndex: DAY,
    now: at(0, 7, 30),
    bookings: [
      { id: "b1", startAt: at(0, 10), endAt: at(0, 11) },
      { id: "mine-1", startAt: at(0, 12), endAt: at(0, 13) },
    ],
    blackouts: [{ id: "x1", startAt: at(0, 14), endAt: at(0, 15), reason: "Exams" }],
    holds: [{ id: "h1", startAt: at(0, 16), endAt: at(0, 17) }],
    myBookingIds: ["mine-1"],
  });
  const stateAt = (hour) => slots.find((slot) => istMinutesOfDay(slot.startAt) === hour * 60).state;

  assert.equal(stateAt(6), "past", "before now");
  assert.equal(stateAt(9), "available");
  assert.equal(stateAt(10), "booked");
  assert.equal(stateAt(12), "mine", "your own booking reads differently from someone else's");
  assert.equal(stateAt(14), "blackout");
  assert.equal(stateAt(16), "held");

  assert.equal(slots.find((slot) => slot.state === "blackout").detail, "Exams");
  assert.equal(slots.filter((slot) => slot.selectable).every((slot) => slot.state === "available"), true);
});

test("US-04A: a past day has nothing selectable", () => {
  const slots = buildDaySlots({ dayIndex: DAY - 1, now: NOW });
  assert.equal(slots.some((slot) => slot.selectable), false);
});

// --- Local recommendation fallback (US-05A/B/D) -----------------------------

test("US-05A: the local fallback prefers off-peak after a peak clash, like the backend", () => {
  const results = recommendSlotsLocally({ startAt: at(0, 18), endAt: at(0, 19), now: NOW });
  assert.ok(results.length > 0);
  assert.equal(results[0].peak, false);
  assert.ok(results[0].reasons.some((reason) => /off-peak/i.test(reason)));
});

test("US-05B: the local fallback keeps duration, ranks same-day first, and caps at the limit", () => {
  const results = recommendSlotsLocally({ startAt: at(0, 10), endAt: at(0, 11, 30), now: NOW });
  assert.ok(results.length <= 3);
  assert.equal(istDayIndex(results[0].startAt), DAY);
  for (const slot of results) {
    assert.equal((new Date(slot.endAt) - new Date(slot.startAt)) / 60_000, 90);
  }
});

test("US-05B: the local fallback avoids bookings, blackouts, and holds", () => {
  const bookings = [{ startAt: at(0, 10), endAt: at(0, 12) }];
  const blackouts = [{ startAt: at(0, 12), endAt: at(0, 14) }];
  const holds = [{ startAt: at(0, 14), endAt: at(0, 16) }];
  const results = recommendSlotsLocally({
    startAt: at(0, 10), endAt: at(0, 11), bookings, blackouts, holds, now: NOW, limit: 20,
  });

  assert.ok(results.length > 0);
  for (const slot of results) {
    for (const blocker of [...bookings, ...blackouts, ...holds]) {
      assert.equal(overlaps(slot.startAt, slot.endAt, blocker.startAt, blocker.endAt), false);
    }
  }
});

test("US-05D: the local fallback returns an empty list when nothing is free", () => {
  const results = recommendSlotsLocally({
    startAt: at(0, 10), endAt: at(0, 11),
    blackouts: [{ startAt: at(0, 0), endAt: at(30, 0) }],
    now: NOW,
  });
  assert.deepEqual(results, []);
});

test("US-05B: the local fallback never suggests the past or the original slot", () => {
  const midday = at(0, 12);
  const results = recommendSlotsLocally({ startAt: at(0, 10), endAt: at(0, 11), now: midday, limit: 20 });
  assert.ok(results.length > 0);
  for (const slot of results) {
    assert.ok(new Date(slot.startAt) > new Date(midday));
    assert.notEqual(slot.startAt, at(0, 10));
  }
});

test("US-05B: a nonsensical interval yields no suggestions rather than throwing", () => {
  assert.deepEqual(recommendSlotsLocally({ startAt: at(0, 11), endAt: at(0, 10), now: NOW }), []);
  assert.deepEqual(recommendSlotsLocally(), []);
});

// --- My bookings (US-04D) ---------------------------------------------------

test("US-04D: bookings split on end time, upcoming soonest-first and past newest-first", () => {
  const now = at(3, 12);
  const bookings = [
    { id: "past-old", startAt: at(0, 10), endAt: at(0, 11) },
    { id: "past-recent", startAt: at(2, 10), endAt: at(2, 11) },
    { id: "next", startAt: at(4, 10), endAt: at(4, 11) },
    { id: "later", startAt: at(6, 10), endAt: at(6, 11) },
  ];
  const { upcoming, past } = splitBookings(bookings, now);

  assert.deepEqual(upcoming.map((item) => item.id), ["next", "later"]);
  assert.deepEqual(past.map((item) => item.id), ["past-recent", "past-old"]);
});

test("US-04D: a booking in progress still counts as upcoming until it ends", () => {
  const now = at(0, 10, 30);
  const { upcoming, past } = splitBookings([{ id: "running", startAt: at(0, 10), endAt: at(0, 11) }], now);
  assert.equal(upcoming.length, 1);
  assert.equal(past.length, 0);
});

test("US-04D: time-until reads naturally at each scale", () => {
  const now = at(0, 10);
  assert.equal(timeUntil(at(0, 10, 30), now), "in 30 min");
  assert.equal(timeUntil(at(0, 13), now), "in 3 hours");
  assert.equal(timeUntil(at(0, 11), now), "in 1 hour");
  assert.equal(timeUntil(at(3, 10), now), "in 3 days");
  assert.equal(timeUntil(at(0, 9), now), "started");
});

// --- Countdown formatting (US-04B) ------------------------------------------

test("US-04B: the countdown formats as mm:ss and never goes negative", () => {
  assert.equal(formatCountdown(5 * 60_000), "05:00");
  assert.equal(formatCountdown(61_000), "01:01");
  assert.equal(formatCountdown(9_000), "00:09");
  assert.equal(formatCountdown(0), "00:00");
  assert.equal(formatCountdown(-4_000), "00:00", "an expired hold must not show a negative clock");
});
