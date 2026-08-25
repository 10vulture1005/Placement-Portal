"use server";

import { revalidatePath } from "next/cache";
import { backendFetch } from "@/lib/api-client";
import { requirePermission } from "@/lib/admin-session";
import { db } from "@/lib/db";
import {
  ALL_PERMISSIONS,
  PERM_TEAM_MANAGE,
} from "@/lib/permissions";
import {
  createTeamMemberSchema,
  updateTeamMemberSchema,
  deleteTeamMemberSchema,
  updateDefaultPermissionsSchema,
  reorderTeamSchema,
} from "@/lib/team-schema";

export type TeamActionResult = { error?: string; success?: string };

const PLACEMENT_TEAM_DEFAULT_PERMISSIONS_KEY = "placement_team_default_permissions";

const FALLBACK_DEFAULT_PERMISSIONS = [
  "companies:read",
  "jobs:read",
  "jobs:manage",
  "applications:read",
  "applications:manage",
  "students:read",
  "announcements:manage",
  "analytics:view",
];

async function getStoredDefaultPermissions(): Promise<string[]> {
  try {
    const setting = await db.systemSetting.findUnique({
      where: { key: PLACEMENT_TEAM_DEFAULT_PERMISSIONS_KEY },
    });
    if (setting && setting.value) {
      const parsed = JSON.parse(setting.value);
      if (Array.isArray(parsed)) {
        return parsed.filter((p) => (ALL_PERMISSIONS as readonly string[]).includes(p));
      }
    }
  } catch {
    // If table not migrated or error, return fallback
  }
  return [...FALLBACK_DEFAULT_PERMISSIONS];
}

