import { ApplicationsView, type StudentApplicationItem } from "@/components/applications/applications-view";
import { AuthenticatedPortalShell } from "@/components/layout/authenticated-portal-shell";
import { backendFetch } from "@/lib/api-client";
import { db } from "@/lib/db";
import { companyColor, companyInitials, formatPortalDate } from "@/lib/job-presenters";
import { requireStudent } from "@/lib/student-session";
import type { ApplicationStatus } from "@prisma/client";

const STATUS_MESSAGES: Record<ApplicationStatus, string> = {
  APPLIED: "Application submitted",
  SHORTLISTED: "Shortlisted by the placement team",
  INTERVIEW: "Interview stage",
  SELECTED: "Offer received",
  REJECTED: "Application not selected",
  WITHDRAWN: "Application withdrawn",
};

type BackendAppItem = {
  id: string;
  userId: string;
  jobProfileId: string;
  status: ApplicationStatus;
  appliedAt: string;
  updatedAt: string;
  resumeId?: string | null;
  jobTitle?: string | null;
  companyName?: string | null;
  companyLogo?: string | null;
};

export const dynamic = "force-dynamic";

export default async function Page() {
  const student = await requireStudent();
  let items: StudentApplicationItem[] = [];

  if (student.user) {
    try {
      const backendApps = await backendFetch<BackendAppItem[]>("/api/v1/applications");
      items = backendApps.map((application) => {
        const company = application.companyName ?? "Company";
        return {
          id: application.id,
          role: application.jobTitle ?? "Role",
          company,
          applied: formatPortalDate(application.appliedAt),
          status: application.status,
          next: STATUS_MESSAGES[application.status] ?? "In progress",
          color: companyColor(company),
          initials: companyInitials(company),
        };
      });
    } catch {
      // Prisma fallback
      const applications = await db.application.findMany({
        where: { userId: student.user.id },
        orderBy: { appliedAt: "desc" },
        include: { jobProfile: { include: { company: true } } },
      });
      items = applications.map((application) => ({
        id: application.id,
        role: application.jobProfile.title,
        company: application.jobProfile.company.name,
        applied: formatPortalDate(application.appliedAt),
        status: application.status,
        next: STATUS_MESSAGES[application.status] ?? "In progress",
        color: companyColor(application.jobProfile.company.name),
        initials: companyInitials(application.jobProfile.company.name),
      }));
    }
  }

  return (
    <AuthenticatedPortalShell>
      <ApplicationsView applications={items} />
    </AuthenticatedPortalShell>
  );
}

