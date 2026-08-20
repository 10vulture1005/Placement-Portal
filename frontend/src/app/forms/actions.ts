"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStudent } from "@/lib/student-session";

export type NocSubmitResult = { error?: string; success?: boolean };

const nocSchema = z.object({
  company: z.string().trim().min(2),
  city: z.string().trim().min(2),
  address: z.string().trim().min(5),
  state: z.string().trim().min(2),
  pincode: z.string().trim().regex(/^[0-9]{6}$/),
  startDate: z.string(),
  endDate: z.string(),
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
  
  if (!parsed.success) return { error: "Please check your inputs." };

  await requireStudent();

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
    console.error("Failed to submit NOC request", error);
    return { error: "Failed to submit NOC request." };
  }
}
