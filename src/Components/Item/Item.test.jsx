import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Item from "./Item";
import { AuthContext } from "../../Context/AuthContext";
import { WishlistContext } from "../../Context/WishlistContext";

const renderItem = (props) =>
  render(
    <AuthContext.Provider value={{ user: null }}>
      <WishlistContext.Provider value={{ isWished: () => false, toggle: vi.fn() }}>
        <MemoryRouter>
          <Item id={1} name="Test Product" image="x.png" new_price={50} old_price={80} {...props} />
        </MemoryRouter>
      </WishlistContext.Provider>
    </AuthContext.Provider>
  );

test("renders name and prices", () => {
  renderItem();
  expect(screen.getByText("Test Product")).toBeInTheDocument();
  expect(screen.getByText("$50")).toBeInTheDocument();
  expect(screen.getByText("$80")).toBeInTheDocument();
});

test("shows out-of-stock badge when inStock is false", () => {
  renderItem({ inStock: false });
  expect(screen.getByText(/out of stock/i)).toBeInTheDocument();
});

test("no out-of-stock badge when in stock", () => {
  renderItem({ inStock: true });
  expect(screen.queryByText(/out of stock/i)).not.toBeInTheDocument();
});

test("links to the product detail page", () => {
  renderItem();
  const link = screen.getByRole("link");
  expect(link).toHaveAttribute("href", "/product/1");
});
