import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, CalendarDays, CircleAlert, Clock3, LoaderCircle, X } from "lucide-react";
import { api, isMissingEndpoint } from "../../api.js";
import { formatSlotDay, formatSlotTime, recommendSlotsLocally } from "../../lib/slots.js";
import AvailabilityCalendar from "./AvailabilityCalendar.jsx";
import SlotHoldBar from "./SlotHoldBar.jsx";
import AlternativeSlots from "./AlternativeSlots.jsx";

/**
 * US-04B + US-04C — pick a slot, hold it, confirm it.
 *
 * The hold lifecycle is the reason this is a wizard rather than a form:
 *
 *   idle ──pick slot──▶ held ──submit──▶ booked
 *                        │  │
 *                        │  └──timer hits 0──▶ expired ──▶ back to calendar
 *                        └──close / back / cancel──▶ released
 *
 * A hold is always released on the way out. The one case where it is not is a
 * successful booking, where the backend consumes it instead.
 */
export default function BookingWizard({ resource, user, myBookingIds = [], onClose, onSaved }) {
  const [step, setStep] = useState("calendar");
  const [slot, setSlot] = useState(null);
  const [hold, setHold] = useState(null);
  const [holdUnavailable, setHoldUnavailable] = useState(false);
  const [holding, setHolding] = useState(false);
  const [form, setForm] = useState({ title: "", purpose: "", quantity: 1 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [alternatives, setAlternatives] = useState({ suggestions: [], reason: "", conflictMessage: "" });

  // Kept in a ref so the unmount cleanup always sees the current hold without
  // re-running (and therefore releasing) every time it changes.
  const holdRef = useRef(null);
  useEffect(() => { holdRef.current = hold; }, [hold]);

  const releaseHold = useCallback(async (target) => {
    const active = target || holdRef.current;
    if (!active) return;
    holdRef.current = null;
    setHold(null);
    try {
      await api.releaseHold(user, active.id);
    } catch {
      // Best effort: it may already be released, expired, or unsupported.
      // Either way the slot frees itself within five minutes.
    }
  }, [user]);

  // Releasing on unmount is what makes closing the tab safe.
  useEffect(() => () => {
    const active = holdRef.current;
    if (active) api.releaseHold(user, active.id).catch(() => {});
  }, [user]);

  const pickSlot = async (candidate) => {
    setError("");
    setNotice("");
    setSlot(candidate);
    setStep("details");
    setHolding(true);
    await releaseHold();

    try {
      const response = await api.createHold(user, {
        resourceType: resource.type,
        resourceId: resource.item.id,
        startAt: candidate.startAt,
        endAt: candidate.endAt,
        quantity: resource.type === "equipment" ? Number(form.quantity || 1) : 1,
      });
      setHold(response.data);
      setHoldUnavailable(false);
    } catch (requestError) {
      if (isMissingEndpoint(requestError)) {
        // Backend predates the holds API. Booking still works, so continue and
        // tell the user the slot is not reserved for them.
        setHoldUnavailable(true);
      } else if (requestError.status === 409) {
        const ownBookingConflict = requestError.details?.details?.conflict?.conflictType === "requester_booking";
        setNotice(ownBookingConflict ? "You already have another venue booked during this time. Pick a non-overlapping slot." : "Someone took that slot moments ago. Pick another.");
        setStep("calendar");
        setSlot(null);
      } else {
        setHoldUnavailable(true);
      }
    } finally {
      setHolding(false);
    }
  };

  const handleExpired = useCallback(() => {
    holdRef.current = null;
    setHold(null);
    setSlot(null);
    setStep("calendar");
    setNotice("Your five-minute hold expired, so the slot was released. Pick it again to continue.");
  }, []);

  const backToCalendar = async () => {
    await releaseHold();
    setSlot(null);
    setError("");
    setStep("calendar");
  };

  const loadAlternatives = async (conflictMessage, fromError) => {
    // Preferred path: the backend already sent alternatives with the 409.
    const inline = fromError?.details?.alternatives;
    if (Array.isArray(inline) && inline.length) {
      setAlternatives({ suggestions: inline.slice(0, 3), reason: "", conflictMessage });
      setStep("alternatives");
      return;
    }

    try {
      const response = await api.recommendations({
        resourceType: resource.type,
        resourceId: resource.item.id,
        startAt: slot.startAt,
        endAt: slot.endAt,
        limit: 3,
      });
      setAlternatives({
        suggestions: response.data || [],
        reason: response.meta?.reason || "",
        conflictMessage,
      });
    } catch {
      // US-05D degradation: work the alternatives out from availability, using
      // the same rules the backend applies.
      setAlternatives({
        suggestions: await localAlternatives(resource, slot),
        reason: "",
        conflictMessage,
      });
    }
    setStep("alternatives");
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.createBooking(user, {
        resourceType: resource.type,
        resourceId: resource.item.id,
        title: form.title,
        purpose: form.purpose || null,
        quantity: Number(form.quantity || 1),
        startAt: slot.startAt,
        endAt: slot.endAt,
        metadata: {},
        ...(hold ? { holdId: hold.id } : {}),
      });
      // The backend consumes the hold on success, so drop it without releasing.
      holdRef.current = null;
      setHold(null);
      onSaved();
    } catch (requestError) {
      if (requestError.status === 409) {
        await releaseHold();
        await loadAlternatives(requestError.message, requestError);
      } else if (requestError.status === 400 && /hold/i.test(requestError.message)) {
        handleExpired();
      } else {
        setError(requestError.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-panel bk-panel" role="dialog" aria-modal="true" aria-label={`Reserve ${resource.item.name}`}>
        <button className="icon-button modal-close" onClick={onClose} aria-label="Close reservation form">
          <X size={20} />
        </button>

        <p className="eyebrow">
          {step === "calendar" ? "Step 1 of 2 — pick a slot"
            : step === "details" ? "Step 2 of 2 — confirm details"
              : "Alternatives"}
        </p>
        <h2>{resource.item.name}</h2>

        {notice && <p className="bk-note bk-note-info" role="status"><CircleAlert size={15} aria-hidden="true" />{notice}</p>}

        {step === "calendar" && (
          <>
            <p className="modal-copy">
              Choose a time. Picking one holds it for five minutes while you finish.
            </p>
            <AvailabilityCalendar
              resource={resource}
              user={user}
              myBookingIds={myBookingIds}
              selectedSlot={slot}
              onSelect={pickSlot}
            />
          </>
        )}

        {step === "details" && slot && (
          <>
            <div className="bk-chosen">
              <CalendarDays size={17} aria-hidden="true" />
              <span>
                <strong>{formatSlotDay(slot.startAt)}</strong>
                <small><Clock3 size={13} aria-hidden="true" />{formatSlotTime(slot.startAt)} – {formatSlotTime(slot.endAt)}</small>
              </span>
              <button type="button" className="bk-linkbutton" onClick={backToCalendar}>
                <ArrowLeft size={14} aria-hidden="true" />Change
              </button>
            </div>

            {holding
              ? <div className="bk-holdbar" role="status"><LoaderCircle className="spin" size={16} aria-hidden="true" /><span><strong>Holding this slot…</strong></span></div>
              : <SlotHoldBar hold={hold} unavailable={holdUnavailable} onExpire={handleExpired} onRelease={backToCalendar} />}

            <form className="form-grid" onSubmit={submit}>
              <label className="field field-full">
                Booking title
                <input required name="title" value={form.title} onChange={update} placeholder="e.g. Section B football practice" />
              </label>
              <label className="field field-full">
                Purpose
                <textarea name="purpose" value={form.purpose} onChange={update} rows="3" placeholder="Optional booking note" />
              </label>
              {resource.type === "equipment" && (
                <label className="field">
                  Quantity
                  <input required min="1" max={resource.item.quantity} type="number" name="quantity" value={form.quantity} onChange={update} />
                </label>
              )}
              {error && <p className="form-error field-full"><CircleAlert size={16} aria-hidden="true" />{error}</p>}
              <div className="modal-actions field-full">
                <button type="button" className="button button-ghost" onClick={backToCalendar}>Back</button>
                <button className="button button-primary" disabled={saving}>
                  {saving ? <LoaderCircle className="spin" size={17} aria-hidden="true" /> : <CalendarDays size={17} aria-hidden="true" />}
                  Confirm reservation
                </button>
              </div>
            </form>
          </>
        )}

        {step === "alternatives" && (
          <AlternativeSlots
            suggestions={alternatives.suggestions}
            reason={alternatives.reason}
            conflictMessage={alternatives.conflictMessage}
            onPick={(candidate) => pickSlot({ ...candidate, key: candidate.startAt })}
            onBack={backToCalendar}
          />
        )}
      </div>
    </div>
  );
}

/**
 * US-05D fallback: no recommendations endpoint, so read availability and apply
 * the same rules locally. Returns [] if even that fails — an empty list is a
 * valid answer the modal knows how to render.
 */
async function localAlternatives(resource, slot) {
  try {
    const from = new Date(new Date(slot.startAt).getTime() - 86_400_000).toISOString();
    const to = new Date(new Date(slot.startAt).getTime() + 9 * 86_400_000).toISOString();
    const response = await api.availability({
      resourceType: resource.type, resourceId: resource.item.id, from, to,
    });
    return recommendSlotsLocally({
      startAt: slot.startAt,
      endAt: slot.endAt,
      bookings: response.data || [],
      blackouts: response.blackouts || [],
      holds: response.holds || [],
      limit: 3,
    });
  } catch {
    return [];
  }
}
