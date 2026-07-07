import { z } from "zod";

export const reportsSummaryQuerySchema = z
  .object({
    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional(),
  })
  .refine(
    (value) =>
      value.fromDate === undefined ||
      value.toDate === undefined ||
      value.fromDate <= value.toDate,
    {
      message: "fromDate must be before or equal to toDate",
      path: ["toDate"],
    },
  );

export type ReportsSummaryQuery = z.infer<typeof reportsSummaryQuerySchema>;
