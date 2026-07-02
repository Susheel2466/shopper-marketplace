import { cartKey } from "./Context/ShopContext";

// The old CRA default test ("renders learn react link") no longer applies.
// Component/behavior tests live next to their components; this keeps a fast
// sanity check on the cart-key helper that the whole cart is built on.
test("cartKey builds a stable product+variant key", () => {
  expect(cartKey(1, "M", "Red")).toBe("1::M::Red");
  expect(cartKey(2)).toBe("2::::");
  expect(cartKey(3, "S", "")).toBe("3::S::");
});
