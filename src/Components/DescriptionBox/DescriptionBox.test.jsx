import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import DescriptionBox from "./DescriptionBox";
import { AuthContext } from "../../Context/AuthContext";

// Reviews (rendered in the Reviews tab) fetches on mount — stub it.
vi.mock("../../services/api", () => ({
  getReviews: vi.fn(() => Promise.resolve([])),
  addReview: vi.fn(),
}));

const renderBox = () =>
  render(
    <AuthContext.Provider value={{ user: null, token: null }}>
      <DescriptionBox product={{ id: 1, numReviews: 2 }} />
    </AuthContext.Provider>
  );

test("shows the description tab by default", () => {
  renderBox();
  expect(screen.getByText(/an e-commerce website/i)).toBeInTheDocument();
});

test("reviews tab label reflects the review count", () => {
  renderBox();
  expect(screen.getByRole("tab", { name: /reviews \(2\)/i })).toBeInTheDocument();
});

test("switching to the Reviews tab shows the reviews section", async () => {
  renderBox();
  fireEvent.click(screen.getByRole("tab", { name: /reviews/i }));
  // Not logged in -> login prompt from the Reviews component.
  expect(
    await screen.findByText(/please log in to write a review/i)
  ).toBeInTheDocument();
  // Description prose no longer shown.
  expect(screen.queryByText(/an e-commerce website/i)).not.toBeInTheDocument();
});
