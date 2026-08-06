import { useMemo, useState } from "react";
import {
  CalendarDays, CircleAlert, Clock3, History, LoaderCircle, Plus,
} from "lucide-react";
import { formatSlotDay, formatSlotTime, splitBookings, timeUntil } from "../../lib/slots.js";

const CANCELLABLE = ["pending", "approved"];
const titleCase = (value = "") => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

/**
 * US-04D — upcoming and past bookings, filterable, with cancellation.
 *
 * Cancelling updates the row in place: the caller refreshes in the background,
 * but the user sees the state change immediately rather than waiting on a
 * round-trip and a full reload.
 */
export default function MyBookingsPanel({ bookings = [], loading, onCancel, navigate }) {
  const [tab, setTab] = useState("upcoming");
  const [status, setStatus] = useState("all");
  const [confirming, setConfirming] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [error, setError] = useState("");

  const { upcoming, past } = useMemo(() => splitBookings(bookings), [bookings]);
  const statuses = useMemo(
    () => ["all", ...new Set(bookings.map((booking) => booking.status).filter(Boolean))],
    [bookings],
  );

  const visible = useMemo(() => {
    const source = tab === "upcoming" ? upcoming : past;
    return status === "all" ? source : source.filter((booking) => booking.status === status);
  }, [tab, status, upcoming, past]);

  const confirmCancel = async (booking) => {
    setCancelling(booking.id);
    setError("");
    try {
      await onCancel(booking.id);
      setConfirming(null);
    } catch (cancelError) {
      setError(cancelError?.message || "Could not cancel that booking");
    } finally {
      setCancelling(null);
    }
  };

  return (
    <section className="panel bk-bookings">
      <div className="bk-bookings-toolbar">
        <div className="bk-tabs" role="tablist" aria-label="Booking period">
          <button
            type="button" role="tab" aria-selected={tab === "upcoming"}
            className={tab === "upcoming" ? "is-active" : ""}
            onClick={() => setTab("upcoming")}
          >
            <CalendarDays size={15} aria-hidden="true" />Upcoming
            <b>{upcoming.length}</b>
          </button>
          <button
            type="button" role="tab" aria-selected={tab === "past"}
            className={tab === "past" ? "is-active" : ""}
            onClick={() => setTab("past")}
          >
            <History size={15} aria-hidden="true" />Past
            <b>{past.length}</b>
          </button>
        </div>

        <label className="bk-filter">
          <span className="bk-sr-only">Filter by status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            {statuses.map((value) => (
              <option key={value} value={value}>{value === "all" ? "All statuses" : titleCase(value)}</option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="bk-error" role="alert"><CircleAlert size={16} aria-hidden="true" />{error}</p>}

      {loading ? (
        <div className="bk-center"><LoaderCircle className="spin" aria-label="Loading bookings" /></div>
      ) : visible.length === 0 ? (
        <div className="bk-empty">
          <span className="bk-empty-icon" aria-hidden="true"><CalendarDays size={22} /></span>
          <h3>{emptyTitle(tab, status)}</h3>
          <p>
            {tab === "upcoming"
              ? "Reserve a venue or equipment and it will show up here."
              : "Bookings move here once their end time passes."}
          </p>
          {tab === "upcoming" && (
            <button className="button button-primary" onClick={() => navigate("venues")}>
              <Plus size={16} aria-hidden="true" />Book a venue
            </button>
          )}
        </div>
      ) : (
        <ul className="bk-booking-list">
          {visible.map((booking) => (
            <li key={booking.id} className={`bk-booking bk-booking-${booking.status}`}>
              <div className="date-badge" aria-hidden="true">
                <strong>{new Date(booking.startAt).getDate()}</strong>
                <span>{new Date(booking.startAt).toLocaleString("en", { month: "short" })}</span>
              </div>

              <div className="bk-booking-main">
                <div>
                  <h3>{booking.title}</h3>
                  <p>{titleCase(booking.resourceType)} reservation · Qty {booking.quantity || 1}</p>
                </div>
                <div className="bk-booking-when">
                  <Clock3 size={15} aria-hidden="true" />
                  <span>
                    {formatSlotDay(booking.startAt)}
                    <small>{formatSlotTime(booking.startAt)} – {formatSlotTime(booking.endAt)}</small>
                  </span>
                </div>
              </div>

              <div className="bk-booking-side">
                <span className={`status status-${booking.status || "neutral"}`}>{titleCase(booking.status || "unknown")}</span>
                {tab === "upcoming" && !["cancelled", "rejected"].includes(booking.status) && (
                  <small className="bk-countdown">{timeUntil(booking.startAt)}</small>
                )}
              </div>

              {CANCELLABLE.includes(booking.status) && tab === "upcoming" && (
                confirming === booking.id ? (
                  <div className="bk-confirm" role="group" aria-label="Confirm cancellation">
                    <span>Cancel this booking?</span>
                    <button type="button" className="button button-ghost" onClick={() => setConfirming(null)}>Keep it</button>
                    <button
                      type="button" className="button button-danger-soft"
                      disabled={cancelling === booking.id}
                      onClick={() => confirmCancel(booking)}
                    >
                      {cancelling === booking.id ? <LoaderCircle className="spin" size={15} aria-hidden="true" /> : null}
                      Yes, cancel
                    </button>
                  </div>
                ) : (
                  <button type="button" className="button button-danger-soft" onClick={() => setConfirming(booking.id)}>
                    Cancel
                  </button>
                )
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function emptyTitle(tab, status) {
  if (status !== "all") return `No ${titleCase(status).toLowerCase()} bookings ${tab === "upcoming" ? "coming up" : "in the past"}`;
  return tab === "upcoming" ? "Nothing booked yet" : "No past bookings";
}
