"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { evaluateEligibility, isEligible } from "@/lib/eligibility";
import { toEligibilityProfile } from "@/lib/student-profile";
import { requireStudent } from "@/lib/student-session";

export type ApplyState = { error?: string; success?: string };

const applySchema = z.object({ jobId: z.string().trim().min(1).max(100) });

export async function applyToJob(
  _state: ApplyState,
  formData: FormData,
): Promise<ApplyState> {
  const parsed = applySchema.safeParse({ jobId: formData.get("jobId") });
  if (!parsed.success) return { error: "Invalid job profile." };

  const student = await requireStudent();
  if (!student.user) {
    return { error: "Persistent applications require Google sign-in." };
  }

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

  await db.application.create({
    data: { userId: student.user.id, jobProfileId: job.id },
  });

  revalidatePath("/dashboard");
  revalidatePath("/applications");
  revalidatePath(`/company-events/${job.id}`);
  return { success: "Application submitted." };
}
