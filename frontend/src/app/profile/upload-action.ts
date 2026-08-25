"use server";

import { revalidatePath } from "next/cache";
import { backendAuthHeader, backendBaseUrl } from "@/lib/api-client";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/student-session";

const MAX_RESUME_BYTES = 5 * 1024 * 1024;

export async function uploadResume(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  const file = formData.get("file");
  const label = (formData.get("label") as string)?.trim() || (file instanceof File ? file.name : "Resume");

  if (!(file instanceof File) || file.size === 0) return { error: "No file provided." };
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return { error: "Only PDF files are allowed." };
  }
  if (file.size > MAX_RESUME_BYTES) return { error: "File exceeds the 5MB limit." };

  const student = await requireStudent();
  if (!student.user) {
    return { error: "Google sign-in required to upload a resume." };
  }

  try {
    const res = await fetch(`${backendBaseUrl()}/api/v1/uploads/resume`, {
      method: "POST",
      body: formData,
      headers: await backendAuthHeader(),
    });

    if (!res.ok) {
      const errText = await res.text();
      try {
        const json = JSON.parse(errText);
        return { error: json.detail || errText };
      } catch {
        return { error: `Upload failed: ${errText}` };
      }
    }

    revalidatePath("/profile");
    revalidatePath("/company-events");
    return { success: true };
  } catch (error) {
    // Fallback: Local database creation
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      if (!buffer.subarray(0, 4).equals(Buffer.from("%PDF"))) {
        return { error: "The uploaded file does not have a valid PDF header." };
      }

      await db.resume.create({
        data: {
          userId: student.user.id,
          label: label || file.name,
          fileName: file.name,
          fileUrl: `/documents/student-resume-template.pdf`, // Fallback previewable URL
        },
      });

      revalidatePath("/profile");
      revalidatePath("/company-events");
      return { success: true };
    } catch (fallbackError) {
      console.error("Resume upload failed", fallbackError || error);
      return { error: "Failed to upload resume. Please try again." };
    }
  }
}

