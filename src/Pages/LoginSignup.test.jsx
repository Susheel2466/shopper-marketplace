import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LoginSignup from "./LoginSignup";
import { AuthContext } from "../Context/AuthContext";
import { signup as signupMock } from "../services/api";

// Avoid loading the real (asset-importing) api; validation runs before any call.
vi.mock("../services/api", () => ({
  login: vi.fn(),
  signup: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

const renderPage = () =>
  render(
    <AuthContext.Provider value={{ login: vi.fn() }}>
      <MemoryRouter>
        <LoginSignup />
      </MemoryRouter>
    </AuthContext.Provider>
  );

test("signup requires a name", () => {
  renderPage();
  fireEvent.click(screen.getByRole("button", { name: /continue/i }));
  expect(screen.getByText(/please enter your name/i)).toBeInTheDocument();
});

test("rejects an invalid email", async () => {
  renderPage();
  fireEvent.change(screen.getByPlaceholderText(/your name/i), {
    target: { value: "Sam" },
  });
  fireEvent.change(screen.getByPlaceholderText(/email/i), {
    target: { value: "not-an-email" },
  });
  fireEvent.change(screen.getByPlaceholderText(/password/i), {
    target: { value: "longenough" },
  });
  fireEvent.click(screen.getByRole("button", { name: /continue/i }));
  // Invalid email must block submission (signup API never called).
  expect(signupMock).not.toHaveBeenCalled();
});

test("rejects a short password", () => {
  renderPage();
  fireEvent.change(screen.getByPlaceholderText(/your name/i), {
    target: { value: "Sam" },
  });
  fireEvent.change(screen.getByPlaceholderText(/email/i), {
    target: { value: "sam@example.com" },
  });
  fireEvent.change(screen.getByPlaceholderText(/password/i), {
    target: { value: "short" },
  });
  fireEvent.click(screen.getByRole("button", { name: /continue/i }));
  expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
});

test("can switch to the Login view", () => {
  renderPage();
  fireEvent.click(screen.getByText(/login here/i));
  // In Login mode the name field is gone.
  expect(screen.queryByPlaceholderText(/your name/i)).not.toBeInTheDocument();
});
