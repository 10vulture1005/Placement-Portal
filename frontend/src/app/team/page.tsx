import { AuthenticatedPortalShell } from "@/components/layout/authenticated-portal-shell";
import { TeamView, type PublicTeamMember } from "@/components/team/team-view";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Page() {
  let members: PublicTeamMember[] = [];
  try {
    const records = await db.teamMember.findMany({
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    });
    members = records.map((r) => ({
      id: r.id,
      name: r.name,
      role: r.role,
      email: r.email,
      phone: r.phone,
      photoUrl: r.photoUrl,
      displayOrder: r.displayOrder,
    }));
  } catch {
    members = [];
  }

  return (
    <AuthenticatedPortalShell>
      <TeamView members={members} />
    </AuthenticatedPortalShell>
  );
}
