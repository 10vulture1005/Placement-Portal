import { AuthenticatedPortalShell } from "@/components/layout/authenticated-portal-shell";
import { JobsList, type StudentJobListItem } from "@/components/jobs/jobs-list";
import { db } from "@/lib/db";
import { companyColor, companyInitials, formatPortalDate, jobStatusLabel, jobTypeLabel } from "@/lib/job-presenters";

export const dynamic = "force-dynamic";

export default async function Page() {
  const jobs = await db.jobProfile.findMany({
    where: { status: { in: ["ACTIVE", "ENDED"] } },
    orderBy: { registrationDeadline: "asc" },
    include: { company: true },
  });

  const items: StudentJobListItem[] = jobs.map((job) => ({
    id: job.id,
    company: job.company.name,
    initials: companyInitials(job.company.name),
    color: companyColor(job.company.name),
    title: job.title,
    type: jobTypeLabel(job.type),
    location: job.locations.join(" / ") || "Location not specified",
    deadline: formatPortalDate(job.registrationDeadline, true),
    status: jobStatusLabel(job.status) as "Active" | "Closed",
  }));

  return (
    <AuthenticatedPortalShell>
      <JobsList jobs={items} />
    </AuthenticatedPortalShell>
  );
}
