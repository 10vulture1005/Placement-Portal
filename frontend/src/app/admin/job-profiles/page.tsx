import { AuthenticatedAdminShell } from "@/components/admin/authenticated-admin-shell";
import { JobProfilesManager, type AdminJobProfileItem } from "@/components/admin/job-profiles-manager";
import { requireAdmin } from "@/lib/admin-session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Page() {
  const admin = await requireAdmin();
  const [jobs, companies] = await Promise.all([
    db.jobProfile.findMany({
      orderBy: { createdAt: "desc" },
      include: { company: true, _count: { select: { applications: true } } },
    }),
    db.company.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const items: AdminJobProfileItem[] = jobs.map((job) => ({
    id: job.id,
    companyId: job.companyId,
    companyName: job.company.name,
    title: job.title,
    type: job.type,
    locations: job.locations,
    ctcStipend: job.ctcStipend,
    ctcStipendInfo: job.ctcStipendInfo,
    minCGPA: job.minCGPA,
    maxBacklogs: job.maxBacklogs,
    maxBans: job.maxBans,
    allowedBranches: job.allowedBranches,
    allowedDegrees: job.allowedDegrees,
    allowedGenders: job.allowedGenders,
    jobCategory: job.jobCategory,
    batch: job.batch,
    registrationDeadline: job.registrationDeadline.toISOString(),
    status: job.status,
    description: job.description,
    openingOverview: job.openingOverview,
    applicationCount: job._count.applications,
  }));

  return <AuthenticatedAdminShell><JobProfilesManager jobs={items} companies={companies} canPersist={Boolean(admin.user)}/></AuthenticatedAdminShell>;
}
