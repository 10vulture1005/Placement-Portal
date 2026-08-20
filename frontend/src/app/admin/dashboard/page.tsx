import { AuthenticatedAdminShell } from "@/components/admin/authenticated-admin-shell";
import { AdminDashboard, type AdminDashboardData } from "@/components/admin/admin-dashboard";
import { db } from "@/lib/db";
import { formatPortalDate } from "@/lib/job-presenters";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [students, companies, activeJobs, applications, selectedUsers, studentProfiles, recentApplications] = await Promise.all([
    db.user.count({ where: { role: "STUDENT" } }),
    db.company.count(),
    db.jobProfile.count({ where: { status: "ACTIVE" } }),
    db.application.groupBy({ by: ["status"], _count: { _all: true } }),
    db.application.findMany({ where: { status: "SELECTED" }, distinct: ["userId"], select: { userId: true } }),
    db.user.findMany({ where: { role: "STUDENT" }, select: { id: true, branch: true } }),
    db.application.findMany({ orderBy: { updatedAt: "desc" }, take: 8, include: { user: true, jobProfile: { include: { company: true } } } }),
  ]);
  const count = (status: string) => applications.find((item) => item.status === status)?._count._all ?? 0;
  const totalApplications = applications.reduce((total, item) => total + item._count._all, 0);
  const selectedIds = new Set(selectedUsers.map((item) => item.userId));
  const branchNames = [...new Set(studentProfiles.map((student) => student.branch).filter((branch): branch is string => Boolean(branch)))].sort();
  const data: AdminDashboardData = {
    students,
    companies,
    activeJobs,
    offers: count("SELECTED"),
    placementRate: students ? Math.round((selectedUsers.length / students) * 100) : 0,
    applicationCounts: {
      total: totalApplications,
      shortlisted: count("SHORTLISTED"),
      interviews: count("INTERVIEW"),
      selected: count("SELECTED"),
    },
    branches: branchNames.map((branch) => {
      const branchStudents = studentProfiles.filter((student) => student.branch === branch);
      const placed = branchStudents.filter((student) => selectedIds.has(student.id)).length;
      return { name: branch, value: branchStudents.length ? Math.round((placed / branchStudents.length) * 100) : 0, placed, students: branchStudents.length };
    }),
    recentApplications: recentApplications.map((application) => ({
      id: application.id,
      student: application.user.name ?? application.user.rollNumber ?? "Student",
      role: application.jobProfile.title,
      company: application.jobProfile.company.name,
      status: application.status,
      date: formatPortalDate(application.updatedAt),
    })),
  };

  return <AuthenticatedAdminShell><AdminDashboard data={data}/></AuthenticatedAdminShell>;
}
