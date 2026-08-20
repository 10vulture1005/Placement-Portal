import { AuthenticatedPortalShell } from "@/components/layout/authenticated-portal-shell";
import { ProfileView, type StudentProfileViewData } from "@/components/profile/profile-view";
import { backendFetch } from "@/lib/api-client";
import type { BackendProfile, BackendResume } from "@/lib/backend-types";
import { calculateProfileCompletion } from "@/lib/student-profile";
import { requireStudent, studentDisplayName, studentInitials } from "@/lib/student-session";

export const dynamic = "force-dynamic";

export default async function Page() {
  const student = await requireStudent();
  let user: BackendProfile | null = null;
  let resumes: BackendResume[] = [];

  try {
    user = await backendFetch<BackendProfile>("/api/v1/profile");
    resumes = await backendFetch<BackendResume[]>("/api/v1/profile/resumes");
  } catch (error) {
    console.error("Failed to load profile from the backend", error);
  }

  const name = studentDisplayName(student);
  const profile: StudentProfileViewData = {
    canPersist: Boolean(user),
    initials: studentInitials(name),
    completion: user ? calculateProfileCompletion(user) : 0,
    email: user?.email ?? student.session.user.email ?? "",
    values: {
      name,
      rollNumber: user?.rollNumber ?? "",
      personalEmail: user?.personalEmail ?? "",
      contactNumber: user?.contactNumber ?? "",
      altContactNumber: user?.altContactNumber ?? "",
      branch: user?.branch ?? "",
      degree: user?.degree ?? "",
      batch: user?.batch?.toString() ?? "",
      gender: user?.gender ?? "",
      bloodGroup: user?.bloodGroup ?? "",
      dateOfBirth: user?.dateOfBirth ? user.dateOfBirth.slice(0, 10) : "",
      currentAddress: user?.currentAddress ?? "",
      class10Percent: user?.class10Percent?.toString() ?? "",
      class12Percent: user?.class12Percent?.toString() ?? "",
      cgpa: user?.cgpa?.toString() ?? "",
      backlogs: user?.backlogs?.toString() ?? "0",
    },
    identityDocuments: {
      aadhaarProvided: Boolean(user?.aadhaarEncrypted),
      panProvided: Boolean(user?.panCardEncrypted),
    },
    resumes: resumes.map((resume) => ({
      id: resume.id,
      label: resume.label,
      name: resume.fileName,
      uploadedAt: resume.uploadedAt,
    })),
  };

  return (
    <AuthenticatedPortalShell>
      <ProfileView profile={profile} />
    </AuthenticatedPortalShell>
  );
}
