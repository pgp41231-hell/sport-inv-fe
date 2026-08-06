// US-04B / US-04C — the hold lifecycle end to end, and the degradation paths
// that let this frontend ship before the backend API does.

import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BookingWizard from "./BookingWizard.jsx";
import { api, ApiError } from "../../api.js";
import { fromIstParts, istDayIndex } from "../../lib/slots.js";

const RESOURCE = { type: "venue", item: { id: "venue-1", name: "Badminton Court 1", quantity: 5 } };
const USER = { id: "requester-1", email: "r1@example.edu", name: "R One", role: "requester" };

const TOMORROW = istDayIndex(new Date()) + 1;
const at = (hour) => fromIstParts(TOMORROW, hour * 60).toISOString();

const holdResponse = () => ({
  data: { id: "hold-1", expiresAt: new Date(Date.now() + 5 * 60_000).toISOString() },
  meta: { ttlMinutes: 5 },
});

async function pickNineAm() {
  const tabs = await screen.findAllByRole("tab");
  await userEvent.click(tabs[1]);
  const slot = await screen.findByRole("button", { name: /^09:00 am/ });
  await waitFor(() => expect(slot).toBeEnabled());
  await userEvent.click(slot);
}

describe("BookingWizard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "availability").mockResolvedValue({ data: [], blackouts: [], holds: [] });
    vi.spyOn(api, "releaseHold").mockResolvedValue({ data: {} });
  });

  test("US-04B: picking a slot takes a hold and starts the countdown", async () => {
    const createHold = vi.spyOn(api, "createHold").mockResolvedValue(holdResponse());
    render(<BookingWizard resource={RESOURCE} user={USER} onClose={() => {}} onSaved={() => {}} />);

    await pickNineAm();

    await waitFor(() => expect(createHold).toHaveBeenCalledTimes(1));
    expect(createHold.mock.calls[0][1]).toMatchObject({
      resourceType: "venue", resourceId: "venue-1", startAt: at(9), endAt: at(10),
    });
    expect(await screen.findByText(/slot held for you/i)).toBeInTheDocument();
    expect(screen.getByText(/step 2 of 2/i)).toBeInTheDocument();
  });

  test("US-04C: confirming sends the holdId so the backend can consume it", async () => {
    vi.spyOn(api, "createHold").mockResolvedValue(holdResponse());
    const createBooking = vi.spyOn(api, "createBooking").mockResolvedValue({ data: { id: "booking-1" } });
    const onSaved = vi.fn();
    render(<BookingWizard resource={RESOURCE} user={USER} onClose={() => {}} onSaved={onSaved} />);

    await pickNineAm();
    await userEvent.type(await screen.findByPlaceholderText(/section b football practice/i), "Doubles practice");
    await userEvent.click(screen.getByRole("button", { name: /confirm reservation/i }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(createBooking.mock.calls[0][1]).toMatchObject({
      holdId: "hold-1", title: "Doubles practice", startAt: at(9), endAt: at(10),
    });
    // A consumed hold must not also be released, or the next booking's hold breaks.
    expect(api.releaseHold).not.toHaveBeenCalledWith(USER, "hold-1");
  });

  test("US-04B: going back releases the hold rather than leaving the slot locked", async () => {
    vi.spyOn(api, "createHold").mockResolvedValue(holdResponse());
    render(<BookingWizard resource={RESOURCE} user={USER} onClose={() => {}} onSaved={() => {}} />);

    await pickNineAm();
    await screen.findByText(/slot held for you/i);
    await userEvent.click(screen.getByRole("button", { name: /^back$/i }));

    await waitFor(() => expect(api.releaseHold).toHaveBeenCalledWith(USER, "hold-1"));
    expect(screen.getByText(/step 1 of 2/i)).toBeInTheDocument();
  });

  test("US-04B: losing the slot to someone else returns to the calendar with an explanation", async () => {
    vi.spyOn(api, "createHold").mockRejectedValue(new ApiError("That slot is no longer available to hold", 409));
    render(<BookingWizard resource={RESOURCE} user={USER} onClose={() => {}} onSaved={() => {}} />);

    await pickNineAm();

    expect(await screen.findByText(/someone took that slot moments ago/i)).toBeInTheDocument();
    expect(screen.getByText(/step 1 of 2/i)).toBeInTheDocument();
  });

  test("US-05C: a clash shows the alternatives the backend sent with the 409", async () => {
    vi.spyOn(api, "createHold").mockResolvedValue(holdResponse());
    vi.spyOn(api, "createBooking").mockRejectedValue(new ApiError("The resource is unavailable for that time", 409, {
      conflict: { conflictType: "booking" },
      alternatives: [{ startAt: at(11), endAt: at(12), peak: false, reasons: ["Same day"] }],
    }));
    const recommendations = vi.spyOn(api, "recommendations");
    render(<BookingWizard resource={RESOURCE} user={USER} onClose={() => {}} onSaved={() => {}} />);

    await pickNineAm();
    await userEvent.type(await screen.findByPlaceholderText(/section b football practice/i), "Doubles");
    await userEvent.click(screen.getByRole("button", { name: /confirm reservation/i }));

    expect(await screen.findByText(/that slot is taken — try one of these/i)).toBeInTheDocument();
    // No second round-trip when the 409 already carried them.
    expect(recommendations).not.toHaveBeenCalled();
  });

  test("US-05D: with no alternatives anywhere, the user is told, not left hanging", async () => {
    vi.spyOn(api, "createHold").mockResolvedValue(holdResponse());
    vi.spyOn(api, "createBooking").mockRejectedValue(new ApiError("Unavailable", 409, {}));
    vi.spyOn(api, "recommendations").mockResolvedValue({
      data: [], meta: { reason: "No alternative slots are free in the next few days for that duration." },
    });
    render(<BookingWizard resource={RESOURCE} user={USER} onClose={() => {}} onSaved={() => {}} />);

    await pickNineAm();
    await userEvent.type(await screen.findByPlaceholderText(/section b football practice/i), "Doubles");
    await userEvent.click(screen.getByRole("button", { name: /confirm reservation/i }));

    expect(await screen.findByText(/no alternative slots are free/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to the calendar/i })).toBeInTheDocument();
  });

  test("DEGRADE: with no /holds endpoint the wizard still books, and says the lock is off", async () => {
    vi.spyOn(api, "createHold").mockRejectedValue(new ApiError("Route not found", 404));
    const createBooking = vi.spyOn(api, "createBooking").mockResolvedValue({ data: { id: "booking-1" } });
    const onSaved = vi.fn();
    render(<BookingWizard resource={RESOURCE} user={USER} onClose={() => {}} onSaved={onSaved} />);

    await pickNineAm();

    expect(await screen.findByText(/slot lock unavailable/i)).toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText(/section b football practice/i), "Doubles practice");
    await userEvent.click(screen.getByRole("button", { name: /confirm reservation/i }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(createBooking.mock.calls[0][1].holdId).toBeUndefined();
  });

  test("DEGRADE: with no /recommendations endpoint, alternatives are worked out locally", async () => {
    vi.spyOn(api, "createHold").mockResolvedValue(holdResponse());
    vi.spyOn(api, "createBooking").mockRejectedValue(new ApiError("Unavailable", 409, {}));
    vi.spyOn(api, "recommendations").mockRejectedValue(new ApiError("Route not found", 404));
    render(<BookingWizard resource={RESOURCE} user={USER} onClose={() => {}} onSaved={() => {}} />);

    await pickNineAm();
    await userEvent.type(await screen.findByPlaceholderText(/section b football practice/i), "Doubles");
    await userEvent.click(screen.getByRole("button", { name: /confirm reservation/i }));

    // Availability is free in this fixture, so the local heuristic finds options.
    expect(await screen.findByText(/that slot is taken — try one of these/i)).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(0);
  });

  test("US-04B: an expired hold at submit time sends the user back to pick again", async () => {
    vi.spyOn(api, "createHold").mockResolvedValue(holdResponse());
    vi.spyOn(api, "createBooking").mockRejectedValue(new ApiError("Your hold on this slot has expired", 400));
    render(<BookingWizard resource={RESOURCE} user={USER} onClose={() => {}} onSaved={() => {}} />);

    await pickNineAm();
    await userEvent.type(await screen.findByPlaceholderText(/section b football practice/i), "Doubles");
    await userEvent.click(screen.getByRole("button", { name: /confirm reservation/i }));

    expect(await screen.findByText(/five-minute hold expired/i)).toBeInTheDocument();
    expect(screen.getByText(/step 1 of 2/i)).toBeInTheDocument();
  });

  test("an ordinary failure is shown on the form, not turned into an alternatives screen", async () => {
    vi.spyOn(api, "createHold").mockResolvedValue(holdResponse());
    vi.spyOn(api, "createBooking").mockRejectedValue(new ApiError("Request validation failed", 400));
    render(<BookingWizard resource={RESOURCE} user={USER} onClose={() => {}} onSaved={() => {}} />);

    await pickNineAm();
    await userEvent.type(await screen.findByPlaceholderText(/section b football practice/i), "Doubles");
    await userEvent.click(screen.getByRole("button", { name: /confirm reservation/i }));

    expect(await screen.findByText(/request validation failed/i)).toBeInTheDocument();
    expect(screen.queryByText(/try one of these/i)).not.toBeInTheDocument();
  });
});
