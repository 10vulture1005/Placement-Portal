import { FeedbackForm } from "@/components/feedback/feedback-form";
import { AuthenticatedPortalShell } from "@/components/layout/authenticated-portal-shell";
import { requireStudent, studentDisplayName } from "@/lib/student-session";

export const dynamic = "force-dynamic";

export default async function Page() {
  const student = await requireStudent();
  return <AuthenticatedPortalShell><FeedbackForm student={{
    name: studentDisplayName(student),
    rollNumber: student.user?.rollNumber ?? "Not provided",
    email: student.user?.email ?? student.session.user.email ?? "",
    canSubmit: Boolean(student.user),
  }}/></AuthenticatedPortalShell>;
}
