import { ArrowRight, CalendarSearch, Clock3, Sparkles, Sunrise } from "lucide-react";
import { formatSlotDay, formatSlotTime } from "../../lib/slots.js";

/**
 * US-05C — up to three alternatives after a clash.
 * US-05D — a real answer when there are none, rather than an empty box.
 *
 * `suggestions` is always an array. An empty one is a valid, expected outcome,
 * not a loading state and not an error: the user is told what to do next and
 * given a way back to the calendar.
 */
export default function AlternativeSlots({ suggestions = [], reason, conflictMessage, onPick, onBack }) {
  const hasSuggestions = suggestions.length > 0;

  return (
    <div className="bk-alternatives">
      <div className="bk-alt-head">
        <span className="bk-alt-icon" aria-hidden="true">
          {hasSuggestions ? <Sparkles size={20} /> : <CalendarSearch size={20} />}
        </span>
        <div>
          <h3>{hasSuggestions ? "That slot is taken — try one of these" : "That slot is taken"}</h3>
          <p>{conflictMessage}</p>
        </div>
      </div>

      {hasSuggestions ? (
        <>
          <ul className="bk-alt-list">
            {suggestions.map((slot) => (
              <li key={slot.startAt}>
                <button type="button" className="bk-alt-option" onClick={() => onPick(slot)}>
                  <span className="bk-alt-when">
                    <strong>{formatSlotDay(slot.startAt)}</strong>
                    <span><Clock3 size={14} aria-hidden="true" />{formatSlotTime(slot.startAt)} – {formatSlotTime(slot.endAt)}</span>
                  </span>
                  <span className="bk-alt-why">
                    <span className={`bk-tag ${slot.peak ? "bk-tag-peak" : "bk-tag-offpeak"}`}>
                      {!slot.peak && <Sunrise size={12} aria-hidden="true" />}
                      {slot.peak ? "Peak" : "Off-peak"}
                    </span>
                    {(slot.reasons || []).slice(0, 2).map((text) => (
                      <small key={text}>{text}</small>
                    ))}
                  </span>
                  <ArrowRight size={17} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          {reason && <p className="bk-note bk-note-quiet">{reason}</p>}
        </>
      ) : (
        <div className="bk-alt-empty">
          <p>
            {reason || "Nothing else is free for that length in the next week."}
          </p>
          <p className="bk-alt-empty-next">
            Try a shorter booking, a different venue, or a date further out — the calendar goes a week ahead.
            For an urgent request, contact the Sports Committee from the Fixtures &amp; events page.
          </p>
        </div>
      )}

      <div className="bk-alt-actions">
        <button type="button" className="button button-ghost" onClick={onBack}>Back to the calendar</button>
      </div>
    </div>
  );
}
