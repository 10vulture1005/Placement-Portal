import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/admin-session";
import { studentInitials } from "@/lib/student-session";

export async function AuthenticatedAdminShell({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const name = admin.user?.name ?? admin.session.user.name ?? "Administrator";

  return <AdminShell admin={{ name, initials: studentInitials(name) }}>{children}</AdminShell>;
}
