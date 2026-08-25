import { AuthenticatedAdminShell } from "@/components/admin/authenticated-admin-shell";
import { NocRequestsManager, type AdminNocItem } from "@/components/admin/noc-requests-manager";
import { requirePermission } from "@/lib/admin-session";
import { backendFetch } from "@/lib/api-client";
import { db } from "@/lib/db";
import { PERM_NOC_MANAGE } from "@/lib/permissions";

interface BackendNocAdminDto {
  id: string;
  userId: string;
  company: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  startDate: string;
  endDate: string;
  status: string;
  message?: string | null;
  documentUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  student?: {
    id: string;
    name?: string | null;
    email?: string | null;
    rollNumber?: string | null;
    branch?: string | null;
    batch?: number | null;
    cgpa?: number | null;
    contactNumber?: string | null;
  } | null;
}

export const dynamic = "force-dynamic";

export default async function Page() {
  const { user } = await requirePermission(PERM_NOC_MANAGE);

  let items: AdminNocItem[] = [];

  try {
    const rawData = await backendFetch<BackendNocAdminDto[]>("/api/v1/noc/admin");
    items = rawData.map((noc) => ({
      id: noc.id,
      userId: noc.userId,
      studentName: noc.student?.name ?? null,
      studentEmail: noc.student?.email ?? null,
      rollNumber: noc.student?.rollNumber ?? null,
      branch: noc.student?.branch ?? null,
      batch: noc.student?.batch ?? null,
      cgpa: noc.student?.cgpa ?? null,
      contactNumber: noc.student?.contactNumber ?? null,
      company: noc.company,
      address: noc.address,
      city: noc.city,
      state: noc.state,
      pincode: noc.pincode,
      startDate: typeof noc.startDate === "string" ? noc.startDate : new Date(noc.startDate).toISOString(),
      endDate: typeof noc.endDate === "string" ? noc.endDate : new Date(noc.endDate).toISOString(),
      status: noc.status,
      message: noc.message ?? null,
      documentUrl: noc.documentUrl ?? null,
      createdAt: typeof noc.createdAt === "string" ? noc.createdAt : new Date(noc.createdAt).toISOString(),
      updatedAt: typeof noc.updatedAt === "string" ? noc.updatedAt : new Date(noc.updatedAt).toISOString(),
    }));
  } catch {
    // Prisma fallback
    const records = await db.nocRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            rollNumber: true,
            branch: true,
            batch: true,
            cgpa: true,
            contactNumber: true,
          },
        },
      },
    });

    items = records.map((noc) => ({
      id: noc.id,
      userId: noc.userId,
      studentName: noc.user?.name ?? null,
      studentEmail: noc.user?.email ?? null,
      rollNumber: noc.user?.rollNumber ?? null,
      branch: noc.user?.branch ?? null,
      batch: noc.user?.batch ?? null,
      cgpa: noc.user?.cgpa ?? null,
      contactNumber: noc.user?.contactNumber ?? null,
      company: noc.company,
      address: noc.address,
      city: noc.city,
      state: noc.state,
      pincode: noc.pincode,
      startDate: noc.startDate.toISOString(),
      endDate: noc.endDate.toISOString(),
      status: noc.status,
      message: noc.message,
      documentUrl: noc.documentUrl,
      createdAt: noc.createdAt.toISOString(),
      updatedAt: noc.updatedAt.toISOString(),
    }));
  }

  return (
    <AuthenticatedAdminShell>
      <NocRequestsManager nocRequests={items} canPersist={Boolean(user?.id)} />
    </AuthenticatedAdminShell>
  );
}