export async function createTeamMemberAction(formData: FormData): Promise<TeamActionResult> {
  await requirePermission(PERM_TEAM_MANAGE);

  const parsed = createTeamMemberSchema.safeParse({
    name: formData.get("name"),
    role: formData.get("role"),
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    photoUrl: formData.get("photoUrl") || undefined,
    displayOrder: formData.get("displayOrder") || 0,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid team member details." };
  }

  const { name, role, email, phone, photoUrl, displayOrder } = parsed.data;

  try {
    await backendFetch("/api/v1/team", {
      method: "POST",
      body: JSON.stringify({
        name,
        role,
        email: email ?? null,
        phone: phone ?? null,
        photoUrl: photoUrl ?? null,
        displayOrder,
      }),
    });
  } catch {
    // Prisma fallback
    let order = displayOrder;
    if (order <= 0) {
      const max = await db.teamMember.aggregate({ _max: { displayOrder: true } });
      order = (max._max.displayOrder ?? 0) + 1;
    }

    await db.teamMember.create({
      data: {
        name,
        role,
        email: email ?? null,
        phone: phone ?? null,
        photoUrl: photoUrl ?? null,
        displayOrder: order,
      },
    });

    if (email) {
      const defaultPerms = await getStoredDefaultPermissions();
      const user = await db.user.findUnique({ where: { email } });
      if (user) {
        const merged = Array.from(new Set([...(user.customPermissions || []), ...defaultPerms]));
        await db.user.update({
          where: { id: user.id },
          data: { customPermissions: merged },
        });
      }
    }
  }

  revalidatePath("/admin/team");
  revalidatePath("/team");
  revalidatePath("/contact");
  revalidatePath("/admin/users");
  return { success: `Team member '${name}' added successfully.` };
}

export async function updateTeamMemberAction(formData: FormData): Promise<TeamActionResult> {
  await requirePermission(PERM_TEAM_MANAGE);

  const parsed = updateTeamMemberSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name") || undefined,
    role: formData.get("role") || undefined,
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    photoUrl: formData.get("photoUrl") || undefined,
    displayOrder: formData.get("displayOrder") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid team member details." };
  }

  const { id, name, role, email, phone, photoUrl, displayOrder } = parsed.data;

  try {
    await backendFetch(`/api/v1/team/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name,
        role,
        email,
        phone,
        photoUrl,
        displayOrder,
      }),
    });
  } catch {
    const existing = await db.teamMember.findUnique({ where: { id } });
    if (!existing) return { error: "Team member not found." };

    const oldEmail = existing.email?.toLowerCase();
    const newEmail = email?.toLowerCase();

    if (newEmail !== oldEmail) {
      const defaultPerms = await getStoredDefaultPermissions();
      if (oldEmail) {
        const otherWithOld = await db.teamMember.findFirst({
          where: { email: oldEmail, NOT: { id } },
        });
        if (!otherWithOld) {
          const oldUser = await db.user.findUnique({ where: { email: oldEmail } });
          if (oldUser) {
            await db.user.update({
              where: { id: oldUser.id },
              data: {
                customPermissions: (oldUser.customPermissions || []).filter(
                  (p) => !defaultPerms.includes(p)
                ),
              },
            });
          }
        }
      }
      if (newEmail) {
        const newUser = await db.user.findUnique({ where: { email: newEmail } });
        if (newUser) {
          const merged = Array.from(new Set([...(newUser.customPermissions || []), ...defaultPerms]));
          await db.user.update({
            where: { id: newUser.id },
            data: { customPermissions: merged },
          });
        }
      }
    }

    await db.teamMember.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        role: role ?? existing.role,
        email: email !== undefined ? email : existing.email,
        phone: phone !== undefined ? phone : existing.phone,
        photoUrl: photoUrl !== undefined ? photoUrl : existing.photoUrl,
        displayOrder: displayOrder !== undefined ? displayOrder : existing.displayOrder,
      },
    });
  }

  revalidatePath("/admin/team");
  revalidatePath("/team");
  revalidatePath("/contact");
  revalidatePath("/admin/users");
  return { success: "Team member updated successfully." };
}

export async function deleteTeamMemberAction(formData: FormData): Promise<TeamActionResult> {
  await requirePermission(PERM_TEAM_MANAGE);

  const parsed = deleteTeamMemberSchema.safeParse({
    id: formData.get("id"),
  });

  if (!parsed.success) {
    return { error: "Invalid member ID." };
  }

  const { id } = parsed.data;

  try {
    await backendFetch(`/api/v1/team/${id}`, {
      method: "DELETE",
    });
  } catch {
    const existing = await db.teamMember.findUnique({ where: { id } });
    if (!existing) return { error: "Team member not found." };

    if (existing.email) {
      const email = existing.email.toLowerCase();
      const otherWithEmail = await db.teamMember.findFirst({
        where: { email, NOT: { id } },
      });
      if (!otherWithEmail) {
        const defaultPerms = await getStoredDefaultPermissions();
        const user = await db.user.findUnique({ where: { email } });
        if (user) {
          await db.user.update({
            where: { id: user.id },
            data: {
              customPermissions: (user.customPermissions || []).filter(
                (p) => !defaultPerms.includes(p)
              ),
            },
          });
        }
      }
    }

    await db.teamMember.delete({ where: { id } });
  }

  revalidatePath("/admin/team");
  revalidatePath("/team");
  revalidatePath("/contact");
  revalidatePath("/admin/users");
  return { success: "Team member removed." };
}

export async function updateDefaultPermissionsAction(
  permissions: string[],
  syncExistingMembers: boolean = false
): Promise<TeamActionResult> {
  await requirePermission(PERM_TEAM_MANAGE);

  const parsed = updateDefaultPermissionsSchema.safeParse({
    defaultPermissions: permissions,
    syncExistingMembers,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid permissions." };
  }

  try {
    await backendFetch("/api/v1/team/permissions/defaults", {
      method: "PUT",
      body: JSON.stringify(parsed.data),
    });
  } catch {
    try {
      await db.systemSetting.upsert({
        where: { key: PLACEMENT_TEAM_DEFAULT_PERMISSIONS_KEY },
        update: { value: JSON.stringify(parsed.data.defaultPermissions) },
        create: {
          key: PLACEMENT_TEAM_DEFAULT_PERMISSIONS_KEY,
          value: JSON.stringify(parsed.data.defaultPermissions),
        },
      });
    } catch {
      // SystemSetting fallback
    }

    if (syncExistingMembers) {
      const teamMembers = await db.teamMember.findMany();
      const emails = teamMembers.map((m) => m.email?.toLowerCase()).filter(Boolean) as string[];
      if (emails.length > 0) {
        const users = await db.user.findMany({
          where: { email: { in: emails } },
        });
        for (const user of users) {
          const merged = Array.from(
            new Set([...(user.customPermissions || []), ...parsed.data.defaultPermissions])
          );
          await db.user.update({
            where: { id: user.id },
            data: { customPermissions: merged },
          });
        }
      }
    }
  }

  revalidatePath("/admin/team");
  revalidatePath("/admin/users");
  return {
    success: syncExistingMembers
      ? "Default permissions updated and synchronized with all active placement team members."
      : "Default permissions updated for new placement team members.",
  };
}

export async function reorderTeamMembersAction(
  items: { id: string; displayOrder: number }[]
): Promise<TeamActionResult> {
  await requirePermission(PERM_TEAM_MANAGE);

  const parsed = reorderTeamSchema.safeParse({ items });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid reorder data." };
  }

  try {
    await backendFetch("/api/v1/team/reorder", {
      method: "PUT",
      body: JSON.stringify({ items: parsed.data.items }),
    });
  } catch {
    for (const item of parsed.data.items) {
      await db.teamMember.update({
        where: { id: item.id },
        data: { displayOrder: item.displayOrder },
      });
    }
  }

  revalidatePath("/admin/team");
  revalidatePath("/team");
  revalidatePath("/contact");
  return { success: "Display order updated." };
}
