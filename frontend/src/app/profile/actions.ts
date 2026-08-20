"use server";

import { revalidatePath } from "next/cache";
import { backendFetch } from "@/lib/api-client";
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

  await requireStudent();

  try {
    await backendFetch("/api/v1/profile", {
      method: "PATCH",
      body: JSON.stringify(parsed.data),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("P2002") || message.includes("already in use")) {
      return { error: "That roll number or personal email is already in use." };
    }
    console.error("Failed to update profile", error);
    return { error: "Failed to update profile." };
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/company-events");
  return { success: "Profile saved." };
}
