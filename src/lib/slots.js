// EPIC-03 / EPIC-04 — slot maths shared by the calendar, the wizard, and the
// alternatives modal.
//
// Pure ESM with no React and no imports, for two reasons: it runs under
// `node --test` with zero dependencies, and the recommendation heuristic here
// mirrors the backend's src/recommendations.js so the UI still offers
// alternatives when the API does not have that endpoint yet.

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

// India has no daylight saving, so a fixed offset is exact rather than an approximation.
export const IST_OFFSET_MINUTES = 330;

/** Campus peak hours: early-morning and evening practice. */
export const PEAK_WINDOWS = [
  { fromHour: 6, toHour: 9 },
  { fromHour: 17, toHour: 21 },
];

export const BOOKABLE_FROM_HOUR = 6;
export const BOOKABLE_TO_HOUR = 23;
export const DEFAULT_SLOT_MINUTES = 60;
export const CALENDAR_DAYS = 7;

const toMs = (value) => (value instanceof Date ? value.getTime() : new Date(value).getTime());

export function istMinutesOfDay(value) {
  return Math.floor(((toMs(value) + IST_OFFSET_MINUTES * MINUTE) % DAY) / MINUTE);
}

export function istDayIndex(value) {
  return Math.floor((toMs(value) + IST_OFFSET_MINUTES * MINUTE) / DAY);
}

export function fromIstParts(dayIndex, minutesOfDay) {
  return new Date(dayIndex * DAY + minutesOfDay * MINUTE - IST_OFFSET_MINUTES * MINUTE);
}

export function isPeak(value) {
  const hour = istMinutesOfDay(value) / 60;
  return PEAK_WINDOWS.some((window) => hour >= window.fromHour && hour < window.toHour);
}

/**
 * Half-open overlap: a slot ending exactly when another starts does NOT overlap.
 * Matches the `[)` semantics of the database's tstzrange exclusion constraint,
 * so the calendar never disagrees with what the API will accept.
 */
export function overlaps(aStart, aEnd, bStart, bEnd) {
  return toMs(aStart) < toMs(bEnd) && toMs(aEnd) > toMs(bStart);
}

export const overlapsAny = (startAt, endAt, intervals = []) =>
  (intervals || []).some((item) => overlaps(startAt, endAt, item.startAt, item.endAt));

/** The `CALENDAR_DAYS` IST days the calendar strip offers, starting from `from`. */
export function calendarDays(from = new Date(), count = CALENDAR_DAYS) {
  const first = istDayIndex(from);
  return Array.from({ length: count }, (_, offset) => {
    const date = fromIstParts(first + offset, 12 * 60);
    return {
      dayIndex: first + offset,
      date,
      isToday: offset === 0,
      label: date.toLocaleDateString("en-IN", { weekday: "short", timeZone: "Asia/Kolkata" }),
      dayOfMonth: date.toLocaleDateString("en-IN", { day: "numeric", timeZone: "Asia/Kolkata" }),
      month: date.toLocaleDateString("en-IN", { month: "short", timeZone: "Asia/Kolkata" }),
    };
  });
}

export function formatSlotTime(value) {
  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata",
  });
}

export function formatSlotDay(value) {
  return new Date(value).toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata",
  });
}

/**
 * Every bookable slot on one IST day, each tagged with why it can or cannot be
 * taken. `state` is what the calendar colours by, in priority order:
 *
 *   past → blackout → booked → mine → held → available
 *
 * A slot the current user has already booked is shown as `mine` rather than
 * `booked`, because "you have this" reads very differently from "someone does".
 */
