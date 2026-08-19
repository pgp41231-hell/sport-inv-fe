// US-04A — the calendar renders every slot state and disables what cannot be taken.
// DEGRADE — a backend that sends no blackout/hold layers must not break it.

import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AvailabilityCalendar from "./AvailabilityCalendar.jsx";
import { api } from "../../api.js";
import { fromIstParts, istDayIndex } from "../../lib/slots.js";

const RESOURCE = { type: "venue", item: { id: "venue-1", name: "Badminton Court 1" } };
const USER = { id: "requester-1", email: "r1@example.edu", name: "R One", role: "requester" };

// Anchor on tomorrow so nothing under test is accidentally in the past.
const TOMORROW = istDayIndex(new Date()) + 1;
const at = (hour, minute = 0) => fromIstParts(TOMORROW, hour * 60 + minute).toISOString();
const slotButton = (hour) => screen.getByRole("button", { name: new RegExp(`^${hour}`) });

describe("AvailabilityCalendar", () => {
  beforeEach(() => vi.restoreAllMocks());

  const mockAvailability = (payload) =>
    vi.spyOn(api, "availability").mockResolvedValue({ data: [], blackouts: [], holds: [], ...payload });

  const openTomorrow = async () => {
    // Day 0 is today; day 1 is the anchor above.
    const tabs = screen.getAllByRole("tab");
    await userEvent.click(tabs[1]);
  };

  test("US-04A: offers seven days and a duration choice", async () => {
    mockAvailability({});
    render(<AvailabilityCalendar resource={RESOURCE} user={USER} onSelect={() => {}} />);

    await waitFor(() => expect(screen.getAllByRole("tab")).toHaveLength(7));
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  test("US-04A: marks each slot with why it can or cannot be taken", async () => {
    mockAvailability({
      data: [
        { id: "someone", startAt: at(10), endAt: at(11), status: "approved" },
        { id: "mine-1", startAt: at(12), endAt: at(13), status: "approved" },
      ],
      blackouts: [{ id: "bo", startAt: at(14), endAt: at(15), reason: "Court resurfacing" }],
      holds: [{ id: "h", startAt: at(16), endAt: at(17), expiresAt: at(23) }],
    });

    render(<AvailabilityCalendar resource={RESOURCE} user={USER} myBookingIds={["mine-1"]} onSelect={() => {}} />);
    await waitFor(() => expect(screen.getAllByRole("tab")).toHaveLength(7));
    await openTomorrow();

    await waitFor(() => expect(slotButton("09:00 am")).toBeEnabled());
    expect(slotButton("10:00 am")).toHaveAccessibleName(/already booked/i);
    expect(slotButton("12:00 pm")).toHaveAccessibleName(/your booking/i);
    expect(slotButton("02:00 pm")).toHaveAccessibleName(/court resurfacing/i);
    expect(slotButton("04:00 pm")).toHaveAccessibleName(/someone is booking this now/i);
  });

  test("US-04A: booked, blacked-out, and held slots cannot be selected", async () => {
    mockAvailability({
      data: [{ id: "someone", startAt: at(10), endAt: at(11), status: "approved" }],
      blackouts: [{ id: "bo", startAt: at(14), endAt: at(15), reason: "Exams" }],
      holds: [{ id: "h", startAt: at(16), endAt: at(17), expiresAt: at(23) }],
    });

    render(<AvailabilityCalendar resource={RESOURCE} user={USER} onSelect={() => {}} />);
    await waitFor(() => expect(screen.getAllByRole("tab")).toHaveLength(7));
    await openTomorrow();

    await waitFor(() => expect(slotButton("09:00 am")).toBeEnabled());
    expect(slotButton("10:00 am")).toBeDisabled();
    expect(slotButton("02:00 pm")).toBeDisabled();
    expect(slotButton("04:00 pm")).toBeDisabled();
  });

  test("US-04A: the accessible name leads with the time, not the peak label", async () => {
    mockAvailability({});
    render(<AvailabilityCalendar resource={RESOURCE} user={USER} onSelect={() => {}} />);
    await waitFor(() => expect(screen.getAllByRole("tab")).toHaveLength(7));
    await openTomorrow();

    // 18:00 IST is peak; the time must still come first or a screen-reader user
    // cannot tell which slot they are on.
    await waitFor(() => expect(slotButton("06:00 pm")).toHaveAccessibleName(/^06:00 pm — .*peak/i));
    expect(screen.getByText(/peak hours, which are usually busier/i)).toBeInTheDocument();
    expect(screen.queryByText(/approve/i)).not.toBeInTheDocument();
  });

  test("US-04A: choosing a slot hands back its exact interval", async () => {
    mockAvailability({});
    const onSelect = vi.fn();
    render(<AvailabilityCalendar resource={RESOURCE} user={USER} onSelect={onSelect} />);
    await waitFor(() => expect(screen.getAllByRole("tab")).toHaveLength(7));
    await openTomorrow();

    await waitFor(() => expect(slotButton("09:00 am")).toBeEnabled());
    await userEvent.click(slotButton("09:00 am"));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toMatchObject({ startAt: at(9), endAt: at(10), state: "available" });
  });

  test("US-04A: a day with nothing free says so instead of showing a blank grid", async () => {
    mockAvailability({ blackouts: [{ id: "bo", startAt: at(0), endAt: at(23, 59), reason: "Closed" }] });
    render(<AvailabilityCalendar resource={RESOURCE} user={USER} onSelect={() => {}} />);
    await waitFor(() => expect(screen.getAllByRole("tab")).toHaveLength(7));
    await openTomorrow();

    expect(await screen.findByText(/nothing free on this day/i)).toBeInTheDocument();
  });

  test("DEGRADE: a response without blackout or hold layers still renders", async () => {
    // Exactly what the pre-EPIC-03 backend returns.
    vi.spyOn(api, "availability").mockResolvedValue({ data: [] });

    render(<AvailabilityCalendar resource={RESOURCE} user={USER} onSelect={() => {}} />);
    await waitFor(() => expect(screen.getAllByRole("tab")).toHaveLength(7));
    await openTomorrow();

    await waitFor(() => expect(slotButton("09:00 am")).toBeEnabled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  test("a failed availability call is reported rather than showing a false empty calendar", async () => {
    vi.spyOn(api, "availability").mockRejectedValue(new Error("Network unreachable"));
    render(<AvailabilityCalendar resource={RESOURCE} user={USER} onSelect={() => {}} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Network unreachable");
  });
});
