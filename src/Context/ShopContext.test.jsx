import React, { useContext } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ShopContextProvider, { ShopContext } from "./ShopContext";

// The catalog load is irrelevant to cart-keying logic; resolve empty so the
// provider mounts without hitting the network.
vi.mock("../services/api", () => ({
  __esModule: true,
  getProducts: vi.fn(() => Promise.resolve([])),
}));

// Reads only cart state (not the async-loaded catalog), so it's robust
// regardless of product loading.
const Consumer = () => {
  const { addToCart, removeOne, removeLine, getTotalCartItems, cartItems } =
    useContext(ShopContext);
  return (
    <div>
      <span data-testid="count">{getTotalCartItems()}</span>
      <span data-testid="lines">{Object.keys(cartItems).length}</span>
      <button onClick={() => addToCart(1, "M", "Red")}>add-1-M-Red</button>
      <button onClick={() => addToCart(1, "S", "Red")}>add-1-S-Red</button>
      <button onClick={() => removeOne("1::M::Red")}>removeOne</button>
      <button onClick={() => removeLine("1::S::Red")}>removeLine</button>
    </div>
  );
};

const setup = () =>
  render(
    <ShopContextProvider>
      <Consumer />
    </ShopContextProvider>
  );

beforeEach(() => localStorage.clear());

test("starts with an empty cart", () => {
  setup();
  expect(screen.getByTestId("count")).toHaveTextContent("0");
  expect(screen.getByTestId("lines")).toHaveTextContent("0");
});

test("adding the same product+variant twice merges into one line, qty 2", () => {
  setup();
  fireEvent.click(screen.getByText("add-1-M-Red"));
  fireEvent.click(screen.getByText("add-1-M-Red"));
  expect(screen.getByTestId("count")).toHaveTextContent("2"); // total quantity
  expect(screen.getByTestId("lines")).toHaveTextContent("1"); // one cart line
});

test("different variants of the same product are separate lines", () => {
  setup();
  fireEvent.click(screen.getByText("add-1-M-Red"));
  fireEvent.click(screen.getByText("add-1-S-Red"));
  expect(screen.getByTestId("count")).toHaveTextContent("2");
  expect(screen.getByTestId("lines")).toHaveTextContent("2");
});

test("removeOne decrements quantity and drops the line at zero", () => {
  setup();
  fireEvent.click(screen.getByText("add-1-M-Red"));
  fireEvent.click(screen.getByText("add-1-M-Red"));
  expect(screen.getByTestId("count")).toHaveTextContent("2");
  fireEvent.click(screen.getByText("removeOne"));
  expect(screen.getByTestId("count")).toHaveTextContent("1");
  fireEvent.click(screen.getByText("removeOne"));
  expect(screen.getByTestId("count")).toHaveTextContent("0");
  expect(screen.getByTestId("lines")).toHaveTextContent("0");
});

test("removeLine removes the whole line regardless of quantity", () => {
  setup();
  fireEvent.click(screen.getByText("add-1-S-Red"));
  fireEvent.click(screen.getByText("add-1-S-Red"));
  expect(screen.getByTestId("lines")).toHaveTextContent("1");
  fireEvent.click(screen.getByText("removeLine"));
  expect(screen.getByTestId("lines")).toHaveTextContent("0");
  expect(screen.getByTestId("count")).toHaveTextContent("0");
});
