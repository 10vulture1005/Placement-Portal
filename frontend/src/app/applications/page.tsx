import { ApplicationsView, type StudentApplicationItem } from "@/components/applications/applications-view";
import { AuthenticatedPortalShell } from "@/components/layout/authenticated-portal-shell";
import { db } from "@/lib/db";
import { companyColor, companyInitials, formatPortalDate } from "@/lib/job-presenters";
import { requireStudent } from "@/lib/student-session";

const STATUS_MESSAGES = {
  APPLIED: "Application submitted",
  SHORTLISTED: "Shortlisted by the placement team",
  INTERVIEW: "Interview stage",
  SELECTED: "Offer received",
  REJECTED: "Application not selected",
  WITHDRAWN: "Application withdrawn",
} as const;

export const dynamic = "force-dynamic";

export default async function Page() {
  const student = await requireStudent();
  const applications = student.user
    ? await db.application.findMany({
        where: { userId: student.user.id },
        orderBy: { appliedAt: "desc" },
        include: { jobProfile: { include: { company: true } } },
      })
    : [];
  const items: StudentApplicationItem[] = applications.map((application) => ({
    id: application.id,
    role: application.jobProfile.title,
    company: application.jobProfile.company.name,
    applied: formatPortalDate(application.appliedAt),
    status: application.status,
    next: STATUS_MESSAGES[application.status],
    color: companyColor(application.jobProfile.company.name),
    initials: companyInitials(application.jobProfile.company.name),
  }));

  return (
    <AuthenticatedPortalShell>
      <ApplicationsView applications={items} />
    </AuthenticatedPortalShell>
  );
}
