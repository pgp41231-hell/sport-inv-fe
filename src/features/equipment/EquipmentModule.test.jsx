import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../../api.js";
import { BrowserQRCodeReader } from "@zxing/browser";
import EquipmentModule from "./EquipmentModule.jsx";

const student = { id: "student-1", role: "requester", email: "pgp10001@iiml.ac.in" };

describe("student equipment catalogue", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shows only casual availability and opens a preselected request from the card", async () => {
    vi.spyOn(api, "equipmentSports").mockResolvedValue({ data: [] });
    vi.spyOn(api, "equipmentTeams").mockResolvedValue({ data: [] });
    vi.spyOn(api, "equipmentRequests").mockResolvedValue({ data: [] });
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    render(<EquipmentModule user={student} notify={vi.fn()} equipment={[
      { id: "casual-racquet", name: "Casual racquet", active: true, tracking: "BULK", casualPoolQuantity: 4, inInventoryQuantity: 6 },
      { id: "team-balls", name: "Team balls", active: true, tracking: "BULK", casualPoolQuantity: 0, inInventoryQuantity: 12 },
    ]} />);

    expect(screen.getByRole("button", { name: "Request Casual racquet" })).toBeInTheDocument();
    expect(screen.queryByText("Team balls")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Request Casual racquet" }));
    expect(screen.getByLabelText("Item")).toHaveValue("casual-racquet");
    expect(screen.getByRole("button", { name: /Submit request/i })).toBeInTheDocument();
    await waitFor(() => expect(api.equipmentRequests).toHaveBeenCalled());
  });

  it("separates requesting from activity and expands the QR as a full-width row", async () => {
    vi.spyOn(api, "equipmentSports").mockResolvedValue({ data: [] });
    vi.spyOn(api, "equipmentTeams").mockResolvedValue({ data: [] });
    vi.spyOn(api, "equipmentRequests").mockResolvedValue({ data: [{
      id: "request-1", requesterId: student.id, requesterName: "Test Student", requestType: "CASUAL", status: "APPROVED",
      dueAt: "2026-08-20T12:00:00.000Z", items: [{ equipmentId: "balls", name: "Table tennis balls", quantity: 2 }],
    }] });
    vi.spyOn(api, "equipmentQr").mockResolvedValue({ data: { token: "signed-qr-token", purpose: "ISSUE", expiresAt: "2026-08-20T18:00:00.000Z" } });
    render(<EquipmentModule user={student} notify={vi.fn()} equipment={[]} />);

    expect(screen.getByRole("button", { name: /Request equipment/i })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByText("Table tennis balls × 2")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /My requests/i }));
    expect(await screen.findByText("Table tennis balls × 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show QR" }));
    expect(await screen.findByText("Ready for collection")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hide QR" }).closest("article")).toHaveClass("qr-expanded");
    fireEvent.click(screen.getByRole("button", { name: /Drag up or click to hide QR/i }));
    expect(screen.getByRole("button", { name: "Show QR" })).toHaveAttribute("aria-expanded", "false");
  });

  it("lets the inventory kiosk start its camera and sign out", async () => {
    const stop = vi.fn();
    vi.spyOn(BrowserQRCodeReader.prototype, "decodeFromConstraints").mockResolvedValue({ stop });
    vi.spyOn(api, "logout").mockResolvedValue();
    const onLogout = vi.fn();
    render(<EquipmentModule user={{ id: "kiosk", role: "inventory_kiosk" }} equipment={[]} notify={vi.fn()} onLogout={onLogout} />);

    fireEvent.click(screen.getByRole("button", { name: /Scan request QR/i }));
    await waitFor(() => expect(BrowserQRCodeReader.prototype.decodeFromConstraints).toHaveBeenCalled());
    expect(screen.getByLabelText("QR camera preview")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Sign out/i }));
    await waitFor(() => expect(onLogout).toHaveBeenCalled());
    expect(api.logout).toHaveBeenCalled();
  });
});
