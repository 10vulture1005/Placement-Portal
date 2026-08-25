"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStudent } from "@/lib/student-session";
import { db } from "@/lib/db";

export type NocSubmitResult = { error?: string; success?: boolean };

const nocSchema = z.object({
  company: z.string().trim().min(2, "Company name must be at least 2 characters."),
  city: z.string().trim().min(2, "City must be at least 2 characters."),
  address: z.string().trim().min(2, "Company address must be at least 2 characters."),
  state: z.string().trim().min(2, "State must be at least 2 characters."),
  pincode: z.string().trim().regex(/^[0-9]{6}$/, "Pincode must be exactly 6 digits."),
  startDate: z.string().min(1, "Start date is required."),
  endDate: z.string().min(1, "End date is required."),
});

export async function submitNocRequest(formData: FormData): Promise<NocSubmitResult> {
  const parsed = nocSchema.safeParse({
    company: formData.get("company"),
    city: formData.get("city"),
    address: formData.get("address"),
    state: formData.get("state"),
    pincode: formData.get("pincode"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
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
      }),
    });
    revalidatePath("/forms");
    return { success: true };
  } catch (error) {
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
        },
      });
      revalidatePath("/forms");
      return { success: true };
    } catch (fallbackError) {
      console.error("Failed to submit NOC request", fallbackError || error);
      return { error: "Failed to submit NOC request. Please try again." };
    }
  }
}

