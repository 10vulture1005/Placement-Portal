"use server";

import { revalidatePath } from "next/cache";
import { requireStudent } from "@/lib/student-session";
import { backendFetch } from "@/lib/api-client";

export async function uploadResume(formData: FormData) {
  const file = formData.get("file") as File;
  if (!file) return { error: "No file provided" };
  
  if (file.type !== "application/pdf") {
    return { error: "Only PDF files are allowed" };
  }
  
  if (file.size > 5 * 1024 * 1024) {
    return { error: "File exceeds the 5MB limit" };
  }

  const student = await requireStudent();
  if (!student.user) return { error: "Authentication required" };

  try {
    const fetchOptions: RequestInit = {
      method: "POST",
      body: formData,
      // Let fetch automatically set the Content-Type to multipart/form-data with boundary
      headers: {}, 
    };

    const session = await import("@/lib/auth").then(m => m.auth());
    const token = (session as any)?.accessToken;
    if (token) {
      fetchOptions.headers = {
        Authorization: `Bearer ${token}`
      };
    }
    
    // We can't use backendFetch directly because backendFetch forces Content-Type: application/json
    const baseUrl = process.env.BACKEND_URL || "http://localhost:8000";
    const res = await fetch(`${baseUrl}/api/v1/uploads/resume`, fetchOptions);
    
    if (!res.ok) {
      const text = await res.text();
      return { error: `Upload failed: ${text}` };
    }
    
    revalidatePath("/profile");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to upload file" };
  }
}
