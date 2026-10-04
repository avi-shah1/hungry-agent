import { describe, expect, it } from "vitest";
import { CheckoutSummarySchema } from "@/src/contracts";

describe("CheckoutSummarySchema", () => {
  const valid = {
    status: "ready_for_approval",
    restaurant: "Burrito Place",
    route: "doordash",
    items: [{ name: "Veggie Burrito", quantity: 1, price: 850 }],
    subtotal: 850,
    fees: 100,
    total: 950,
    currency: "GBP",
  };

  it("accepts a valid summary and rejects invalid ones", () => {
    expect(CheckoutSummarySchema.safeParse(valid).success).toBe(true);
    expect(CheckoutSummarySchema.safeParse({ ...valid, status: "paid" }).success).toBe(false);
    expect(
      CheckoutSummarySchema.safeParse({ ...valid, items: [{ name: "x", quantity: 0, price: 1 }] }).success,
    ).toBe(false);
  });
});
