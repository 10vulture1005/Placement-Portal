"use server";

import { revalidatePath } from "next/cache";
import { studentProfileSchema } from "@/lib/profile-schema";
import { db } from "@/lib/db";
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
  if (!student.user) {
    return { error: "Development credential profiles are not stored." };
  }

  try {
    const { backendFetch } = await import("@/lib/api-client");
    await backendFetch("/api/v1/profile", {
      method: "PATCH",
      body: JSON.stringify(parsed.data),
    });
  } catch (error: any) {
    if (error.message?.includes("P2002") || error.message?.includes("already in use")) {
      return { error: "That roll number or personal email is already in use." };
    }
    return { error: "Failed to update profile." };
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/company-events");
  return { success: "Profile saved." };
}
