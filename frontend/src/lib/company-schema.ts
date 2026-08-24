import { z } from "zod";

const optionalUrl = z
  .union([z.literal(""), z.string().trim().url().max(500)])
  .transform((value) => value || null);

export const companyFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(120),
  website: optionalUrl,
  logoUrl: optionalUrl,
  description: z.string().trim().max(2000).transform((value) => value || null),
});

export const companyDeleteSchema = z.object({ companyId: z.string().min(1) });
