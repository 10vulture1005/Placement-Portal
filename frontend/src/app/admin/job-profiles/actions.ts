"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-session";
import { db } from "@/lib/db";
import { jobProfileDeleteSchema, jobProfileFormSchema } from "@/lib/job-profile-schema";

export type JobProfileActionResult = { error?: string; success?: string };

function revalidateJobPages() {
  revalidatePath("/admin/job-profiles");
  revalidatePath("/admin/dashboard");
  revalidatePath("/company-events");
  revalidatePath("/dashboard");
}

export async function saveJobProfile(formData: FormData): Promise<JobProfileActionResult> {
  const admin = await requireAdmin();
  if (!admin.user) {
    return { error: "Use a Google administrator account to create persistent job profiles." };
  }

  const parsed = jobProfileFormSchema.safeParse({
    id: formData.get("id") ?? "",
    companyId: formData.get("companyId"),
    title: formData.get("title"),
    type: formData.get("type"),
    locations: formData.get("locations"),
    ctcStipend: formData.get("ctcStipend"),
    ctcStipendInfo: formData.get("ctcStipendInfo"),
    minCGPA: formData.get("minCGPA"),
    maxBacklogs: formData.get("maxBacklogs"),
    maxBans: formData.get("maxBans"),
    allowedBranches: formData.get("allowedBranches"),
    allowedDegrees: formData.get("allowedDegrees"),
    allowedGenders: formData.get("allowedGenders"),
    jobCategory: formData.get("jobCategory"),
    batch: formData.get("batch"),
    registrationDeadline: formData.get("registrationDeadline"),
    status: formData.get("status"),
    description: formData.get("description"),
    openingOverview: formData.get("openingOverview"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the job profile details." };
  }

  const id = parsed.data.id || undefined;
  const company = await db.company.findUnique({ where: { id: parsed.data.companyId }, select: { id: true } });
  if (!company) return { error: "The selected company no longer exists." };

  const data = {
    companyId: parsed.data.companyId,
    title: parsed.data.title,
    type: parsed.data.type,
    locations: parsed.data.locations,
    ctcStipend: parsed.data.ctcStipend,
    ctcStipendInfo: parsed.data.ctcStipendInfo,
    minCGPA: parsed.data.minCGPA,
    maxBacklogs: parsed.data.maxBacklogs,
    maxBans: parsed.data.maxBans,
    allowedBranches: parsed.data.allowedBranches,
    allowedDegrees: parsed.data.allowedDegrees,
    allowedGenders: parsed.data.allowedGenders,
    jobCategory: parsed.data.jobCategory,
    batch: parsed.data.batch,
    registrationDeadline: parsed.data.registrationDeadline,
    status: parsed.data.status,
    description: parsed.data.description,
    openingOverview: parsed.data.openingOverview,
  };

  if (id) {
    const updated = await db.jobProfile.updateMany({ where: { id }, data });
    if (!updated.count) return { error: "Job profile not found." };
  } else {
    await db.jobProfile.create({ data: { ...data, attachments: [], createdById: admin.user.id } });
  }

  revalidateJobPages();
  return { success: id ? "Job profile updated." : "Job profile created." };
}

export async function deleteJobProfile(formData: FormData): Promise<JobProfileActionResult> {
  await requireAdmin();
  const parsed = jobProfileDeleteSchema.safeParse({ jobProfileId: formData.get("jobProfileId") });
  if (!parsed.success) return { error: "Invalid job profile." };

  const applicationCount = await db.application.count({ where: { jobProfileId: parsed.data.jobProfileId } });
  if (applicationCount > 0) {
    return { error: "This job has applications. Set it to Ended instead of deleting it." };
  }

  const deleted = await db.jobProfile.deleteMany({ where: { id: parsed.data.jobProfileId } });
  if (!deleted.count) return { error: "Job profile not found." };
  revalidateJobPages();
  return { success: "Job profile deleted." };
}

