import { useEffect, useRef, useState } from "react";
import { Lock, TriangleAlert, Unlock } from "lucide-react";
import { formatCountdown } from "../../lib/slots.js";

/**
 * US-04B — the live countdown on a held slot.
 *
 * `onExpire` fires exactly once, when the clock reaches zero. The guard matters:
 * the interval keeps running for a tick or two while React re-renders, and
 * firing twice would try to release an already-released hold.
 *
 * When `hold` is null the slot could not be locked — an older backend without
 * the holds API. That is stated plainly rather than hidden, because it changes
 * what the user should expect: someone else could still take the slot.
 */
export default function SlotHoldBar({ hold, unavailable, onExpire, onRelease }) {
  const [remaining, setRemaining] = useState(() => remainingFor(hold));
  const expiredRef = useRef(false);

  useEffect(() => {
    expiredRef.current = false;
    setRemaining(remainingFor(hold));
    if (!hold) return undefined;

    const tick = () => {
      const next = remainingFor(hold);
      setRemaining(next);
      if (next <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire?.();
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [hold, onExpire]);

  if (unavailable) {
    return (
      <div className="bk-holdbar bk-holdbar-warn" role="status">
        <TriangleAlert size={16} aria-hidden="true" />
        <span>
          <strong>Slot lock unavailable</strong>
          <small>This slot is not reserved while you fill in the form, so book promptly.</small>
        </span>
      </div>
    );
  }

  if (!hold) return null;

  const expired = remaining <= 0;
  const urgent = !expired && remaining <= 60_000;

  return (
    <div className={`bk-holdbar ${expired ? "bk-holdbar-warn" : urgent ? "bk-holdbar-urgent" : ""}`} role="status">
      <Lock size={16} aria-hidden="true" />
      <span>
        <strong>
          {expired
            ? "Your hold on this slot has expired"
            : `Slot held for you — ${formatCountdown(remaining)}`}
        </strong>
        <small>
          {expired
            ? "Pick the slot again to take a fresh hold."
            : "Nobody else can book it while this timer runs."}
        </small>
      </span>
      {!expired && onRelease && (
        <button type="button" className="bk-linkbutton" onClick={onRelease}>
          <Unlock size={14} aria-hidden="true" />Release
        </button>
      )}
    </div>
  );
}

function remainingFor(hold) {
  if (!hold?.expiresAt) return 0;
  return new Date(hold.expiresAt).getTime() - Date.now();
}
