import { AuthenticatedAdminShell } from "@/components/admin/authenticated-admin-shell";
import {
  TeamManager,
  type AdminTeamMemberItem,
  type AdminUserLookup,
} from "@/components/admin/team-manager";
import { requirePermission } from "@/lib/admin-session";
import { ALL_PERMISSIONS, PERM_TEAM_MANAGE } from "@/lib/permissions";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const PLACEMENT_TEAM_DEFAULT_PERMISSIONS_KEY = "placement_team_default_permissions";

const FALLBACK_DEFAULT_PERMISSIONS = [
  "companies:read",
  "jobs:read",
  "jobs:manage",
  "applications:read",
  "applications:manage",
  "students:read",
  "announcements:manage",
  "analytics:view",
];

export default async function Page() {
  await requirePermission(PERM_TEAM_MANAGE);

  // 1. Fetch team members ordered by displayOrder
  const teamMembers = await db.teamMember.findMany({
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  });

  // 2. Fetch all registered users for linked mapping and autocomplete
  const allUsers = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      customPermissions: true,
    },
    orderBy: [{ name: "asc" }, { email: "asc" }],
  });

  const usersByEmail = new Map<string, (typeof allUsers)[0]>();
  for (const u of allUsers) {
    if (u.email) {
      usersByEmail.set(u.email.toLowerCase().trim(), u);
    }
  }

  // 3. Fetch default placement team permissions
  let defaultPermissions = [...FALLBACK_DEFAULT_PERMISSIONS];
  try {
    const setting = await db.systemSetting.findUnique({
      where: { key: PLACEMENT_TEAM_DEFAULT_PERMISSIONS_KEY },
    });
    if (setting && setting.value) {
      const parsed = JSON.parse(setting.value);
      if (Array.isArray(parsed)) {
        defaultPermissions = parsed.filter((p) =>
          (ALL_PERMISSIONS as readonly string[]).includes(p)
        );
      }
    }
  } catch {
    // If setting does not exist or error
  }

  const items: AdminTeamMemberItem[] = teamMembers.map((m) => {
    const emailKey = m.email?.toLowerCase().trim();
    const user = emailKey ? usersByEmail.get(emailKey) : undefined;

    return {
      id: m.id,
      name: m.name,
      role: m.role,
      email: m.email,
      phone: m.phone,
      photoUrl: m.photoUrl,
      displayOrder: m.displayOrder,
      userId: user?.id ?? null,
      hasUserAccount: user !== undefined,
      userRole: user?.role ?? null,
      userActive: user?.isActive ?? null,
      userCustomPermissions: user?.customPermissions ?? [],
    };
  });

  const allUsersLookup: AdminUserLookup[] = allUsers.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    customPermissions: u.customPermissions ?? [],
  }));

  return (
    <AuthenticatedAdminShell>
      <TeamManager
        members={items}
        defaultPermissions={defaultPermissions}
        allUsers={allUsersLookup}
      />
    </AuthenticatedAdminShell>
  );
}
