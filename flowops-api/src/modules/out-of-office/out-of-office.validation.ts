import { z } from "zod";

export const createOutOfOfficeRuleSchema = z
  .object({
    delegateToId: z.string().uuid(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => value.startsAt < value.endsAt, {
    message: "Out-of-office start must be before end",
    path: ["endsAt"],
  });

export const updateOutOfOfficeRuleSchema = z
  .object({
    delegateToId: z.string().uuid().optional(),
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export const outOfOfficeRuleParamsSchema = z.object({
  id: z.string().uuid(),
});

export type CreateOutOfOfficeRuleBody = z.infer<typeof createOutOfOfficeRuleSchema>;
export type UpdateOutOfOfficeRuleBody = z.infer<typeof updateOutOfOfficeRuleSchema>;
export type OutOfOfficeRuleParams = z.infer<typeof outOfOfficeRuleParamsSchema>;
