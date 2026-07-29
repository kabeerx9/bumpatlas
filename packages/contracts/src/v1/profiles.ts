import { z } from "zod";

export const pregnancySchema = z.object({
  id: z.string(),
  dueDate: z.string(),
  gestationalWeek: z.number().int().nullable().optional(),
  convertedAt: z.string().nullable().optional(),
});
export type Pregnancy = z.infer<typeof pregnancySchema>;

export const createPregnancyInputSchema = z.object({
  dueDate: z.string().min(1),
});
export type CreatePregnancyInput = z.infer<typeof createPregnancyInputSchema>;

export const updatePregnancyInputSchema = z.object({
  dueDate: z.string().min(1).optional(),
});
export type UpdatePregnancyInput = z.infer<typeof updatePregnancyInputSchema>;

export const convertPregnancyInputSchema = z.object({
  childName: z.string().trim().min(1).max(80),
  birthDate: z.string().min(1),
});
export type ConvertPregnancyInput = z.infer<typeof convertPregnancyInputSchema>;

export const childSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  dateOfBirth: z.string(),
});
export type Child = z.infer<typeof childSchema>;

export const createChildInputSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  dateOfBirth: z.string().min(1),
});
export type CreateChildInput = z.infer<typeof createChildInputSchema>;

export const updateChildInputSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  dateOfBirth: z.string().min(1).optional(),
});
export type UpdateChildInput = z.infer<typeof updateChildInputSchema>;
