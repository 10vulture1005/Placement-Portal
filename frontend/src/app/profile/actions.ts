"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { backendAuthHeader, backendBaseUrl, backendFetch } from "@/lib/api-client";
import { db } from "@/lib/db";
import { encryptSensitiveValue } from "@/lib/encryption";
import { studentProfileSchema } from "@/lib/profile-schema";
import { requireStudent } from "@/lib/student-session";

export type ProfileUpdateResult = {
  success?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function updateStudentProfile(
  formData: FormData,
): Promise<ProfileUpdateResult> {
  const parsed = studentProfileSchema.safeParse({
    name: formData.get("name"),
    rollNumber: formData.get("rollNumber"),
    personalEmail: formData.get("personalEmail"),
    contactNumber: formData.get("contactNumber"),
    altContactNumber: formData.get("altContactNumber"),
    branch: formData.get("branch"),
    degree: formData.get("degree"),
    batch: formData.get("batch"),
    gender: formData.get("gender"),
    bloodGroup: formData.get("bloodGroup"),
    dateOfBirth: formData.get("dateOfBirth"),
    currentAddress: formData.get("currentAddress"),
    class10Percent: formData.get("class10Percent"),
    class12Percent: formData.get("class12Percent"),
    cgpa: formData.get("cgpa"),
    backlogs: formData.get("backlogs"),
  });
  if (!parsed.success) {
    return {
      error: "Check the highlighted profile fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const student = await requireStudent();

  try {
    await backendFetch("/api/v1/profile", {
      method: "PATCH",
      body: JSON.stringify(parsed.data),
    });
  } catch (error) {
    // Prisma fallback
    try {
      if (student.user) {
        await db.user.update({
          where: { id: student.user.id },
          data: {
            ...parsed.data,
            dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : null,
          },
        });
      }
    } catch (fallbackErr) {
      const message = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr || error);
      if (message.includes("P2002") || message.includes("already in use") || message.includes("Unique constraint")) {
        return { error: "That roll number or personal email is already in use." };
      }
      console.error("Failed to update profile", fallbackErr || error);
      return { error: "Failed to update profile." };
    }
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/company-events");
  return { success: "Profile saved." };
}

const aadhaarSchema = z.string().trim().regex(/^[0-9]{12}$/, "Aadhaar must be exactly 12 numeric digits.");

export async function updateAadhaarAction(formData: FormData): Promise<{ success?: string; error?: string }> {
  const raw = formData.get("aadhaar");
  const parsed = aadhaarSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid Aadhaar number." };
  }

  const student = await requireStudent();
  if (!student.user) {
    return { error: "Google sign-in required to update identity documents." };
  }

  try {
    await backendFetch("/api/v1/profile/aadhaar", {
      method: "PUT",
      body: JSON.stringify({ aadhaar: parsed.data }),
    });
  } catch (backendErr) {
    // Direct fallback
    try {
      const encrypted = encryptSensitiveValue(parsed.data);
      await db.user.update({
        where: { id: student.user.id },
        data: { aadhaarEncrypted: encrypted },
      });
    } catch (fallbackErr) {
      console.error("Failed to save Aadhaar", fallbackErr || backendErr);
      return { error: "Failed to save Aadhaar. Please try again." };
    }
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { success: "Aadhaar saved securely." };
}

const panSchema = z.string().trim().toUpperCase().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "PAN must be in standard format (e.g. ABCDE1234F).");

export async function updatePanAction(formData: FormData): Promise<{ success?: string; error?: string }> {
  const raw = formData.get("pan");
  const parsed = panSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid PAN format." };
  }

  const student = await requireStudent();
  if (!student.user) {
    return { error: "Google sign-in required to update identity documents." };
  }

  try {
    await backendFetch("/api/v1/profile/pan", {
      method: "PUT",
      body: JSON.stringify({ pan: parsed.data }),
    });
  } catch (backendErr) {
    // Direct fallback
    try {
      const encrypted = encryptSensitiveValue(parsed.data);
      await db.user.update({
        where: { id: student.user.id },
        data: { panCardEncrypted: encrypted },
      });
    } catch (fallbackErr) {
      console.error("Failed to save PAN", fallbackErr || backendErr);
      return { error: "Failed to save PAN. Please try again." };
    }
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { success: "PAN saved securely." };
}

export async function renameResumeAction(resumeId: string, label: string): Promise<{ success?: string; error?: string }> {
  const cleanLabel = label.trim();
  if (!cleanLabel) {
    return { error: "Resume label cannot be empty." };
  }

  const student = await requireStudent();
  if (!student.user) {
    return { error: "Google sign-in required." };
  }

  try {
    await backendFetch(`/api/v1/profile/resumes/${resumeId}`, {
      method: "PATCH",
      body: JSON.stringify({ label: cleanLabel }),
    });
  } catch (backendErr) {
    try {
      await db.resume.updateMany({
        where: { id: resumeId, userId: student.user.id },
        data: { label: cleanLabel },
      });
    } catch (fallbackErr) {
      console.error("Failed to rename resume", fallbackErr || backendErr);
      return { error: "Failed to rename resume." };
    }
  }

  revalidatePath("/profile");
  revalidatePath("/company-events");
  return { success: "Resume label updated." };
}

export async function deleteResumeAction(resumeId: string): Promise<{ success?: string; error?: string }> {
  const student = await requireStudent();
  if (!student.user) {
    return { error: "Google sign-in required." };
  }

  try {
    await backendFetch(`/api/v1/profile/resumes/${resumeId}`, {
      method: "DELETE",
    });
  } catch (backendErr) {
    try {
      await db.resume.deleteMany({
        where: { id: resumeId, userId: student.user.id },
      });
    } catch (fallbackErr) {
      console.error("Failed to delete resume", fallbackErr || backendErr);
      return { error: "Failed to delete resume." };
    }
  }

  revalidatePath("/profile");
  revalidatePath("/company-events");
  return { success: "Resume deleted." };
}

export async function uploadAadhaarDocAction(formData: FormData): Promise<{ success?: string; error?: string }> {
  const rawAadhaar = (formData.get("aadhaar") as string)?.trim();
  const file = formData.get("file");

  const parsedNumber = aadhaarSchema.safeParse(rawAadhaar);
  if (!parsedNumber.success) {
    return { error: parsedNumber.error.issues[0]?.message || "Invalid Aadhaar number." };
  }

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please select a valid PDF file." };
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return { error: "Only PDF files are allowed for Aadhaar documents." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { error: "File exceeds 5MB limit." };
  }

  const student = await requireStudent();
  if (!student.user) {
    return { error: "Google sign-in required." };
  }

  try {
    const res = await fetch(`${backendBaseUrl()}/api/v1/profile/aadhaar-doc`, {
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
        return { error: errText };
      }
    }
  } catch (backendErr) {
    // Fallback: local disk write and encryption
    try {
      const { mkdirSync, writeFileSync } = await import("node:fs");
      const path = await import("node:path");
      const { encryptBuffer } = await import("@/lib/encryption");

      const fileBuffer = Buffer.from(await file.arrayBuffer());
      if (!fileBuffer.subarray(0, 4).equals(Buffer.from("%PDF"))) {
        return { error: "Uploaded file does not have a valid PDF header." };
      }

      const encryptedFile = encryptBuffer(fileBuffer);
      const uploadsDir = process.env.UPLOADS_DIR || "./uploads";
      const targetDir = path.join(uploadsDir, "identity_docs", student.user.id);
      mkdirSync(targetDir, { recursive: true });
      writeFileSync(path.join(targetDir, "aadhaar.enc"), encryptedFile);

      const encryptedNumber = encryptSensitiveValue(parsedNumber.data);
      await db.user.update({
        where: { id: student.user.id },
        data: {
          aadhaarEncrypted: encryptedNumber,
          aadhaarDocUrl: `identity_docs/${student.user.id}/aadhaar.enc`,
          aadhaarDocFileName: file.name,
        },
      });
    } catch (fallbackErr) {
      console.error("Failed to save Aadhaar document", fallbackErr || backendErr);
      return { error: "Failed to upload Aadhaar document." };
    }
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { success: "Aadhaar document encrypted and saved successfully." };
}

export async function uploadPanDocAction(formData: FormData): Promise<{ success?: string; error?: string }> {
  const rawPan = (formData.get("pan") as string)?.trim().toUpperCase();
  const file = formData.get("file");

  const parsedNumber = panSchema.safeParse(rawPan);
  if (!parsedNumber.success) {
    return { error: parsedNumber.error.issues[0]?.message || "Invalid PAN." };
  }

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please select a valid PDF file." };
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return { error: "Only PDF files are allowed for PAN documents." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { error: "File exceeds 5MB limit." };
  }

  const student = await requireStudent();
  if (!student.user) {
    return { error: "Google sign-in required." };
  }

  try {
    const res = await fetch(`${backendBaseUrl()}/api/v1/profile/pan-doc`, {
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
        return { error: errText };
      }
    }
  } catch (backendErr) {
    // Fallback
    try {
      const { mkdirSync, writeFileSync } = await import("node:fs");
      const path = await import("node:path");
      const { encryptBuffer } = await import("@/lib/encryption");

      const fileBuffer = Buffer.from(await file.arrayBuffer());
      if (!fileBuffer.subarray(0, 4).equals(Buffer.from("%PDF"))) {
        return { error: "Uploaded file does not have a valid PDF header." };
      }

      const encryptedFile = encryptBuffer(fileBuffer);
      const uploadsDir = process.env.UPLOADS_DIR || "./uploads";
      const targetDir = path.join(uploadsDir, "identity_docs", student.user.id);
      mkdirSync(targetDir, { recursive: true });
      writeFileSync(path.join(targetDir, "pan.enc"), encryptedFile);

      const encryptedNumber = encryptSensitiveValue(parsedNumber.data);
      await db.user.update({
        where: { id: student.user.id },
        data: {
          panCardEncrypted: encryptedNumber,
          panCardDocUrl: `identity_docs/${student.user.id}/pan.enc`,
          panCardDocFileName: file.name,
        },
      });
    } catch (fallbackErr) {
      console.error("Failed to save PAN document", fallbackErr || backendErr);
      return { error: "Failed to upload PAN document." };
    }
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { success: "PAN document encrypted and saved successfully." };
}

export async function deleteAadhaarDocAction(): Promise<{ success?: string; error?: string }> {
  const student = await requireStudent();
  if (!student.user) return { error: "Unauthorized" };

  try {
    await backendFetch("/api/v1/profile/aadhaar-doc", { method: "DELETE" });
  } catch (backendErr) {
    try {
      await db.user.update({
        where: { id: student.user.id },
        data: { aadhaarDocUrl: null, aadhaarDocFileName: null },
      });
    } catch (fallbackErr) {
      console.error("Failed to delete Aadhaar doc", fallbackErr || backendErr);
      return { error: "Failed to delete Aadhaar document." };
    }
  }

  revalidatePath("/profile");
  return { success: "Aadhaar document removed." };
}

export async function deletePanDocAction(): Promise<{ success?: string; error?: string }> {
  const student = await requireStudent();
  if (!student.user) return { error: "Unauthorized" };

  try {
    await backendFetch("/api/v1/profile/pan-doc", { method: "DELETE" });
  } catch (backendErr) {
    try {
      await db.user.update({
        where: { id: student.user.id },
        data: { panCardDocUrl: null, panCardDocFileName: null },
      });
    } catch (fallbackErr) {
      console.error("Failed to delete PAN doc", fallbackErr || backendErr);
      return { error: "Failed to delete PAN document." };
    }
  }

  revalidatePath("/profile");
  return { success: "PAN document removed." };
}


