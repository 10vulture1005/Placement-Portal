"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { backendFetch } from "@/lib/api-client";
import type { BackendFeedback } from "@/lib/backend-types";
import { requireStudent } from "@/lib/student-session";

export type FeedbackSubmitResult = { error?: string; reference?: string };

const feedbackSchema = z.object({
  feedbackType: z.enum(["QUERY", "FEEDBACK", "COMPLAINT"]),
  subject: z.string().trim().min(5).max(150),
  message: z.string().trim().min(20).max(4000),
});

export async function submitFeedback(formData: FormData): Promise<FeedbackSubmitResult> {
  const parsed = feedbackSchema.safeParse({
    feedbackType: formData.get("feedbackType"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  });
  if (!parsed.success) return { error: "Enter a subject and a message of at least 20 characters." };

  await requireStudent();

  try {
    const feedback = await backendFetch<BackendFeedback>("/api/v1/feedback", {
      method: "POST",
      body: JSON.stringify({
        feedbackType: parsed.data.feedbackType,
        content: JSON.stringify({ subject: parsed.data.subject, message: parsed.data.message }),
      }),
    });
    revalidatePath("/feedback");
    return { reference: `FB-${feedback.id.slice(-8).toUpperCase()}` };
  } catch (error) {
    console.error("Failed to submit feedback", error);
    return { error: "Failed to submit feedback." };
  }
}
