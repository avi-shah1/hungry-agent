import { describe, expect, it } from "vitest";
import { RecommendationSchema } from "@/src/contracts";

describe("RecommendationSchema", () => {
  const valid = {
    rank: 1,
    label: "Best overall",
    candidateId: "places:abc",
    restaurant: "Burrito Place",
    item: "Veggie Burrito",
    price: 850,
    walkMinutes: 6,
    reason: "Cheap, close and filling.",
  };

  it("accepts a valid recommendation and rejects invalid ones", () => {
    expect(RecommendationSchema.safeParse(valid).success).toBe(true);
    expect(RecommendationSchema.safeParse({ ...valid, rank: 4 }).success).toBe(false);
    expect(RecommendationSchema.safeParse({ ...valid, reason: "" }).success).toBe(false);
    expect(RecommendationSchema.safeParse({ ...valid, candidateId: undefined }).success).toBe(false);
  });
});
