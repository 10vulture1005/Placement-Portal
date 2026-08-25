import { AuthenticatedAdminShell } from "@/components/admin/authenticated-admin-shell";
import {
  AnnouncementsManager,
  type AdminAnnouncementItem,
  type CompanyOption,
} from "@/components/admin/announcements-manager";
import { requirePermission } from "@/lib/admin-session";
import { PERM_ANNOUNCEMENTS_MANAGE } from "@/lib/permissions";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { user } = await requirePermission(PERM_ANNOUNCEMENTS_MANAGE);

  const [announcements, companies] = await Promise.all([
    db.announcement.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        company: { select: { id: true, name: true, logoUrl: true } },
        createdBy: { select: { name: true, email: true } },
      },
    }),
    db.company.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const items: AdminAnnouncementItem[] = announcements.map((a) => ({
    id: a.id,
    title: a.title,
    content: a.content,
    category: a.category,
    tags: a.tags,
    companyId: a.companyId,
    companyName: a.company?.name ?? null,
    companyLogoUrl: a.company?.logoUrl ?? null,
    createdAt: a.createdAt.toISOString(),
    createdByName: a.createdBy?.name ?? null,
    createdByEmail: a.createdBy?.email ?? null,
  }));

  const companyOptions: CompanyOption[] = companies.map((c) => ({
    id: c.id,
    name: c.name,
  }));

  return (
    <AuthenticatedAdminShell>
      <AnnouncementsManager
        announcements={items}
        companies={companyOptions}
        canPersist={Boolean(user?.id)}
      />
    </AuthenticatedAdminShell>
  );
}
