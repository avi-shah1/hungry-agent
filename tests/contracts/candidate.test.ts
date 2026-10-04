import { describe, expect, it } from "vitest";
import { CandidateSchema } from "@/src/contracts";

describe("CandidateSchema", () => {
  const valid = {
    id: "places:abc",
    provider: "places",
    restaurant: "Burrito Place",
    item: "Veggie Burrito",
    lat: 51.5,
    lng: -0.12,
    open: null,
    price: 850,
    currency: "GBP",
    enrichment: { source: "exa", healthScore: 0.6, healthConfidence: "low" },
  };

  it("accepts a valid candidate and rejects invalid ones", () => {
    expect(CandidateSchema.safeParse(valid).success).toBe(true);
    expect(CandidateSchema.safeParse({ ...valid, provider: "yelp" }).success).toBe(false);
    expect(CandidateSchema.safeParse({ ...valid, price: 8.5 }).success).toBe(false);
    expect(CandidateSchema.safeParse({ ...valid, lat: 120 }).success).toBe(false);
  });
});
