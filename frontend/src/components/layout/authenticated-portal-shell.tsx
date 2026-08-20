import { PortalShell } from "@/components/layout/portal-shell";
import {
  requireStudent,
  studentDisplayName,
  studentInitials,
} from "@/lib/student-session";

export async function AuthenticatedPortalShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const student = await requireStudent();
  const name = studentDisplayName(student);

  return (
    <PortalShell
      student={{
        name,
        initials: studentInitials(name),
        subtitle: student.user.rollNumber ?? "Profile incomplete",
      }}
    >
      {children}
    </PortalShell>
  );
}
