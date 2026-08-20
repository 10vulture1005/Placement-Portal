import { AuthenticatedPortalShell } from "@/components/layout/authenticated-portal-shell";
import { DashboardFeed, type DashboardFeedData } from "@/components/dashboard/dashboard-feed";
import { db } from "@/lib/db";
import { evaluateEligibility, isEligible } from "@/lib/eligibility";
import { companyColor, companyInitials, formatPortalDate } from "@/lib/job-presenters";
import { toEligibilityProfile } from "@/lib/student-profile";
import { requireStudent, studentDisplayName } from "@/lib/student-session";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const student = await requireStudent();
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const userId = student.user?.id;

  const [jobs, applications, announcements, resumeCount] = await Promise.all([
    db.jobProfile.findMany({
      where: { status: "ACTIVE", registrationDeadline: { gte: now } },
      orderBy: { registrationDeadline: "asc" },
      include: { company: true },
    }),
    userId
      ? db.application.findMany({ where: { userId }, select: { status: true } })
      : Promise.resolve([]),
    db.announcement.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { company: true },
    }),
    userId ? db.resume.count({ where: { userId } }) : Promise.resolve(0),
  ]);

  const eligibilityProfile = student.user
    ? toEligibilityProfile(student.user, resumeCount)
    : null;
  const eligibleRoles = eligibilityProfile
    ? jobs.filter((job) =>
        isEligible(
          evaluateEligibility(eligibilityProfile, {
            minCgpa: job.minCGPA,
            batch: job.batch,
            branches: job.allowedBranches,
            maxBacklogs: job.maxBacklogs,
            maxBans: job.maxBans,
          }),
        ),
      ).length
    : null;

  const data: DashboardFeedData = {
    studentName: studentDisplayName(student),
    dateLabel: new Intl.DateTimeFormat("en-IN", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    }).format(now),
    metrics: {
      openOpportunities: jobs.length,
      closingThisWeek: jobs.filter(
        (job) => job.registrationDeadline <= weekFromNow,
      ).length,
      applications: applications.length,
      underReview: applications.filter((application) =>
        ["SHORTLISTED", "INTERVIEW"].includes(application.status),
      ).length,
      eligibleRoles,
    },
    nextDeadline: jobs[0]
      ? {
          company: jobs[0].company.name,
          date: formatPortalDate(jobs[0].registrationDeadline, true),
        }
      : null,
    announcements: announcements.map((announcement) => {
      const companyName = announcement.company?.name ?? "Placement Cell";
      return {
        id: announcement.id,
        company: companyName,
        title: announcement.title,
        summary: announcement.content,
        date: formatPortalDate(announcement.createdAt),
        type:
          announcement.tags[0] ??
          (announcement.category === "COMPANY_EVENT" ? "Company event" : "Update"),
        category:
          announcement.category === "COMPANY_EVENT" ? "Company event" : "General",
        color: companyColor(companyName),
        initial: companyInitials(companyName),
      };
    }),
  };

  return (
    <AuthenticatedPortalShell>
      <DashboardFeed data={data} />
    </AuthenticatedPortalShell>
  );
}
