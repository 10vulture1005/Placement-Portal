"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { backendFetch } from "@/lib/api-client";
import { db } from "@/lib/db";
import { evaluateEligibility, isEligible } from "@/lib/eligibility";
import { toEligibilityProfile } from "@/lib/student-profile";
import { requireStudent } from "@/lib/student-session";

export type ApplyState = { error?: string; success?: string };

const applySchema = z.object({
  jobId: z.string().trim().min(1).max(100),
  resumeId: z.string().trim().max(100).optional().nullable(),
});

export async function applyToJob(
  _state: ApplyState,
  formData: FormData,
): Promise<ApplyState> {
  const rawResumeId = formData.get("resumeId");
  const parsed = applySchema.safeParse({
    jobId: formData.get("jobId"),
    resumeId: typeof rawResumeId === "string" && rawResumeId.trim() ? rawResumeId.trim() : null,
  });
  if (!parsed.success) return { error: "Invalid job profile or resume selection." };

  const student = await requireStudent();
  if (!student.user) {
    return { error: "Persistent applications require Google sign-in." };
  }

  // Attempt backend FastAPI endpoint
  try {
    await backendFetch("/api/v1/applications", {
      method: "POST",
      body: JSON.stringify({
        jobProfileId: parsed.data.jobId,
        resumeId: parsed.data.resumeId || null,
      }),
    });

    revalidatePath("/dashboard");
    revalidatePath("/applications");
    revalidatePath(`/company-events/${parsed.data.jobId}`);
    return { success: "Application submitted." };
  } catch (backendErr: unknown) {
    const errorMsg = backendErr instanceof Error ? backendErr.message : String(backendErr);
    
    // If backend gave an explicit error (eligibility, deadline, duplicate, validation)
    if (errorMsg.includes("detail") || errorMsg.includes("eligibility") || errorMsg.includes("Already applied") || errorMsg.includes("already submitted")) {
      try {
        const jsonErr = JSON.parse(errorMsg);
        const detail = jsonErr.detail;
        if (typeof detail === "string") {
          if (detail.toLowerCase().includes("already applied") || detail.toLowerCase().includes("already submitted")) {
            return { success: "Application already submitted." };
          }
          return { error: detail };
        } else if (Array.isArray(detail)) {
          const combined = detail.map((e: { msg?: string }) => e.msg ?? JSON.stringify(e)).join(", ");
          return { error: combined || "Validation error" };
        } else if (detail) {
          return { error: JSON.stringify(detail) };
        }
      } catch {
        return { error: errorMsg };
      }
    }

    // Direct Prisma fallback for standalone local mode
    const [job, resumeCount, existingApplication] = await Promise.all([
      db.jobProfile.findUnique({ where: { id: parsed.data.jobId } }),
      db.resume.count({ where: { userId: student.user.id } }),
      db.application.findUnique({
        where: {
          userId_jobProfileId: {
            userId: student.user.id,
            jobProfileId: parsed.data.jobId,
          },
        },
      }),
    ]);

    if (!job || job.status !== "ACTIVE" || job.registrationDeadline <= new Date()) {
      return { error: "Applications for this role are closed." };
    }
    if (existingApplication) return { success: "Application already submitted." };

    const profile = toEligibilityProfile(student.user, resumeCount);
    if (!profile) return { error: "Complete your academic profile before applying." };

    const eligible = isEligible(
      evaluateEligibility(profile, {
        minCgpa: job.minCGPA,
        batch: job.batch,
        branches: job.allowedBranches,
        maxBacklogs: job.maxBacklogs,
        maxBans: job.maxBans,
      }),
    );
    if (!eligible) return { error: "Your current profile does not meet this role’s criteria." };

    if (parsed.data.resumeId) {
      const resume = await db.resume.findFirst({
        where: { id: parsed.data.resumeId, userId: student.user.id },
      });
      if (!resume) {
        return { error: "Selected resume is invalid or does not belong to you." };
      }
    }

    await db.application.create({
      data: {
        userId: student.user.id,
        jobProfileId: job.id,
        resumeId: parsed.data.resumeId || null,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/applications");
    revalidatePath(`/company-events/${job.id}`);
    return { success: "Application submitted." };
  }
}

