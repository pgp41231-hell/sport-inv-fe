// US-05C — alternatives after a clash.
// US-05D — a real answer when there are none.

import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AlternativeSlots from "./AlternativeSlots.jsx";

const suggestion = (hour, peak, reasons) => ({
  startAt: `2030-04-01T${String(hour).padStart(2, "0")}:00:00.000Z`,
  endAt: `2030-04-01T${String(hour + 1).padStart(2, "0")}:00:00.000Z`,
  peak,
  reasons,
});

const THREE = [
  suggestion(5, false, ["Same day", "Off-peak — quieter and usually approved faster"]),
  suggestion(6, false, ["Same day"]),
  suggestion(12, true, ["Same day", "Same peak window"]),
];

describe("AlternativeSlots", () => {
  test("US-05C: shows every suggestion with its peak label and reason", () => {
    render(<AlternativeSlots suggestions={THREE} conflictMessage="That time is taken" onPick={() => {}} onBack={() => {}} />);

    expect(screen.getAllByRole("button", { name: /2030|Apr|:/i }).length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText(/off-peak/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/^Peak$/)).toBeInTheDocument();
    expect(screen.getByText(/quieter and usually approved faster/i)).toBeInTheDocument();
    expect(screen.getByText("That time is taken")).toBeInTheDocument();
  });

  test("US-05C: picking one hands the whole slot back in a single click", async () => {
    const onPick = vi.fn();
    render(<AlternativeSlots suggestions={THREE} conflictMessage="Taken" onPick={onPick} onBack={() => {}} />);

    const options = screen.getAllByRole("listitem");
    await userEvent.click(options[0].querySelector("button"));

    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith(THREE[0]);
  });

  test("US-05D: an empty list explains the situation and offers a next step", () => {
    render(
      <AlternativeSlots
        suggestions={[]}
        reason="No alternative slots are free in the next few days for that duration."
        conflictMessage="That time is taken"
        onPick={() => {}}
        onBack={() => {}}
      />,
    );

    expect(screen.getByText(/No alternative slots are free/i)).toBeInTheDocument();
    expect(screen.getByText(/shorter booking, a different venue/i)).toBeInTheDocument();
    // Not a dead end: there is always a way back.
    expect(screen.getByRole("button", { name: /back to the calendar/i })).toBeInTheDocument();
    // And emphatically not a spinner or a list.
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  test("US-05D: even with no reason from the API, the empty state still says something useful", () => {
    render(<AlternativeSlots suggestions={[]} conflictMessage="Taken" onPick={() => {}} onBack={() => {}} />);
    expect(screen.getByText(/Nothing else is free for that length/i)).toBeInTheDocument();
  });

  test("going back is always available", async () => {
    const onBack = vi.fn();
    render(<AlternativeSlots suggestions={THREE} conflictMessage="Taken" onPick={() => {}} onBack={onBack} />);

    await userEvent.click(screen.getByRole("button", { name: /back to the calendar/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
