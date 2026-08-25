import { AuthenticatedAdminShell } from "@/components/admin/authenticated-admin-shell";
import {
  ApplicationsManager,
  type AdminApplicationRow,
  type JobOption,
} from "@/components/admin/applications-manager";
import { backendFetch } from "@/lib/api-client";
import { requireAdmin } from "@/lib/admin-session";
import { db } from "@/lib/db";
import { formatPortalDate } from "@/lib/job-presenters";
import type { ApplicationStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

type BackendAdminAppItem = {
  id: string;
  userId: string;
  studentName: string;
  studentEmail: string;
  rollNumber: string | null;
  branch: string | null;
  batch: number | null;
  cgpa: number | null;
  jobProfileId: string;
  jobTitle: string;
  companyId: string;
  companyName: string;
  resumeId: string | null;
  resumeUrl: string | null;
  resumeLabel: string | null;
  status: ApplicationStatus;
  appliedAt: string;
  updatedAt: string;
};

export default async function Page() {
  await requireAdmin();

  // Load jobs for filtering
  const jobs = await db.jobProfile.findMany({
    orderBy: { createdAt: "desc" },
    include: { company: true },
  });

  const jobOptions: JobOption[] = jobs.map((j) => ({
    id: j.id,
    title: j.title,
    companyName: j.company.name,
  }));

  let rows: AdminApplicationRow[] = [];

  try {
    const backendApps = await backendFetch<BackendAdminAppItem[]>("/api/v1/applications/admin");
    rows = backendApps.map((a) => ({
      id: a.id,
      userId: a.userId,
      studentName: a.studentName,
      studentEmail: a.studentEmail,
      rollNumber: a.rollNumber,
      branch: a.branch,
      batch: a.batch,
      cgpa: a.cgpa,
      jobProfileId: a.jobProfileId,
      jobTitle: a.jobTitle,
      companyId: a.companyId,
      companyName: a.companyName,
      resumeId: a.resumeId,
      resumeUrl: a.resumeUrl,
      resumeLabel: a.resumeLabel,
      status: a.status,
      appliedAt: formatPortalDate(a.appliedAt),
      updatedAt: formatPortalDate(a.updatedAt),
    }));
  } catch {
    // Prisma fallback
    const prismaApps = await db.application.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        user: true,
        jobProfile: { include: { company: true } },
        resume: true,
      },
    });

    rows = prismaApps.map((a) => ({
      id: a.id,
      userId: a.userId,
      studentName: a.user.name || a.user.rollNumber || "Student",
      studentEmail: a.user.email || "",
      rollNumber: a.user.rollNumber,
      branch: a.user.branch,
      batch: a.user.batch,
      cgpa: a.user.cgpa,
      jobProfileId: a.jobProfileId,
      jobTitle: a.jobProfile.title,
      companyId: a.jobProfile.companyId,
      companyName: a.jobProfile.company.name,
      resumeId: a.resumeId,
      resumeUrl: a.resume?.fileUrl || null,
      resumeLabel: a.resume?.label || null,
      status: a.status,
      appliedAt: formatPortalDate(a.appliedAt),
      updatedAt: formatPortalDate(a.updatedAt),
    }));
  }

  return (
    <AuthenticatedAdminShell>
      <ApplicationsManager applications={rows} jobs={jobOptions} />
    </AuthenticatedAdminShell>
  );
}

