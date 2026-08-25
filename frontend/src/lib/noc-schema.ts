import { z } from "zod";

export const nocFormSchema = z
  .object({
    company: z
      .string()
      .trim()
      .min(2, "Company name must be at least 2 characters.")
      .max(200, "Company name must not exceed 200 characters."),
    city: z
      .string()
      .trim()
      .min(2, "City must be at least 2 characters.")
      .max(100, "City must not exceed 100 characters."),
    address: z
      .string()
      .trim()
      .min(2, "Address must be at least 2 characters.")
      .max(500, "Address must not exceed 500 characters."),
    state: z
      .string()
      .trim()
      .min(2, "State must be at least 2 characters.")
      .max(100, "State must not exceed 100 characters."),
    pincode: z
      .string()
      .trim()
      .regex(/^[0-9]{6}$/, "Pincode must be exactly 6 digits."),
    startDate: z.string().min(1, "Start date is required."),
    endDate: z.string().min(1, "End date is required."),
    message: z
      .string()
      .trim()
      .max(2000, "Remarks must not exceed 2000 characters.")
      .optional()
      .nullable()
      .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
  })
  .refine(
    (data) => {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      return !isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start;
    },
    {
      message: "End date cannot be earlier than start date.",
      path: ["endDate"],
    }
  );

export const nocApproveSchema = z.object({
  nocId: z.string().min(1, "NOC request ID is required."),
  message: z.string().trim().max(2000).optional().nullable(),
  documentUrl: z.string().trim().optional().nullable(),
});

export const nocRejectSchema = z.object({
  nocId: z.string().min(1, "NOC request ID is required."),
  message: z.string().trim().min(2, "Rejection reason is required.").max(2000),
});

export const nocCancelSchema = z.object({
  nocId: z.string().min(1, "NOC request ID is required."),
});

export type NocFormData = z.infer<typeof nocFormSchema>;
export type NocApproveData = z.infer<typeof nocApproveSchema>;
export type NocRejectData = z.infer<typeof nocRejectSchema>;
export type NocCancelData = z.infer<typeof nocCancelSchema>;
