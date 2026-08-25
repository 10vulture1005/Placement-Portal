"use server";

import { revalidatePath } from "next/cache";
import { requireStudent } from "@/lib/student-session";
import { db } from "@/lib/db";
import { nocCancelSchema, nocFormSchema } from "@/lib/noc-schema";

export type NocSubmitResult = { error?: string; success?: boolean; message?: string };

export async function submitNocRequest(formData: FormData): Promise<NocSubmitResult> {
  const parsed = nocFormSchema.safeParse({
    company: formData.get("company"),
    city: formData.get("city"),
    address: formData.get("address"),
    state: formData.get("state"),
    pincode: formData.get("pincode"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    message: formData.get("message") || undefined,
  });

  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message || "Please check your inputs.";
    return { error: errorMsg };
  }

  const student = await requireStudent();
  if (!student.user) {
    return { error: "Google sign-in required to request an NOC." };
  }

  try {
    const { backendFetch } = await import("@/lib/api-client");
    await backendFetch("/api/v1/noc", {
      method: "POST",
      body: JSON.stringify({
        company: parsed.data.company,
        address: parsed.data.address,
        city: parsed.data.city,
        state: parsed.data.state,
        pincode: parsed.data.pincode,
        startDate: new Date(parsed.data.startDate).toISOString(),
        endDate: new Date(parsed.data.endDate).toISOString(),
        message: parsed.data.message ?? undefined,
      }),
    });
    revalidatePath("/forms");
    revalidatePath("/admin/noc-requests");
    return { success: true, message: "NOC request submitted successfully." };
  } catch {
    // Prisma fallback
    try {
      await db.nocRequest.create({
        data: {
          userId: student.user.id,
          company: parsed.data.company,
          address: parsed.data.address,
          city: parsed.data.city,
          state: parsed.data.state,
          pincode: parsed.data.pincode,
          startDate: new Date(parsed.data.startDate),
          endDate: new Date(parsed.data.endDate),
          message: parsed.data.message ?? null,
        },
      });
      revalidatePath("/forms");
      revalidatePath("/admin/noc-requests");
      return { success: true, message: "NOC request submitted successfully." };
    } catch (fallbackError) {
      console.error("Failed to submit NOC request", fallbackError);
      return { error: "Failed to submit NOC request. Please try again." };
    }
  }
}

export async function cancelNocRequestAction(formData: FormData): Promise<NocSubmitResult> {
  const parsed = nocCancelSchema.safeParse({
    nocId: formData.get("nocId"),
  });

  if (!parsed.success) {
    return { error: "Invalid NOC request ID." };
  }

  const student = await requireStudent();
  if (!student.user) {
    return { error: "Google sign-in required to cancel an NOC request." };
  }

  try {
    const { backendFetch } = await import("@/lib/api-client");
    await backendFetch(`/api/v1/noc/${parsed.data.nocId}/cancel`, {
      method: "PATCH",
    });
  } catch {
    try {
      const match = await db.nocRequest.findFirst({
        where: { id: parsed.data.nocId, userId: student.user.id, status: "PENDING" },
      });
      if (!match) {
        return { error: "NOC request not found or cannot be cancelled." };
      }
      await db.nocRequest.delete({ where: { id: parsed.data.nocId } });
    } catch (fallbackError) {
      console.error("Failed to cancel NOC request", fallbackError);
      return { error: "Failed to cancel NOC request." };
    }
  }

  revalidatePath("/forms");
  revalidatePath("/admin/noc-requests");
  return { success: true, message: "NOC request cancelled successfully." };
}


