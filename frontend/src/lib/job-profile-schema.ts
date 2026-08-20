import { z } from "zod";

const optionalNumber = (schema: z.ZodNumber) =>
  z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : value),
    z.union([z.null(), z.coerce.number().pipe(schema)]),
  );

const requiredNumber = (schema: z.ZodNumber) => z.coerce.number().pipe(schema);

const commaSeparated = (label: string, required = false) =>
  z.string().transform((value, context) => {
    const values = [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
    if (required && values.length === 0) {
      context.addIssue({ code: "custom", message: `Add at least one ${label}.` });
      return z.NEVER;
    }
    return values;
  });

export const jobProfileFormSchema = z
  .object({
    id: z.union([z.literal(""), z.string().cuid()]).optional(),
    companyId: z.string().cuid("Select a company."),
    title: z.string().trim().min(2, "Enter a role title.").max(160),
    type: z.enum(["INTERNSHIP", "FTE", "INTERNSHIP_PPO", "INTERNSHIP_FTE"]),
    locations: commaSeparated("location", true),
    ctcStipend: optionalNumber(z.number().nonnegative().max(100_000_000)),
    ctcStipendInfo: z.string().trim().max(500).transform((value) => value || null),
    minCGPA: requiredNumber(z.number().min(0).max(10)),
    maxBacklogs: requiredNumber(z.number().int().min(0).max(100)),
    maxBans: requiredNumber(z.number().int().min(0).max(100)),
    allowedBranches: commaSeparated("branch", true),
    allowedDegrees: commaSeparated("degree", true),
    allowedGenders: commaSeparated("gender"),
    jobCategory: z.string().trim().max(100).transform((value) => value || null),
    batch: requiredNumber(z.number().int().min(2020).max(2100)),
    registrationDeadline: z.coerce.date(),
    status: z.enum(["DRAFT", "ACTIVE", "ENDED"]),
    description: z.string().trim().max(5000).transform((value) => value || null),
    openingOverview: z.string().trim().max(10_000).transform((value) => value || null),
  })
  .superRefine((value, context) => {
    if (value.status === "ACTIVE" && value.registrationDeadline <= new Date()) {
      context.addIssue({
        code: "custom",
        path: ["registrationDeadline"],
        message: "An active job must have a future deadline.",
      });
    }
  });

export const jobProfileDeleteSchema = z.object({ jobProfileId: z.string().cuid() });

