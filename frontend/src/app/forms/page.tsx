import { FormsView, type LocalNoc } from "@/components/forms/forms-view";
import { AuthenticatedPortalShell } from "@/components/layout/authenticated-portal-shell";
import { backendFetch } from "@/lib/api-client";
import { requireStudent } from "@/lib/student-session";

export const dynamic = "force-dynamic";

export default async function Page() {
  await requireStudent();

  let nocs: LocalNoc[] = [];
  try {
    nocs = await backendFetch<LocalNoc[]>("/api/v1/noc");
  } catch (error) {
    console.error("Failed to fetch NOCs", error);
  }

  return (
    <AuthenticatedPortalShell>
      <FormsView initialNocs={nocs} />
    </AuthenticatedPortalShell>
  );
}
