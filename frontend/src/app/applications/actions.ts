"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { backendFetch } from "@/lib/api-client";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/student-session";

const withdrawalSchema = z.object({ applicationId: z.string().min(1) });

export async function withdrawApplication(formData: FormData) {
  const parsed = withdrawalSchema.safeParse({
    applicationId: formData.get("applicationId"),
  });
  if (!parsed.success) return;

  const student = await requireStudent();
  if (!student.user) return;

  try {
    await backendFetch(`/api/v1/applications/${parsed.data.applicationId}/withdraw`, {
      method: "PATCH",
    });
  } catch {
    // Prisma fallback
    await db.application.updateMany({
      where: {
        id: parsed.data.applicationId,
        userId: student.user.id,
        status: { in: ["APPLIED", "SHORTLISTED"] },
      },
      data: { status: "WITHDRAWN" },
    });
  }

  revalidatePath("/applications");
  revalidatePath("/dashboard");
}

