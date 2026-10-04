import { z } from "zod";

export const WeightsSchema = z.object({
  price: z.number().min(0),
  distance: z.number().min(0),
  health: z.number().min(0),
  filling: z.number().min(0),
});

export const ProfileSchema = z.object({
  userId: z.string().min(1),
  /** hard exclusion source, e.g. "vegetarian" */
  diet: z.string().nullable(),
  budget: z.number().nonnegative(),
  maxWalkMinutes: z.number().int().positive(),
  preferredCuisines: z.array(z.string()),
  weights: WeightsSchema,
});

export type Profile = z.infer<typeof ProfileSchema>;
