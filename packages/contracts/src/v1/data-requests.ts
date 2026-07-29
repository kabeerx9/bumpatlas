import { z } from "zod";

export const dataRequestTypeSchema = z.enum(["export", "delete"]);
export type DataRequestType = z.infer<typeof dataRequestTypeSchema>;

export const createDataRequestInputSchema = z.object({
  type: dataRequestTypeSchema,
});
export type CreateDataRequestInput = z.infer<typeof createDataRequestInputSchema>;

export const dataRequestSchema = z.object({
  id: z.string(),
  type: dataRequestTypeSchema,
  status: z.enum(["queued", "processing", "ready", "failed"]),
  createdAt: z.string(),
  readyAt: z.string().nullable().optional(),
  downloadUrl: z.string().url().nullable().optional(),
});
export type DataRequest = z.infer<typeof dataRequestSchema>;
