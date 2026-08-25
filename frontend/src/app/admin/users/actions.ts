"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { backendFetch } from "@/lib/api-client";
import { requirePermission } from "@/lib/admin-session";
import { db } from "@/lib/db";
import {
  ALL_PERMISSIONS,
  PERM_USERS_MANAGE,
  type PermissionKey,
} from "@/lib/permissions";
import { isAdminEmail } from "@/lib/auth-access";
import type { Role } from "@prisma/client";

export type UserActionResult = { error?: string; success?: string };

const roles = ["STUDENT", "COORDINATOR", "OFFICER", "ADMIN", "SUPER_ADMIN"] as const;

const createUserSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(120).optional().nullable(),
  role: z.enum(roles),
  title: z.string().trim().max(100).optional().nullable(),
  rollNumber: z.string().trim().max(40).optional().nullable(),
  branch: z.string().trim().max(80).optional().nullable(),
  batch: z.coerce.number().int().min(2000).max(2100).optional().nullable(),
  customPermissions: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

const updateUserRoleSchema = z.object({
  userId: z.string().min(1, "User ID is required."),
  role: z.enum(roles),
  title: z.string().trim().max(100).optional().nullable(),
});

const updateUserDetailsSchema = z.object({
  userId: z.string().min(1, "User ID is required."),
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(120).optional().nullable(),
  title: z.string().trim().max(100).optional().nullable(),
  rollNumber: z.string().trim().max(40).optional().nullable(),
  branch: z.string().trim().max(80).optional().nullable(),
  batch: z.coerce.number().int().min(2000).max(2100).optional().nullable(),
});

export async function createUserAction(formData: FormData): Promise<UserActionResult> {
  await requirePermission(PERM_USERS_MANAGE);

  const customPermsRaw = formData.get("customPermissions");
  let customPermissions: string[] = [];
  if (customPermsRaw && typeof customPermsRaw === "string") {
    try {
      customPermissions = JSON.parse(customPermsRaw);
    } catch {
      customPermissions = customPermsRaw.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }

  const parsed = createUserSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name") || undefined,
    role: formData.get("role") || "STUDENT",
    title: formData.get("title") || undefined,
    rollNumber: formData.get("rollNumber") || undefined,
    branch: formData.get("branch") || undefined,
    batch: formData.get("batch") || undefined,
    customPermissions,
    isActive: formData.get("isActive") !== "false",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid user input." };
  }

  const cleanEmail = parsed.data.email.toLowerCase();

  // Try backend first
  try {
    await backendFetch("/api/v1/users", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });
  } catch {
    // Fallback to Prisma
    const existing = await db.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      return { error: "A user with this email address already exists." };
    }

    if (parsed.data.rollNumber) {
      const dupRoll = await db.user.findUnique({ where: { rollNumber: parsed.data.rollNumber } });
      if (dupRoll) {
        return { error: "Roll number is already assigned to another user." };
      }
    }

    await db.user.create({
      data: {
        email: cleanEmail,
        name: parsed.data.name ?? null,
        role: parsed.data.role as Role,
        title: parsed.data.title ?? null,
        rollNumber: parsed.data.rollNumber ?? null,
        branch: parsed.data.branch ?? null,
        batch: parsed.data.batch ?? null,
        customPermissions: parsed.data.customPermissions,
        isActive: parsed.data.isActive,
        semGPAs: [],
      },
    });
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/students");
  revalidatePath("/admin/dashboard");
  return { success: `User '${cleanEmail}' created successfully.` };
}

