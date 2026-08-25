import { FormsView, type LocalNoc } from "@/components/forms/forms-view";
import { AuthenticatedPortalShell } from "@/components/layout/authenticated-portal-shell";
import { backendFetch } from "@/lib/api-client";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/student-session";

export const dynamic = "force-dynamic";

export default async function Page() {
  const student = await requireStudent();

  let nocs: LocalNoc[] = [];
  try {
    nocs = await backendFetch<LocalNoc[]>("/api/v1/noc");
  } catch {
    if (student.user) {
      try {
        const records = await db.nocRequest.findMany({
          where: { userId: student.user.id },
          orderBy: { createdAt: "desc" },
        });
        nocs = records.map((r) => ({
          id: r.id,
          company: r.company,
          address: r.address,
          city: r.city,
          state: r.state,
          pincode: r.pincode,
          startDate: r.startDate.toISOString(),
          endDate: r.endDate.toISOString(),
          status: r.status,
          message: r.message,
          documentUrl: r.documentUrl,
          createdAt: r.createdAt.toISOString(),
        }));
      } catch (dbErr) {
        console.error("Failed to fetch NOCs from db", dbErr);
      }
    }
  }

  return (
    <AuthenticatedPortalShell>
      <FormsView initialNocs={nocs} />
    </AuthenticatedPortalShell>
  );
}

