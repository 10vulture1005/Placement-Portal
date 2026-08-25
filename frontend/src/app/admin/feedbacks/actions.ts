"use server";

import { revalidatePath } from "next/cache";
import { backendFetch } from "@/lib/api-client";
import { requirePermission } from "@/lib/admin-session";
import { db } from "@/lib/db";
import { PERM_FEEDBACKS_MANAGE } from "@/lib/permissions";
import { feedbackDeleteSchema, feedbackReplySchema } from "@/lib/feedback-schema";

export type FeedbackActionResult = { error?: string; success?: string };

export async function respondFeedbackAction(formData: FormData): Promise<FeedbackActionResult> {
  await requirePermission(PERM_FEEDBACKS_MANAGE);

  const rawFeedbackId = formData.get("feedbackId");
  const rawAdminResponse = formData.get("adminResponse");
  const rawResolve = formData.get("resolve");

  const parsed = feedbackReplySchema.safeParse({
    feedbackId: rawFeedbackId,
    adminResponse: rawAdminResponse,
    resolve: rawResolve === "true" || rawResolve === "on" || rawResolve === "1",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please provide a valid response." };
  }

  const { feedbackId, adminResponse, resolve } = parsed.data;

  try {
    try {
      await backendFetch(`/api/v1/feedback/admin/${feedbackId}/respond`, {
        method: "POST",
        body: JSON.stringify({
          adminResponse,
          resolve,
        }),
      });
    } catch {
      // Direct Prisma fallback
      await db.feedback.update({
        where: { id: feedbackId },
        data: {
          adminResponse,
          resolved: resolve ? true : undefined,
          resolvedAt: resolve ? new Date() : undefined,
        },
      });
    }
  } catch (err) {
    console.error("Failed to respond to feedback", err);
    return { error: err instanceof Error ? err.message : "Failed to record response." };
  }

  revalidatePath("/admin/feedbacks");
  revalidatePath("/feedback");
  return { success: "Response submitted successfully." };
}

export async function deleteFeedbackAction(formData: FormData): Promise<FeedbackActionResult> {
  await requirePermission(PERM_FEEDBACKS_MANAGE);

  const parsed = feedbackDeleteSchema.safeParse({
    feedbackId: formData.get("feedbackId"),
  });

  if (!parsed.success) {
    return { error: "Invalid feedback identifier." };
  }

  const { feedbackId } = parsed.data;

  try {
    try {
      await backendFetch(`/api/v1/feedback/admin/${feedbackId}`, {
        method: "DELETE",
      });
    } catch {
      await db.feedback.delete({ where: { id: feedbackId } });
    }
  } catch (err) {
    console.error("Failed to delete feedback", err);
    return { error: err instanceof Error ? err.message : "Failed to delete feedback item." };
  }

  revalidatePath("/admin/feedbacks");
  revalidatePath("/feedback");
  return { success: "Feedback item deleted." };
}
