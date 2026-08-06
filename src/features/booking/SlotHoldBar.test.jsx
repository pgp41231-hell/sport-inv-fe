// US-04B — the hold countdown, which is time-dependent and so cannot be
// asserted on pure functions.

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import SlotHoldBar from "./SlotHoldBar.jsx";

const holdExpiringIn = (milliseconds) => ({
  id: "hold-1",
  expiresAt: new Date(Date.now() + milliseconds).toISOString(),
});

describe("SlotHoldBar", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  test("counts down from five minutes", () => {
    render(<SlotHoldBar hold={holdExpiringIn(5 * 60_000)} onExpire={() => {}} />);
    expect(screen.getByText(/05:00/)).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(61_000); });
    expect(screen.getByText(/03:59/)).toBeInTheDocument();
  });

  test("fires onExpire exactly once when the clock reaches zero", () => {
    const onExpire = vi.fn();
    render(<SlotHoldBar hold={holdExpiringIn(3_000)} onExpire={onExpire} />);
    expect(onExpire).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(3_100); });
    expect(onExpire).toHaveBeenCalledTimes(1);

    // The interval keeps ticking while React re-renders; firing again would try
    // to release a hold that is already gone.
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  test("never shows a negative clock once expired", () => {
    render(<SlotHoldBar hold={holdExpiringIn(1_000)} onExpire={() => {}} />);
    act(() => { vi.advanceTimersByTime(30_000); });

    expect(screen.getByText(/hold on this slot has expired/i)).toBeInTheDocument();
    expect(screen.queryByText(/-/)).not.toBeInTheDocument();
  });

  test("warns visibly in the last minute", () => {
    const { container } = render(<SlotHoldBar hold={holdExpiringIn(45_000)} onExpire={() => {}} />);
    expect(container.querySelector(".bk-holdbar-urgent")).toBeTruthy();
  });

  test("offers a release action while the hold is live, and not after", () => {
    const onRelease = vi.fn();
    render(<SlotHoldBar hold={holdExpiringIn(60_000)} onExpire={() => {}} onRelease={onRelease} />);
    expect(screen.getByRole("button", { name: /release/i })).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(61_000); });
    expect(screen.queryByRole("button", { name: /release/i })).not.toBeInTheDocument();
  });

  test("DEGRADE: says plainly when the backend cannot lock slots at all", () => {
    render(<SlotHoldBar hold={null} unavailable onExpire={() => {}} />);

    expect(screen.getByText(/slot lock unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/book promptly/i)).toBeInTheDocument();
  });

  test("renders nothing when there is no hold and no problem to report", () => {
    const { container } = render(<SlotHoldBar hold={null} onExpire={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
