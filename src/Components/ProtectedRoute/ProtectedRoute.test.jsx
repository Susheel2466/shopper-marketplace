import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import { AuthContext } from "../../Context/AuthContext";

const renderWith = (user) =>
  render(
    <AuthContext.Provider value={{ user }}>
      <MemoryRouter initialEntries={["/secret"]}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route
            path="/secret"
            element={
              <ProtectedRoute>
                <div>Secret Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );

test("redirects to /login when not authenticated", () => {
  renderWith(null);
  expect(screen.getByText("Login Page")).toBeInTheDocument();
  expect(screen.queryByText("Secret Content")).not.toBeInTheDocument();
});

test("renders children when authenticated", () => {
  renderWith({ name: "Sam", role: "user" });
  expect(screen.getByText("Secret Content")).toBeInTheDocument();
  expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
});
