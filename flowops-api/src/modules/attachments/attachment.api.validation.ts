import { z } from "zod";

export const attachmentParamsSchema = z.object({
  id: z.string().uuid(),
});

export type AttachmentParams = z.infer<typeof attachmentParamsSchema>;
