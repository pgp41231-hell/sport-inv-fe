import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CircleAlert, Info, LoaderCircle, Lock, RotateCw } from "lucide-react";
import { api, isMissingEndpoint } from "../../api.js";
import {
  buildDaySlots, calendarDays, CALENDAR_DAYS, DEFAULT_SLOT_MINUTES, fromIstParts,
} from "../../lib/slots.js";

const DURATIONS = [
  { minutes: 60, label: "1 hour" },
  { minutes: 90, label: "1.5 hours" },
  { minutes: 120, label: "2 hours" },
];

const LEGEND = [
  { state: "available", label: "Available" },
  { state: "held", label: "Being booked" },
  { state: "booked", label: "Booked" },
  { state: "mine", label: "Yours" },
  { state: "blackout", label: "Closed" },
];

/**
 * US-04A — seven days of slots for one resource, each marked with why it can or
 * cannot be taken.
 *
 * Everything is drawn from a single GET /public/availability. On a backend that
 * predates EPIC-03 the response simply has no `blackouts` or `holds` keys, and
 * those layers render empty rather than breaking the calendar.
 */
export default function AvailabilityCalendar({ resource, user, myBookingIds = [], onSelect, selectedSlot }) {
  const [dayIndex, setDayIndex] = useState(() => calendarDays()[0].dayIndex);
  const [slotMinutes, setSlotMinutes] = useState(DEFAULT_SLOT_MINUTES);
  const [availability, setAvailability] = useState({ data: [], blackouts: [], holds: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  const days = useMemo(() => calendarDays(new Date(), CALENDAR_DAYS), []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      const from = fromIstParts(days[0].dayIndex, 0).toISOString();
      const to = fromIstParts(days[days.length - 1].dayIndex + 1, 0).toISOString();
      try {
        const response = await api.availability({
          resourceType: resource.type, resourceId: resource.item.id, from, to,
        });
        if (cancelled) return;
        setAvailability({
          data: response.data || [],
          blackouts: response.blackouts || [],
          holds: response.holds || [],
        });
      } catch (requestError) {
        if (cancelled) return;
        // Availability is the one call the calendar cannot do without.
        setError(requestError.message || "Could not load availability");
        setAvailability({ data: [], blackouts: [], holds: [] });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [resource.type, resource.item.id, days, reloadToken]);

  // A hold taken elsewhere lapses on its own; re-poll so the grid does not show
  // a slot as held for longer than it really is.
  useEffect(() => {
    if (!availability.holds.length) return undefined;
    const timer = setInterval(() => setReloadToken((token) => token + 1), 30_000);
    return () => clearInterval(timer);
  }, [availability.holds.length]);

  const slots = useMemo(() => buildDaySlots({
    dayIndex,
    slotMinutes,
    bookings: availability.data,
    blackouts: availability.blackouts,
    holds: availability.holds,
    myBookingIds,
  }), [dayIndex, slotMinutes, availability, myBookingIds]);

  const openCount = slots.filter((slot) => slot.selectable).length;

  return (
    <div className="bk-calendar">
      <div className="bk-calendar-controls">
        <div className="bk-daystrip" role="tablist" aria-label="Choose a day">
          {days.map((day) => (
            <button
              key={day.dayIndex}
              type="button"
              role="tab"
              aria-selected={day.dayIndex === dayIndex}
              className={`bk-day ${day.dayIndex === dayIndex ? "is-active" : ""}`}
              onClick={() => setDayIndex(day.dayIndex)}
            >
              <small>{day.isToday ? "Today" : day.label}</small>
              <strong>{day.dayOfMonth}</strong>
              <small>{day.month}</small>
            </button>
          ))}
        </div>

        <label className="bk-duration">
          <span>Duration</span>
          <select value={slotMinutes} onChange={(event) => setSlotMinutes(Number(event.target.value))}>
            {DURATIONS.map((option) => (
              <option key={option.minutes} value={option.minutes}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="bk-legend">
        {LEGEND.map((item) => (
          <span key={item.state} className="bk-legend-item">
            <i className={`bk-swatch bk-slot-${item.state}`} aria-hidden="true" />
            {item.label}
          </span>
        ))}
        <button type="button" className="bk-refresh" onClick={() => setReloadToken((token) => token + 1)}>
          <RotateCw size={14} aria-hidden="true" />Refresh
        </button>
      </div>

      {error && (
        <p className="bk-error" role="alert">
          <CircleAlert size={16} aria-hidden="true" />{error}
        </p>
      )}

      {loading ? (
        <div className="bk-slot-grid" aria-busy="true">
          {Array.from({ length: 12 }, (_, index) => <div className="bk-slot-skeleton" key={index} />)}
        </div>
      ) : (
        <>
          <div className="bk-slot-grid" role="group" aria-label="Available time slots">
            {slots.map((slot) => (
              <button
                key={slot.key}
                type="button"
                disabled={!slot.selectable}
                aria-pressed={selectedSlot?.startAt === slot.startAt}
                // The label must lead with the time: a screen-reader user hearing
                // only "Peak hour" has no idea which slot they are on.
                aria-label={`${slot.label} — ${describeSlot(slot)}`}
                title={describeSlot(slot)}
                className={`bk-slot bk-slot-${slot.state} ${selectedSlot?.startAt === slot.startAt ? "is-selected" : ""}`}
                onClick={() => onSelect(slot)}
              >
                <span className="bk-slot-time">{slot.label}</span>
                {slot.state === "held" && <Lock size={12} aria-hidden="true" />}
                {slot.state === "available" && slot.peak && <span className="bk-peak-dot" aria-hidden="true" />}
              </button>
            ))}
          </div>

          {openCount === 0 && (
            <p className="bk-note">
              <Info size={15} aria-hidden="true" />
              Nothing free on this day at {slotMinutes >= 120 ? "this length" : "this duration"}. Try another day above,
              or a shorter slot.
            </p>
          )}
          {openCount > 0 && (
            <p className="bk-note bk-note-quiet">
              <CalendarDays size={15} aria-hidden="true" />
              {openCount} slot{openCount === 1 ? "" : "s"} open. A dot marks peak hours, which are usually busier.
            </p>
          )}
        </>
      )}
    </div>
  );
}

/** One phrase covering both why a slot is unusable and, if it is usable, its band. */
export function describeSlot(slot) {
  if (slot.detail) return slot.detail;
  if (slot.state === "past") return "Already passed";
  return slot.peak ? "Available, peak hour" : "Available, off-peak";
}

export function CalendarLoading() {
  return <div className="bk-center"><LoaderCircle className="spin" aria-label="Loading" /></div>;
}

export { isMissingEndpoint };
