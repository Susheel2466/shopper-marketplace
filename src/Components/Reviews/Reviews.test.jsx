import React from "react";
import { render, screen } from "@testing-library/react";
import Reviews from "./Reviews";
import { AuthContext } from "../../Context/AuthContext";

vi.mock("../../services/api", () => ({
  getReviews: vi.fn(() => Promise.resolve([])),
  addReview: vi.fn(),
}));

const renderReviews = (auth) =>
  render(
    <AuthContext.Provider value={auth}>
      <Reviews productId={1} />
    </AuthContext.Provider>
  );

test("prompts anonymous users to log in", async () => {
  renderReviews({ user: null, token: null });
  expect(
    await screen.findByText(/please log in to write a review/i)
  ).toBeInTheDocument();
});

test("shows the write-review form to logged-in users", async () => {
  renderReviews({ user: { name: "Sam" }, token: "t" });
  expect(await screen.findByText(/write a review/i)).toBeInTheDocument();
  expect(
    screen.getByPlaceholderText(/share your thoughts/i)
  ).toBeInTheDocument();
});

test("shows an empty state when there are no reviews", async () => {
  renderReviews({ user: null, token: null });
  expect(await screen.findByText(/no reviews yet/i)).toBeInTheDocument();
});
