import { AuthenticatedAdminShell } from "@/components/admin/authenticated-admin-shell";
import { StudentsManager, type AdminStudentListItem } from "@/components/admin/students-manager";
import { requireAdmin } from "@/lib/admin-session";
import { db } from "@/lib/db";
import { calculateProfileCompletion } from "@/lib/student-profile";

export const dynamic = "force-dynamic";

export default async function Page() {
  await requireAdmin();
  const students = await db.user.findMany({
    where: { role: "STUDENT" },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { applications: true } } },
  });
  const items: AdminStudentListItem[] = students.map((student) => ({
    id: student.id,
    name: student.name ?? "Student",
    email: student.email ?? "No email",
    rollNumber: student.rollNumber,
    branch: student.branch,
    batch: student.batch,
    cgpa: student.cgpa,
    completion: calculateProfileCompletion(student),
    applicationCount: student._count.applications,
  }));
  return <AuthenticatedAdminShell><StudentsManager students={items}/></AuthenticatedAdminShell>;
}
