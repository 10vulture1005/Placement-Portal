"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-session";
import { companyDeleteSchema, companyFormSchema } from "@/lib/company-schema";

export type CompanyActionResult = { error?: string; success?: string };

export async function saveCompany(formData: FormData): Promise<CompanyActionResult> {
  await requireAdmin();
  const parsed = companyFormSchema.safeParse({
    id: formData.get("id") ?? "",
    name: formData.get("name"),
    website: formData.get("website"),
    logoUrl: formData.get("logoUrl"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the company details." };
  }

  const id = parsed.data.id || undefined;
  const duplicate = await db.company.findFirst({
    where: {
      name: { equals: parsed.data.name, mode: "insensitive" },
      ...(id ? { NOT: { id } } : {}),
    },
    select: { id: true },
  });
  if (duplicate) return { error: "A company with this name already exists." };

  if (id) {
    const updated = await db.company.updateMany({
      where: { id },
      data: {
        name: parsed.data.name,
        website: parsed.data.website,
        logoUrl: parsed.data.logoUrl,
        description: parsed.data.description,
      },
    });
    if (!updated.count) return { error: "Company not found." };
  } else {
    await db.company.create({
      data: {
        name: parsed.data.name,
        website: parsed.data.website,
        logoUrl: parsed.data.logoUrl,
        description: parsed.data.description,
      },
    });
  }

  revalidatePath("/admin/companies");
  revalidatePath("/admin/dashboard");
  revalidatePath("/company-events");
  return { success: id ? "Company updated." : "Company created." };
}

export async function deleteCompany(formData: FormData): Promise<CompanyActionResult> {
  await requireAdmin();
  const parsed = companyDeleteSchema.safeParse({ companyId: formData.get("companyId") });
  if (!parsed.success) return { error: "Invalid company." };

  const jobCount = await db.jobProfile.count({ where: { companyId: parsed.data.companyId } });
  if (jobCount > 0) {
    return { error: "Delete or reassign this company’s job profiles first." };
  }

  const deleted = await db.company.deleteMany({ where: { id: parsed.data.companyId } });
  if (!deleted.count) return { error: "Company not found." };

  revalidatePath("/admin/companies");
  revalidatePath("/admin/dashboard");
  return { success: "Company deleted." };
}
