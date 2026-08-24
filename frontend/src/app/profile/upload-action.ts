"use server";

import { revalidatePath } from "next/cache";
import { backendAuthHeader, backendBaseUrl, backendFetch } from "@/lib/api-client";
import { requireStudent } from "@/lib/student-session";

const MAX_RESUME_BYTES = 5 * 1024 * 1024;

export type ResumeActionResult = { success?: true; error?: string };

export async function uploadResume(formData: FormData): Promise<ResumeActionResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "No file provided." };
  if (file.type !== "application/pdf") return { error: "Only PDF files are allowed." };
  if (file.size > MAX_RESUME_BYTES) return { error: "File exceeds the 5 MB limit." };

  await requireStudent();

  try {
    // Content-Type is intentionally omitted so fetch sets the multipart
    // boundary itself; backendFetch cannot be used because it forces JSON.
    const res = await fetch(`${backendBaseUrl()}/api/v1/uploads/resume`, {
      method: "POST",
      body: formData,
      headers: await backendAuthHeader(),
    });

    if (!res.ok) {
      // Try to surface the FastAPI error detail
      let detail: string;
      try {
        const body = await res.json();
        detail = body?.detail ?? `Upload failed (${res.status})`;
      } catch {
        detail = `Upload failed (${res.status})`;
      }
      return { error: detail };
    }

    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    console.error("Resume upload failed", error);
    return { error: "Failed to upload file. Please try again." };
  }
}

export async function deleteResume(resumeId: string): Promise<ResumeActionResult> {
  if (!resumeId) return { error: "Invalid resume ID." };

  await requireStudent();

  try {
    await backendFetch(`/api/v1/profile/resumes/${resumeId}`, { method: "DELETE" });
    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    console.error("Resume delete failed", error);
    return { error: "Failed to delete resume. Please try again." };
  }
}
