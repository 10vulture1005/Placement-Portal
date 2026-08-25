import { AuthenticatedAdminShell } from "@/components/admin/authenticated-admin-shell";
import { UsersManager, type AdminUserListItem } from "@/components/admin/users-manager";
import { requirePermission } from "@/lib/admin-session";
import { PERM_USERS_READ, computeEffectivePermissions } from "@/lib/permissions";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { user: currentAdmin } = await requirePermission(PERM_USERS_READ);

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { applications: true } } },
  });

  const items: AdminUserListItem[] = users.map((u) => {
    const effective = computeEffectivePermissions(
      u.role,
      u.customPermissions ?? [],
      u.email,
    );

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      image: u.image,
      role: u.role,
      title: u.title,
      isActive: u.isActive,
      rollNumber: u.rollNumber,
      branch: u.branch,
      batch: u.batch,
      customPermissions: u.customPermissions ?? [],
      effectivePermissions: effective,
      applicationCount: u._count.applications,
      createdAt: u.createdAt.toISOString(),
    };
  });

  return (
    <AuthenticatedAdminShell>
      <UsersManager users={items} currentUserId={currentAdmin.id} />
    </AuthenticatedAdminShell>
  );
}
