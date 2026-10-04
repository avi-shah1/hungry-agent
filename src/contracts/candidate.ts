import { z } from "zod";

export const ConfidenceSchema = z.enum(["low", "medium", "high"]);

export const EnrichmentSchema = z.object({
  menuUrl: z.string().url().optional(),
  orderingUrl: z.string().url().optional(),
  vegetarianItems: z.array(z.string()).optional(),
  healthScore: z.number().min(0).max(1).optional(),
  healthConfidence: ConfidenceSchema.optional(),
  fillingScore: z.number().min(0).max(1).optional(),
  fillingConfidence: ConfidenceSchema.optional(),
  source: z.literal("exa"),
});

export const ScoreKeySchema = z.enum([
  "price",
  "distance",
  "health",
  "filling",
  "preference",
  "availability",
]);

export const CandidateSchema = z.object({
  id: z.string().min(1),
  provider: z.enum(["places", "tgtg"]),
  restaurant: z.string().min(1),
  item: z.string().optional(),
  address: z.string().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  /** null = unknown */
  open: z.boolean().nullable(),
  /** integer minor units, paired with `currency` */
  price: z.number().int().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  /** TGTG only */
  pickupWindow: z.object({ start: z.string(), end: z.string() }).optional(),
  /** TGTG remaining, if exposed */
  availability: z.number().int().nonnegative().optional(),
  distanceM: z.number().nonnegative().optional(),
  walkMinutes: z.number().nonnegative().optional(),
  /** true if the straight-line fallback was used */
  distanceIsApproximate: z.boolean().optional(),
  enrichment: EnrichmentSchema.optional(),
  scores: z.record(ScoreKeySchema, z.number()).optional(),
  finalScore: z.number().optional(),
});

export type Candidate = z.infer<typeof CandidateSchema>;
