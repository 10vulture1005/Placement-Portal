"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { backendFetch } from "@/lib/api-client";
import { requireAdmin } from "@/lib/admin-session";
import { db } from "@/lib/db";
import type { ApplicationStatus } from "@prisma/client";

const validStatuses = ["APPLIED", "SHORTLISTED", "INTERVIEW", "SELECTED", "REJECTED", "WITHDRAWN"] as const;

const updateStatusSchema = z.object({
  applicationId: z.string().min(1),
  status: z.enum(validStatuses),
});

const bulkUpdateSchema = z.object({
  applicationIds: z.array(z.string().min(1)).min(1),
  status: z.enum(validStatuses),
});

export type AdminApplicationActionState = {
  success?: string;
  error?: string;
};

export async function updateApplicationStatusAction(
  applicationId: string,
  newStatus: ApplicationStatus,
): Promise<AdminApplicationActionState> {
  const parsed = updateStatusSchema.safeParse({ applicationId, status: newStatus });
  if (!parsed.success) return { error: "Invalid status or application ID." };

  const admin = await requireAdmin();
  if (!admin.user) return { error: "Unauthorized." };

  try {
    await backendFetch(`/api/v1/applications/admin/${parsed.data.applicationId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: parsed.data.status }),
    });
  } catch {
    // Prisma fallback
    const app = await db.application.findUnique({
      where: { id: parsed.data.applicationId },
      include: { jobProfile: { include: { company: true } } },
    });
    if (!app) return { error: "Application not found." };

    await db.application.update({
      where: { id: parsed.data.applicationId },
      data: { status: parsed.data.status },
    });

    await db.notification.create({
      data: {
        userId: app.userId,
        title: `Application Update: ${app.jobProfile.title}`,
        message: `Your application for ${app.jobProfile.title} at ${app.jobProfile.company.name} is now: ${parsed.data.status}.`,
        link: "/applications",
      },
    });
  }

  revalidatePath("/admin/applications");
  revalidatePath("/admin/dashboard");
  revalidatePath("/applications");
  revalidatePath("/dashboard");
  return { success: `Status updated to ${newStatus}` };
}

export async function bulkUpdateApplicationsAction(
  applicationIds: string[],
  newStatus: ApplicationStatus,
): Promise<AdminApplicationActionState> {
  const parsed = bulkUpdateSchema.safeParse({ applicationIds, status: newStatus });
  if (!parsed.success) return { error: "Select at least one application." };

  const admin = await requireAdmin();
  if (!admin.user) return { error: "Unauthorized." };

  try {
    await backendFetch("/api/v1/applications/admin/bulk-status", {
      method: "POST",
      body: JSON.stringify({ applicationIds: parsed.data.applicationIds, status: parsed.data.status }),
    });
  } catch {
    // Prisma fallback
    const apps = await db.application.findMany({
      where: { id: { in: parsed.data.applicationIds } },
      include: { jobProfile: { include: { company: true } } },
    });

    await db.application.updateMany({
      where: { id: { in: parsed.data.applicationIds } },
      data: { status: parsed.data.status },
    });

    for (const app of apps) {
      await db.notification.create({
        data: {
          userId: app.userId,
          title: `Application Update: ${app.jobProfile.title}`,
          message: `Your application for ${app.jobProfile.title} at ${app.jobProfile.company.name} is now: ${parsed.data.status}.`,
          link: "/applications",
        },
      });
    }
  }

  revalidatePath("/admin/applications");
  revalidatePath("/admin/dashboard");
  revalidatePath("/applications");
  revalidatePath("/dashboard");
  return { success: `Updated ${applicationIds.length} candidate(s) to ${newStatus}` };
}
