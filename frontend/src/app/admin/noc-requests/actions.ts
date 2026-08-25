"use server";

import { revalidatePath } from "next/cache";
import { backendAuthHeader, backendBaseUrl, backendFetch } from "@/lib/api-client";
import { requirePermission } from "@/lib/admin-session";
import { db } from "@/lib/db";
import { PERM_NOC_MANAGE } from "@/lib/permissions";
import { nocApproveSchema, nocRejectSchema } from "@/lib/noc-schema";

export type NocActionResult = { error?: string; success?: string };

export async function approveNocAction(formData: FormData): Promise<NocActionResult> {
  await requirePermission(PERM_NOC_MANAGE);

  const rawNocId = formData.get("nocId");
  const rawMessage = formData.get("message");
  const rawDocUrl = formData.get("documentUrl");

  const parsed = nocApproveSchema.safeParse({
    nocId: rawNocId,
    message: rawMessage || undefined,
    documentUrl: rawDocUrl || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid approval parameters." };
  }

  const { nocId, message, documentUrl } = parsed.data;

  try {
    try {
      await backendFetch(`/api/v1/noc/admin/${nocId}/approve`, {
        method: "POST",
        body: JSON.stringify({
          message: message ?? undefined,
          documentUrl: documentUrl ?? undefined,
        }),
      });
    } catch {
      // Direct Prisma fallback
      await db.nocRequest.update({
        where: { id: nocId },
        data: {
          status: "APPROVED",
          message: message ?? undefined,
          documentUrl: documentUrl ?? undefined,
        },
      });
    }
  } catch (err) {
    console.error("Failed to approve NOC", err);
    return { error: err instanceof Error ? err.message : "Failed to approve NOC request." };
  }

  revalidatePath("/admin/noc-requests");
  revalidatePath("/forms");
  return { success: "NOC request approved successfully." };
}

export async function rejectNocAction(formData: FormData): Promise<NocActionResult> {
  await requirePermission(PERM_NOC_MANAGE);

  const rawNocId = formData.get("nocId");
  const rawMessage = formData.get("message");

  const parsed = nocRejectSchema.safeParse({
    nocId: rawNocId,
    message: rawMessage,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please provide a rejection reason." };
  }

  const { nocId, message } = parsed.data;

  try {
    try {
      await backendFetch(`/api/v1/noc/admin/${nocId}/reject`, {
        method: "POST",
        body: JSON.stringify({
          message,
        }),
      });
    } catch {
      // Direct Prisma fallback
      await db.nocRequest.update({
        where: { id: nocId },
        data: {
          status: "REJECTED",
          message,
        },
      });
    }
  } catch (err) {
    console.error("Failed to reject NOC", err);
    return { error: err instanceof Error ? err.message : "Failed to reject NOC request." };
  }

  revalidatePath("/admin/noc-requests");
  revalidatePath("/forms");
  return { success: "NOC request rejected." };
}

export async function uploadNocDocumentAction(formData: FormData): Promise<{ error?: string; url?: string }> {
  await requirePermission(PERM_NOC_MANAGE);

  const file = formData.get("file") as File | null;
  const nocId = formData.get("nocId") as string | null;

  if (!file || !(file instanceof File) || file.size === 0) {
    return { error: "Please select a valid PDF file to upload." };
  }

  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return { error: "Only PDF files are supported." };
  }

  try {
    const uploadData = new FormData();
    uploadData.append("file", file);

    const endpoint = nocId
      ? `/api/v1/noc/admin/${nocId}/document`
      : `/api/v1/uploads/admin/noc-document`;

    const res = await fetch(`${backendBaseUrl()}${endpoint}`, {
      method: "POST",
      body: uploadData,
      headers: await backendAuthHeader(),
    });

    if (!res.ok) {
      const errText = await res.text();
      let detail = errText;
      try {
        detail = JSON.parse(errText).detail || errText;
      } catch {}
      throw new Error(detail);
    }

    const data = await res.json() as { url: string };

    if (nocId) {
      revalidatePath("/admin/noc-requests");
      revalidatePath("/forms");
    }

    return { url: data.url };
  } catch (err) {
    console.error("Failed to upload NOC document", err);
    return { error: err instanceof Error ? err.message : "Failed to upload document." };
  }
}
