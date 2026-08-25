import { z } from "zod";
import { ALL_PERMISSIONS } from "./permissions";

const optionalTrimmedString = z
  .string()
  .transform((val) => val.trim())
  .transform((val) => (val === "" ? undefined : val))
  .optional()
  .nullable();

const optionalEmailSchema = z
  .string()
  .transform((val) => val.trim().toLowerCase())
  .refine(
    (val) => val === "" || z.string().email().safeParse(val).success,
    { message: "Please enter a valid email address." }
  )
  .transform((val) => (val === "" ? undefined : val))
  .optional()
  .nullable();

const optionalUpdateEmailSchema = z
  .string()
  .transform((val) => val.trim().toLowerCase())
  .refine(
    (val) => val === "" || z.string().email().safeParse(val).success,
    { message: "Please enter a valid email address." }
  )
  .transform((val) => (val === "" ? null : val))
  .optional()
  .nullable();

export const createTeamMemberSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(100, "Name must not exceed 100 characters."),
  role: z
    .string()
    .trim()
    .min(2, "Role / Designation must be at least 2 characters.")
    .max(100, "Role must not exceed 100 characters."),
  email: optionalEmailSchema,
  phone: optionalTrimmedString,
  photoUrl: optionalTrimmedString,
  displayOrder: z.coerce.number().int().min(0, "Display order must be 0 or greater.").default(0),
});

export const updateTeamMemberSchema = z.object({
  id: z.string().min(1, "Member ID is required."),
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(100, "Name must not exceed 100 characters.")
    .optional(),
  role: z
    .string()
    .trim()
    .min(2, "Role / Designation must be at least 2 characters.")
    .max(100, "Role must not exceed 100 characters.")
    .optional(),
  email: optionalUpdateEmailSchema,
  phone: optionalTrimmedString,
  photoUrl: optionalTrimmedString,
  displayOrder: z.coerce.number().int().min(0, "Display order must be 0 or greater.").optional(),
});

export const deleteTeamMemberSchema = z.object({
  id: z.string().min(1, "Member ID is required."),
});

export const updateDefaultPermissionsSchema = z.object({
  defaultPermissions: z
    .array(z.string())
    .refine(
      (perms) => perms.every((p) => (ALL_PERMISSIONS as readonly string[]).includes(p)),
      { message: "All permissions must be valid system permissions." }
    ),
  syncExistingMembers: z.boolean().default(false),
});

export const reorderTeamSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1, "Member ID is required."),
        displayOrder: z.coerce.number().int().min(0),
      })
    )
    .min(1, "At least one item is required to reorder."),
});

export type CreateTeamMemberInput = z.infer<typeof createTeamMemberSchema>;
export type UpdateTeamMemberInput = z.infer<typeof updateTeamMemberSchema>;
export type UpdateDefaultPermissionsInput = z.infer<typeof updateDefaultPermissionsSchema>;
export type ReorderTeamInput = z.infer<typeof reorderTeamSchema>;
