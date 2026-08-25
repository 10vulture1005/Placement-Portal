"use server";

import { revalidatePath } from "next/cache";
import { backendFetch } from "@/lib/api-client";
import { requirePermission } from "@/lib/admin-session";
import { db } from "@/lib/db";
import { PERM_ANNOUNCEMENTS_MANAGE } from "@/lib/permissions";
import {
  announcementDeleteSchema,
  announcementFormSchema,
} from "@/lib/announcement-schema";
import type { AnnouncementCategory } from "@prisma/client";

export type AnnouncementActionResult = { error?: string; success?: string };

export async function saveAnnouncementAction(
  formData: FormData,
): Promise<AnnouncementActionResult> {
  const { user } = await requirePermission(PERM_ANNOUNCEMENTS_MANAGE);

  const rawTags = formData.get("tags");
  let tags: string[] = [];
  if (typeof rawTags === "string" && rawTags.trim()) {
    try {
      const parsedTags = JSON.parse(rawTags);
      tags = Array.isArray(parsedTags) ? parsedTags : rawTags.split(",");
    } catch {
      tags = rawTags.split(",");
    }
  }

  const parsed = announcementFormSchema.safeParse({
    id: formData.get("id") || undefined,
    title: formData.get("title"),
    content: formData.get("content"),
    category: formData.get("category"),
    companyId: formData.get("companyId") || undefined,
    tags,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Please check announcement details.",
    };
  }

  const id = parsed.data.id || undefined;

  try {
    try {
      if (id) {
        await backendFetch(`/api/v1/announcements/${id}`, {
          method: "PATCH",
          body: JSON.stringify({
            title: parsed.data.title,
            content: parsed.data.content,
            category: parsed.data.category,
            companyId: parsed.data.companyId,
            tags: parsed.data.tags,
          }),
        });
      } else {
        await backendFetch("/api/v1/announcements", {
          method: "POST",
          body: JSON.stringify({
            title: parsed.data.title,
            content: parsed.data.content,
            category: parsed.data.category,
            companyId: parsed.data.companyId,
            tags: parsed.data.tags,
          }),
        });
      }
    } catch {
      // Resilient fallback to direct Prisma operations
      if (id) {
        const updated = await db.announcement.updateMany({
          where: { id },
          data: {
            title: parsed.data.title,
            content: parsed.data.content,
            category: parsed.data.category as AnnouncementCategory,
            companyId: parsed.data.companyId ?? null,
            tags: parsed.data.tags,
          },
        });
        if (!updated.count) {
          return { error: "Announcement not found or already deleted." };
        }
      } else {
        await db.announcement.create({
          data: {
            title: parsed.data.title,
            content: parsed.data.content,
            category: parsed.data.category as AnnouncementCategory,
            companyId: parsed.data.companyId ?? null,
            tags: parsed.data.tags,
            createdById: user.id,
          },
        });
      }
    }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to save announcement.",
    };
  }

  revalidatePath("/admin/announcements");
  revalidatePath("/admin/dashboard");
  revalidatePath("/dashboard");
  return {
    success: id
      ? "Announcement updated successfully."
      : "Announcement published successfully.",
  };
}

export async function deleteAnnouncementAction(
  formData: FormData,
): Promise<AnnouncementActionResult> {
  await requirePermission(PERM_ANNOUNCEMENTS_MANAGE);

  const parsed = announcementDeleteSchema.safeParse({
    announcementId: formData.get("announcementId"),
  });

  if (!parsed.success) {
    return { error: "Invalid announcement identifier." };
  }

  try {
    try {
      await backendFetch(`/api/v1/announcements/${parsed.data.announcementId}`, {
        method: "DELETE",
      });
    } catch {
      const deleted = await db.announcement.deleteMany({
        where: { id: parsed.data.announcementId },
      });
      if (!deleted.count) {
        return { error: "Announcement not found." };
      }
    }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to delete announcement.",
    };
  }

  revalidatePath("/admin/announcements");
  revalidatePath("/admin/dashboard");
  revalidatePath("/dashboard");
  return { success: "Announcement deleted successfully." };
}
