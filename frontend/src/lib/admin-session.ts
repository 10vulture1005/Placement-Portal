import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdminEmail } from "@/lib/auth-access";
import { hasPermission, isElevatedRole, type PermissionKey } from "@/lib/permissions";

export const requireAdmin = cache(async () => {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const email = session.user.email;
  const isBootstrapAdmin = isAdminEmail(email);
  const hasCustomPerms =
    (session.user.customPermissions?.length ?? 0) > 0 ||
    (session.user.effectivePermissions?.length ?? 0) > 0;

  if (!isBootstrapAdmin && !isElevatedRole(session.user.role) && !hasCustomPerms) {
    redirect("/dashboard");
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user || !user.isActive) redirect("/login");

  return { session, user };
});

export const requirePermission = cache(async (permission: PermissionKey) => {
  const { session, user } = await requireAdmin();

  const isBootstrapAdmin = isAdminEmail(user.email);
  if (isBootstrapAdmin || user.role === "SUPER_ADMIN") {
    return { session, user };
  }

  if (!hasPermission({ ...user, email: user.email }, permission)) {
    redirect("/admin/dashboard");
  }

  return { session, user };
});
