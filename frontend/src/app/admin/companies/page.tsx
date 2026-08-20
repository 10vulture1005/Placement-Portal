import { AuthenticatedAdminShell } from "@/components/admin/authenticated-admin-shell";
import { CompaniesManager, type AdminCompanyItem } from "@/components/admin/companies-manager";
import { requireAdmin } from "@/lib/admin-session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Page() {
  await requireAdmin();
  const companies = await db.company.findMany({
    orderBy: { createdAt: "desc" },
    include: { jobs: { select: { status: true } } },
  });
  const items: AdminCompanyItem[] = companies.map((company) => ({
    id: company.id,
    name: company.name,
    website: company.website,
    logoUrl: company.logoUrl,
    description: company.description,
    jobCount: company.jobs.length,
    activeJobCount: company.jobs.filter((job) => job.status === "ACTIVE").length,
    createdAt: company.createdAt.toISOString(),
  }));

  return <AuthenticatedAdminShell><CompaniesManager companies={items}/></AuthenticatedAdminShell>;
}
