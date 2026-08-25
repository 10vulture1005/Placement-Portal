"use server";

import { revalidatePath } from "next/cache";
import { backendFetch } from "@/lib/api-client";
import type { BackendFeedback } from "@/lib/backend-types";
import { db } from "@/lib/db";
import { feedbackSubmitSchema } from "@/lib/feedback-schema";
import { requireStudent } from "@/lib/student-session";

export type FeedbackSubmitResult = { error?: string; reference?: string };

export async function submitFeedback(formData: FormData): Promise<FeedbackSubmitResult> {
  const parsed = feedbackSubmitSchema.safeParse({
    feedbackType: formData.get("feedbackType"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please enter a valid subject and message." };
  }

  const student = await requireStudent();
  if (!student.user) {
    return { error: "Google sign-in required to submit feedback." };
  }

  const jsonContent = JSON.stringify({
    subject: parsed.data.subject,
    message: parsed.data.message,
  });

  try {
    const feedback = await backendFetch<BackendFeedback>("/api/v1/feedback", {
      method: "POST",
      body: JSON.stringify({
        feedbackType: parsed.data.feedbackType,
        content: jsonContent,
      }),
    });
    revalidatePath("/feedback");
    revalidatePath("/admin/feedbacks");
    return { reference: `FB-${feedback.id.slice(-8).toUpperCase()}` };
  } catch {
    // Prisma fallback
    try {
      const fb = await db.feedback.create({
        data: {
          userId: student.user.id,
          feedbackType: parsed.data.feedbackType,
          content: jsonContent,
        },
      });
      revalidatePath("/feedback");
      revalidatePath("/admin/feedbacks");
      return { reference: `FB-${fb.id.slice(-8).toUpperCase()}` };
    } catch (fallbackError) {
      console.error("Failed to submit feedback", fallbackError);
      return { error: "Failed to submit feedback." };
    }
  }
}

