"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/student-session";

const withdrawalSchema = z.object({ applicationId: z.string().cuid() });

export async function withdrawApplication(formData: FormData) {
  const parsed = withdrawalSchema.safeParse({
    applicationId: formData.get("applicationId"),
  });
  if (!parsed.success) return;

  const student = await requireStudent();
  if (!student.user) return;

  await db.application.updateMany({
    where: {
      id: parsed.data.applicationId,
      userId: student.user.id,
      status: { in: ["APPLIED", "SHORTLISTED"] },
    },
    data: { status: "WITHDRAWN" },
  });

  revalidatePath("/applications");
  revalidatePath("/dashboard");
}