export async function updateUserRoleAction(formData: FormData): Promise<UserActionResult> {
  const { user: caller } = await requirePermission(PERM_USERS_MANAGE);

  const parsed = updateUserRoleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
    title: formData.get("title") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid role update." };
  }

  const target = await db.user.findUnique({ where: { id: parsed.data.userId } });
  if (!target) return { error: "User not found." };

  // Guard against self-demotion
  if (target.id === caller.id && (parsed.data.role === "STUDENT" || parsed.data.role === "COORDINATOR")) {
    if (!isAdminEmail(caller.email)) {
      return { error: "You cannot demote your own administrator account." };
    }
  }

  // Guard against demoting the last active administrator
  if ((target.role === "SUPER_ADMIN" || target.role === "ADMIN") && parsed.data.role !== "SUPER_ADMIN" && parsed.data.role !== "ADMIN") {
    const adminCount = await db.user.count({
      where: {
        role: { in: ["SUPER_ADMIN", "ADMIN"] },
        isActive: true,
        NOT: { id: target.id },
      },
    });
    if (adminCount === 0 && !isAdminEmail(target.email)) {
      return { error: "Cannot demote the last active administrator." };
    }
  }

  try {
    await backendFetch(`/api/v1/users/${parsed.data.userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role: parsed.data.role, title: parsed.data.title }),
    });
  } catch {
    await db.user.update({
      where: { id: parsed.data.userId },
      data: {
        role: parsed.data.role as Role,
        title: parsed.data.title ?? target.title,
      },
    });
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/students");
  revalidatePath("/admin/dashboard");
  return { success: `Role for ${target.name || target.email} updated to ${parsed.data.role}.` };
}

export async function updateUserPermissionsAction(
  userId: string,
  customPermissions: string[],
): Promise<UserActionResult> {
  await requirePermission(PERM_USERS_MANAGE);

  for (const perm of customPermissions) {
    const basePerm = perm.startsWith("-") ? perm.slice(1) : perm;
    if (!ALL_PERMISSIONS.includes(basePerm as PermissionKey)) {
      return { error: `Invalid permission: ${perm}` };
    }
  }

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "User not found." };

  try {
    await backendFetch(`/api/v1/users/${userId}/permissions`, {
      method: "PATCH",
      body: JSON.stringify({ customPermissions }),
    });
  } catch {
    await db.user.update({
      where: { id: userId },
      data: { customPermissions },
    });
  }

  revalidatePath("/admin/users");
  return { success: `Custom permissions updated for ${target.name || target.email}.` };
}

export async function updateUserStatusAction(
  userId: string,
  isActive: boolean,
): Promise<UserActionResult> {
  const { user: caller } = await requirePermission(PERM_USERS_MANAGE);

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "User not found." };

  if (target.id === caller.id && !isActive) {
    return { error: "You cannot deactivate your own account." };
  }

  if (!isActive && (target.role === "SUPER_ADMIN" || target.role === "ADMIN")) {
    const adminCount = await db.user.count({
      where: {
        role: { in: ["SUPER_ADMIN", "ADMIN"] },
        isActive: true,
        NOT: { id: target.id },
      },
    });
    if (adminCount === 0 && !isAdminEmail(target.email)) {
      return { error: "Cannot deactivate the last active administrator." };
    }
  }

  try {
    await backendFetch(`/api/v1/users/${userId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    });
  } catch {
    await db.user.update({
      where: { id: userId },
      data: { isActive },
    });
  }

  revalidatePath("/admin/users");
  return { success: `Account for ${target.name || target.email} has been ${isActive ? "activated" : "suspended"}.` };
}

export async function updateUserDetailsAction(formData: FormData): Promise<UserActionResult> {
  await requirePermission(PERM_USERS_MANAGE);

  const parsed = updateUserDetailsSchema.safeParse({
    userId: formData.get("userId"),
    name: formData.get("name") || undefined,
    title: formData.get("title") || undefined,
    rollNumber: formData.get("rollNumber") || undefined,
    branch: formData.get("branch") || undefined,
    batch: formData.get("batch") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid user details." };
  }

  const target = await db.user.findUnique({ where: { id: parsed.data.userId } });
  if (!target) return { error: "User not found." };

  if (parsed.data.rollNumber) {
    const dupRoll = await db.user.findFirst({
      where: { rollNumber: parsed.data.rollNumber, NOT: { id: target.id } },
    });
    if (dupRoll) {
      return { error: "Roll number is already in use by another student." };
    }
  }

  try {
    await backendFetch(`/api/v1/users/${parsed.data.userId}`, {
      method: "PATCH",
      body: JSON.stringify(parsed.data),
    });
  } catch {
    await db.user.update({
      where: { id: parsed.data.userId },
      data: {
        name: parsed.data.name ?? target.name,
        title: parsed.data.title ?? null,
        rollNumber: parsed.data.rollNumber ?? null,
        branch: parsed.data.branch ?? null,
        batch: parsed.data.batch ?? null,
      },
    });
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/students");
  return { success: `User details updated.` };
}

export async function deleteUserAction(formData: FormData): Promise<UserActionResult> {
  const { user: caller } = await requirePermission(PERM_USERS_MANAGE);

  const userId = formData.get("userId");
  if (!userId || typeof userId !== "string") {
    return { error: "User ID is required." };
  }

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "User not found." };

  if (target.id === caller.id) {
    return { error: "You cannot delete your own user account." };
  }

  if (target.role === "SUPER_ADMIN" || target.role === "ADMIN") {
    const adminCount = await db.user.count({
      where: {
        role: { in: ["SUPER_ADMIN", "ADMIN"] },
        isActive: true,
        NOT: { id: target.id },
      },
    });
    if (adminCount === 0 && !isAdminEmail(target.email)) {
      return { error: "Cannot delete the last active administrator." };
    }
  }

  try {
    await backendFetch(`/api/v1/users/${userId}`, {
      method: "DELETE",
    });
  } catch {
    // Reassign any jobs or announcements created by target
    await db.jobProfile.updateMany({
      where: { createdById: target.id },
      data: { createdById: caller.id },
    });
    await db.announcement.updateMany({
      where: { createdById: target.id },
      data: { createdById: caller.id },
    });

    await db.user.delete({ where: { id: userId } });
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/students");
  revalidatePath("/admin/dashboard");
  return { success: `User '${target.name || target.email}' has been removed.` };
}