export function buildDaySlots({
  dayIndex,
  slotMinutes = DEFAULT_SLOT_MINUTES,
  bookings = [],
  blackouts = [],
  holds = [],
  myBookingIds = [],
  now = new Date(),
} = {}) {
  const slots = [];
  const lastStart = BOOKABLE_TO_HOUR * 60 - slotMinutes;
  const mine = new Set(myBookingIds);

  for (let minutes = BOOKABLE_FROM_HOUR * 60; minutes <= lastStart; minutes += slotMinutes) {
    const start = fromIstParts(dayIndex, minutes);
    const end = new Date(start.getTime() + slotMinutes * MINUTE);
    const startAt = start.toISOString();
    const endAt = end.toISOString();

    const blackout = (blackouts || []).find((item) => overlaps(startAt, endAt, item.startAt, item.endAt));
    const booking = (bookings || []).find((item) => overlaps(startAt, endAt, item.startAt, item.endAt));
    const hold = (holds || []).find((item) => overlaps(startAt, endAt, item.startAt, item.endAt));

    let state = "available";
    let detail = null;
    if (start.getTime() <= toMs(now)) {
      state = "past";
    } else if (blackout) {
      state = "blackout";
      detail = blackout.reason || "Unavailable";
    } else if (booking) {
      state = mine.has(booking.id) ? "mine" : "booked";
      detail = state === "mine" ? "Your booking" : "Already booked";
    } else if (hold) {
      state = "held";
      detail = "Someone is booking this now";
    }

    slots.push({
      key: startAt,
      startAt,
      endAt,
      state,
      detail,
      peak: isPeak(start),
      selectable: state === "available",
      label: formatSlotTime(start),
    });
  }
  return slots;
}

/**
 * Client-side mirror of the backend's recommendation heuristic (US-05A/B).
 *
 * Used only when GET /public/recommendations is unavailable — for example while
 * the frontend branch is running against a backend that has not merged the API
 * yet. The weights match src/recommendations.js so the two rank alike; the
 * backend remains authoritative when it answers.
 */
export function recommendSlotsLocally({
  startAt,
  endAt,
  bookings = [],
  blackouts = [],
  holds = [],
  windowDays = CALENDAR_DAYS,
  limit = 3,
  stepMinutes = 30,
  now = new Date(),
} = {}) {
  const requestedStart = toMs(startAt);
  const duration = toMs(endAt) - requestedStart;
  if (!Number.isFinite(duration) || duration <= 0) return [];

  const requestedPeak = isPeak(requestedStart);
  const requestedDay = istDayIndex(requestedStart);
  const requestedMinutes = istMinutesOfDay(requestedStart);
  const busy = [...(bookings || []), ...(blackouts || []), ...(holds || [])];
  const candidates = [];

  for (let dayOffset = 0; dayOffset <= windowDays; dayOffset += 1) {
    const lastStart = BOOKABLE_TO_HOUR * 60 - duration / MINUTE;
    for (let minutes = BOOKABLE_FROM_HOUR * 60; minutes <= lastStart; minutes += stepMinutes) {
      const start = fromIstParts(requestedDay + dayOffset, minutes);
      const end = new Date(start.getTime() + duration);
      if (start.getTime() <= toMs(now)) continue;
      if (start.getTime() === requestedStart) continue;
      if (overlapsAny(start.toISOString(), end.toISOString(), busy)) continue;

      const peak = isPeak(start);
      const reasons = [];
      let score = 100 - dayOffset * 50;
      reasons.push(dayOffset === 0 ? "Same day" : dayOffset === 1 ? "Next day" : `In ${dayOffset} days`);

      if (requestedPeak && !peak) {
        score += 40;
        reasons.push("Off-peak — quieter and usually approved faster");
      } else if (peak === requestedPeak) {
        score += 10;
        reasons.push(peak ? "Same peak window" : "Off-peak, like your original request");
      }
      score += Math.max(0, 20 - Math.abs(minutes - requestedMinutes) / 15);

      candidates.push({ startAt: start.toISOString(), endAt: end.toISOString(), score, peak, reasons });
    }
  }

  candidates.sort((a, b) => b.score - a.score || toMs(a.startAt) - toMs(b.startAt));
  return candidates.slice(0, limit);
}

/** Split bookings into upcoming and past for the My Bookings tabs (US-04D). */
export function splitBookings(bookings = [], now = new Date()) {
  const upcoming = [];
  const past = [];
  for (const booking of bookings) {
    (toMs(booking.endAt) > toMs(now) ? upcoming : past).push(booking);
  }
  upcoming.sort((a, b) => toMs(a.startAt) - toMs(b.startAt));
  past.sort((a, b) => toMs(b.startAt) - toMs(a.startAt));
  return { upcoming, past };
}

/** "in 3 days" / "in 2 hours" / "started" — the countdown on a booking row. */
export function timeUntil(value, now = new Date()) {
  const difference = toMs(value) - toMs(now);
  if (difference <= 0) return "started";
  const minutes = Math.round(difference / MINUTE);
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `in ${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  return `in ${days} day${days === 1 ? "" : "s"}`;
}

/** `mm:ss` for the hold countdown. Never returns a negative clock. */
export function formatCountdown(milliseconds) {
  const total = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
