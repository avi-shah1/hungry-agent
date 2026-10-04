import { describe, expect, it } from "vitest";
import { ProfileSchema } from "@/src/contracts";

describe("ProfileSchema", () => {
  const valid = {
    userId: "u1",
    diet: "vegetarian",
    budget: 1500,
    maxWalkMinutes: 15,
    preferredCuisines: ["thai"],
    weights: { price: 0.25, distance: 0.25, health: 0.25, filling: 0.25 },
  };

  it("accepts a valid profile and rejects invalid ones", () => {
    expect(ProfileSchema.safeParse(valid).success).toBe(true);
    expect(ProfileSchema.safeParse({ ...valid, diet: null }).success).toBe(true);
    expect(ProfileSchema.safeParse({ ...valid, budget: -1 }).success).toBe(false);
    expect(ProfileSchema.safeParse({ ...valid, maxWalkMinutes: 0 }).success).toBe(false);
    expect(ProfileSchema.safeParse({ ...valid, weights: { price: 1 } }).success).toBe(false);
  });
});
