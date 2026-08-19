// US-04D — upcoming/past split, filtering, and cancellation.

import { describe, expect, test, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MyBookingsPanel from "./MyBookingsPanel.jsx";

const hoursFromNow = (hours) => new Date(Date.now() + hours * 3_600_000).toISOString();

const BOOKINGS = [
  { id: "next", title: "Morning football", resourceType: "venue", status: "approved", startAt: hoursFromNow(3), endAt: hoursFromNow(4) },
  { id: "later", title: "Badminton doubles", resourceType: "venue", status: "pending", startAt: hoursFromNow(50), endAt: hoursFromNow(51) },
  { id: "done", title: "Last week's match", resourceType: "venue", status: "approved", startAt: hoursFromNow(-50), endAt: hoursFromNow(-49) },
  { id: "dropped", title: "Cancelled net session", resourceType: "equipment", status: "cancelled", startAt: hoursFromNow(20), endAt: hoursFromNow(21) },
];

const renderPanel = (overrides = {}) => render(
  <MyBookingsPanel bookings={BOOKINGS} loading={false} onCancel={vi.fn()} navigate={vi.fn()} {...overrides} />,
);

describe("MyBookingsPanel", () => {
  test("US-04D: splits upcoming from past and counts each tab", () => {
    renderPanel();

    expect(within(screen.getByRole("tab", { name: /upcoming/i })).getByText("3")).toBeInTheDocument();
    expect(within(screen.getByRole("tab", { name: /past/i })).getByText("1")).toBeInTheDocument();

    expect(screen.getByText("Morning football")).toBeInTheDocument();
    expect(within(screen.getByText("Morning football").closest("li")).getByText("Booked")).toBeInTheDocument();
    expect(screen.queryByText("Approved")).not.toBeInTheDocument();
    expect(screen.queryByText("Last week's match")).not.toBeInTheDocument();
  });

  test("US-04D: the past tab shows only finished bookings", async () => {
    renderPanel();
    await userEvent.click(screen.getByRole("tab", { name: /past/i }));

    expect(screen.getByText("Last week's match")).toBeInTheDocument();
    expect(screen.queryByText("Morning football")).not.toBeInTheDocument();
  });

  test("US-04D: upcoming bookings are listed soonest first", () => {
    renderPanel();
    const titles = screen.getAllByRole("heading", { level: 3 }).map((node) => node.textContent);
    expect(titles.indexOf("Morning football")).toBeLessThan(titles.indexOf("Badminton doubles"));
  });

  test("US-04D: the status filter narrows the list", async () => {
    renderPanel();
    await userEvent.selectOptions(screen.getByRole("combobox"), "pending");

    expect(screen.getByText("Badminton doubles")).toBeInTheDocument();
    expect(screen.queryByText("Morning football")).not.toBeInTheDocument();
  });

  test("US-04D: each upcoming booking shows how long until it starts", () => {
    renderPanel();
    expect(screen.getByText("in 3 hours")).toBeInTheDocument();
  });

  test("US-04D: cancelling asks first, then calls through", async () => {
    const onCancel = vi.fn().mockResolvedValue(undefined);
    renderPanel({ onCancel });

    const row = screen.getByText("Morning football").closest("li");
    await userEvent.click(within(row).getByRole("button", { name: /^cancel$/i }));

    // Nothing has happened yet — the confirmation is the point.
    expect(onCancel).not.toHaveBeenCalled();
    expect(within(row).getByText(/cancel this booking\?/i)).toBeInTheDocument();

    await userEvent.click(within(row).getByRole("button", { name: /yes, cancel/i }));
    expect(onCancel).toHaveBeenCalledWith("next");
  });

  test("US-04D: backing out of the confirmation leaves the booking alone", async () => {
    const onCancel = vi.fn();
    renderPanel({ onCancel });

    const row = screen.getByText("Morning football").closest("li");
    await userEvent.click(within(row).getByRole("button", { name: /^cancel$/i }));
    await userEvent.click(within(row).getByRole("button", { name: /keep it/i }));

    expect(onCancel).not.toHaveBeenCalled();
    expect(within(row).queryByText(/cancel this booking\?/i)).not.toBeInTheDocument();
  });

  test("US-04D: a failed cancellation is reported next to the booking, not swallowed", async () => {
    const onCancel = vi.fn().mockRejectedValue(new Error("Booking cannot be cancelled"));
    renderPanel({ onCancel });

    const row = screen.getByText("Morning football").closest("li");
    await userEvent.click(within(row).getByRole("button", { name: /^cancel$/i }));
    await userEvent.click(within(row).getByRole("button", { name: /yes, cancel/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Booking cannot be cancelled");
  });

  test("US-04D: an already-cancelled booking offers no cancel action", () => {
    renderPanel();
    const row = screen.getByText("Cancelled net session").closest("li");
    expect(within(row).queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
  });

  test("US-04D: the empty state points somewhere useful", async () => {
    const navigate = vi.fn();
    renderPanel({ bookings: [], navigate });

    expect(screen.getByText(/nothing booked yet/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /book a venue/i }));
    expect(navigate).toHaveBeenCalledWith("venues");
  });

  test("US-04D: filtering to nothing explains why the list is empty", async () => {
    renderPanel();
    await userEvent.selectOptions(screen.getByRole("combobox"), "cancelled");
    await userEvent.click(screen.getByRole("tab", { name: /past/i }));

    expect(screen.getByText(/no cancelled bookings in the past/i)).toBeInTheDocument();
  });
});
