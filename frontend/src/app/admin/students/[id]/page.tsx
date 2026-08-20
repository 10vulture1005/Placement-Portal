import { notFound } from "next/navigation";
import { AuthenticatedAdminShell } from "@/components/admin/authenticated-admin-shell";
import { StudentProfileDetail, type AdminStudentDetail } from "@/components/admin/student-profile-detail";
import { requireAdmin } from "@/lib/admin-session";
import { db } from "@/lib/db";
import { formatPortalDate } from "@/lib/job-presenters";
import { calculateProfileCompletion } from "@/lib/student-profile";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const student = await db.user.findFirst({
    where: { id, role: "STUDENT" },
    include: {
      resumes: { orderBy: { uploadedAt: "desc" } },
      applications: { orderBy: { appliedAt: "desc" }, include: { jobProfile: { include: { company: true } } } },
    },
  });
  if (!student) notFound();
  const detail: AdminStudentDetail = {
    name: student.name ?? "Student",
    email: student.email ?? "No email",
    rollNumber: student.rollNumber,
    personalEmail: student.personalEmail,
    contactNumber: student.contactNumber,
    altContactNumber: student.altContactNumber,
    branch: student.branch,
    batch: student.batch,
    degree: student.degree,
    gender: student.gender,
    dateOfBirth: student.dateOfBirth ? formatPortalDate(student.dateOfBirth) : null,
    bloodGroup: student.bloodGroup,
    currentAddress: student.currentAddress,
    class10Percent: student.class10Percent,
    class12Percent: student.class12Percent,
    cgpa: student.cgpa,
    backlogs: student.backlogs,
    bans: student.bans,
    profileCompletion: calculateProfileCompletion(student),
    aadhaarProvided: Boolean(student.aadhaarEncrypted),
    panProvided: Boolean(student.panCardEncrypted),
    resumes: student.resumes.map((resume) => ({ id: resume.id, label: resume.label, fileName: resume.fileName, uploadedAt: formatPortalDate(resume.uploadedAt) })),
    applications: student.applications.map((application) => ({ id: application.id, company: application.jobProfile.company.name, role: application.jobProfile.title, status: application.status, appliedAt: formatPortalDate(application.appliedAt) })),
  };
  return <AuthenticatedAdminShell><StudentProfileDetail student={detail}/></AuthenticatedAdminShell>;
}
