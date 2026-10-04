import { z } from "zod";

/**
 * Not defined in ARCHITECTURE.md; shape proposed in Milestone 1.
 * Always populated from what Kernel actually saw at checkout, never model-written.
 */
export const CheckoutItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  /** integer minor units */
  price: z.number().int().nonnegative(),
});

export const CheckoutStatusSchema = z.enum([
  "ready_for_approval",
  "needs_user_action",
  "failed",
]);

export const CheckoutSummarySchema = z.object({
  status: CheckoutStatusSchema,
  restaurant: z.string().min(1),
  route: z.enum(["doordash", "direct"]),
  items: z.array(CheckoutItemSchema),
  /** integer minor units */
  subtotal: z.number().int().nonnegative().optional(),
  fees: z.number().int().nonnegative().optional(),
  total: z.number().int().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  pickupTime: z.string().optional(),
  /** link for the user to continue manually */
  orderingUrl: z.string().url().optional(),
  failureReason: z.string().optional(),
});

export type CheckoutSummary = z.infer<typeof CheckoutSummarySchema>;
