import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminOverview, AdminResourcePage, CombinedApprovalsPage } from "./AdminOperations.jsx";

const admin = { id: "admin-1", role: "admin", email: "sports@iiml.ac.in" };

describe("Administrator operations views", () => {
  it("replaces the student hero with operational counts", () => {
    render(<AdminOverview
      venueApprovals={[{ id: "v1" }]}
      equipmentRequests={[
        { id: "e1", status: "PENDING" },
        { id: "e2", status: "ISSUED", requestType: "CASUAL", dueAt: "2020-01-01T00:00:00.000Z" },
      ]}
      equipment={[{ issuedQuantity: 4 }]}
      sports={[{ id: "s1", name: "Badminton", active: true }]}
      navigate={vi.fn()}
    />);
    expect(screen.getByText("Committee dashboard")).toBeInTheDocument();
    expect(screen.getByText("Equipment approvals").previousSibling).toHaveTextContent("1");
    expect(screen.getByText("Equipment issued").previousSibling).toHaveTextContent("4");
    expect(screen.queryByText("Find your space.")).not.toBeInTheDocument();
    expect(screen.queryByText("My reservations")).not.toBeInTheDocument();
  });

  it("shows the simplified unallocated equipment form without legacy fields", () => {
    render(<AdminResourcePage type="equipment" items={[]} equipmentRequests={[]} loading={false} user={admin} refresh={vi.fn()} notify={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Manage equipment" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add equipment/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Sport")).toBeInTheDocument();
    expect(screen.queryByLabelText("Category")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Location")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Pool")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /New request/i })).not.toBeInTheDocument();
  });

  it("shows only the useful venue fields", () => {
    render(<AdminResourcePage type="venue" items={[]} loading={false} user={admin} refresh={vi.fn()} notify={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Manage venues" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Sport")).toBeInTheDocument();
    expect(screen.getByLabelText("Location").tagName).toBe("INPUT");
    expect(screen.queryByRole("button", { name: "+ Add" })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Photo \(optional\)/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Category")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Capacity")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Amenities")).not.toBeInTheDocument();
  });

  it("keeps venue reservations out of the equipment approval queue", () => {
    render(<CombinedApprovalsPage user={admin} venueApprovals={[{ id: "v1", title: "Court booking", resourceType: "venue", startAt: "2030-01-01T10:00:00.000Z" }]} equipmentRequests={[{ id: "e1", status: "PENDING", requestType: "CASUAL", requesterName: "Student", items: [{ equipmentId: "x", name: "Ball", quantity: 2 }] }]} sports={[]} loading={false} onVenueDecision={vi.fn()} onEquipmentDecision={vi.fn()} />);
    expect(screen.queryByText("Court booking")).not.toBeInTheDocument();
    expect(screen.getByText("Ball × 2")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Equipment approval queue" })).toBeInTheDocument();
    expect(screen.getByText("Ball × 2")).toBeInTheDocument();
  });
});
