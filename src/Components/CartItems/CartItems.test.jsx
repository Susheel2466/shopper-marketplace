import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CartItems from "./CartItems";
import ShopContextProvider from "../../Context/ShopContext";
import { AuthContext } from "../../Context/AuthContext";

vi.mock("../../services/api", () => ({
  getProducts: vi.fn(() => Promise.resolve([])),
  validateCoupon: vi.fn(),
}));

beforeEach(() => localStorage.clear());

const renderCart = () =>
  render(
    <ShopContextProvider>
      <AuthContext.Provider value={{ token: "t" }}>
        <MemoryRouter>
          <CartItems />
        </MemoryRouter>
      </AuthContext.Provider>
    </ShopContextProvider>
  );

test("renders the empty-cart state with a $0 subtotal", () => {
  renderCart();
  expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
  // Subtotal shows $0.00
  expect(screen.getAllByText("$0.00").length).toBeGreaterThan(0);
});

test("checkout button is disabled when the cart is empty", () => {
  renderCart();
  expect(
    screen.getByRole("button", { name: /proceed to checkout/i })
  ).toBeDisabled();
});
