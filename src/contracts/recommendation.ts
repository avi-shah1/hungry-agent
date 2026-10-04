import { z } from "zod";

export const RecommendationSchema = z.object({
  rank: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  /** "Best overall", "Cheapest", "Fastest"… */
  label: z.string().min(1),
  /** must exist in the agent's input; validated in code */
  candidateId: z.string().min(1),
  restaurant: z.string().min(1),
  item: z.string().min(1),
  price: z.number().int().nonnegative(),
  walkMinutes: z.number().nonnegative(),
  /** one or two sentences */
  reason: z.string().min(1),
});

export type Recommendation = z.infer<typeof RecommendationSchema>;
