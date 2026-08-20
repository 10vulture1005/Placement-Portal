"use server";

import { revalidatePath } from "next/cache";
import { backendAuthHeader, backendBaseUrl } from "@/lib/api-client";
import { requireStudent } from "@/lib/student-session";

const MAX_RESUME_BYTES = 5 * 1024 * 1024;

export async function uploadResume(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "No file provided" };
  if (file.type !== "application/pdf") return { error: "Only PDF files are allowed" };
  if (file.size > MAX_RESUME_BYTES) return { error: "File exceeds the 5MB limit" };

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
      return { error: `Upload failed: ${await res.text()}` };
    }

    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    console.error("Resume upload failed", error);
    return { error: "Failed to upload file" };
  }
}
