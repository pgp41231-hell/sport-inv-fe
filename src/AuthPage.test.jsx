import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuthPage from "./AuthPage.jsx";

const apiMock = vi.hoisted(() => ({
  authConfig: vi.fn(), login: vi.fn(), signup: vi.fn(),
}));

vi.mock("./api.js", () => ({ api: apiMock }));

describe("AuthPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.authConfig.mockResolvedValue({ data: { emailPattern: "^pgp", bootstrapAdminEmail: "sportscomm@iiml.ac.in" } });
  });

  it("signs in a registered user", async () => {
    const onAuthenticated = vi.fn();
    apiMock.login.mockResolvedValue({ data: { user: { id: "1" }, token: "token" } });
    render(<AuthPage onAuthenticated={onAuthenticated} />);
    await userEvent.type(screen.getByLabelText(/institute email/i), "pgp12345@iiml.ac.in");
    await userEvent.type(screen.getByLabelText(/password/i), "strong-pass");
    await userEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(apiMock.login).toHaveBeenCalledWith({ email: "pgp12345@iiml.ac.in", password: "strong-pass" });
    expect(onAuthenticated).toHaveBeenCalled();
  });

  it("collects a name when creating an account", async () => {
    apiMock.signup.mockResolvedValue({ data: { message: "Account created successfully. Sign in with your new credentials." } });
    render(<AuthPage onAuthenticated={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /create an account/i }));
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
  });

  it("returns to sign in after signup instead of authenticating automatically", async () => {
    const onAuthenticated = vi.fn();
    apiMock.signup.mockResolvedValue({ data: { message: "Account created. Check your institute email to confirm it, then sign in." } });
    render(<AuthPage onAuthenticated={onAuthenticated} />);
    await userEvent.click(screen.getByRole("button", { name: /create an account/i }));
    await userEvent.type(screen.getByLabelText(/full name/i), "New Student");
    await userEvent.type(screen.getByLabelText(/institute email/i), "pgp12345@iiml.ac.in");
    await userEvent.type(screen.getByLabelText(/password/i), "strong-pass");
    await userEvent.click(screen.getByRole("button", { name: /^create account$/i }));
    expect(apiMock.signup).toHaveBeenCalled();
    expect(onAuthenticated).not.toHaveBeenCalled();
    expect(await screen.findByText(/check your institute email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^sign in$/i })).toBeInTheDocument();
  });
});
