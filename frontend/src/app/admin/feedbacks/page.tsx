import { AuthenticatedAdminShell } from "@/components/admin/authenticated-admin-shell";
import { FeedbacksManager, type AdminFeedbackItem } from "@/components/admin/feedbacks-manager";
import { requirePermission } from "@/lib/admin-session";
import { backendFetch } from "@/lib/api-client";
import { db } from "@/lib/db";
import { PERM_FEEDBACKS_MANAGE } from "@/lib/permissions";

function readContent(content: string): { subject: string; message: string } {
  try {
    const parsed = JSON.parse(content) as { subject?: unknown; message?: unknown };
    if (typeof parsed.subject === "string" && typeof parsed.message === "string") {
      return { subject: parsed.subject, message: parsed.message };
    }
  } catch {}
  return { subject: content.slice(0, 80), message: content };
}

interface BackendFeedbackAdminDto {
  id: string;
  userId: string;
  feedbackType: string;
  content: string;
  resolved: boolean;
  adminResponse?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
  subject?: string | null;
  message?: string | null;
  student?: {
    id: string;
    name?: string | null;
    email?: string | null;
    rollNumber?: string | null;
    branch?: string | null;
    batch?: number | null;
    contactNumber?: string | null;
  } | null;
}

export const dynamic = "force-dynamic";

export default async function Page() {
  const { user } = await requirePermission(PERM_FEEDBACKS_MANAGE);

  let items: AdminFeedbackItem[] = [];

  try {
    const rawData = await backendFetch<BackendFeedbackAdminDto[]>("/api/v1/feedback/admin");
    items = rawData.map((fb) => {
      const parsedContent = readContent(fb.content);
      return {
        id: fb.id,
        userId: fb.userId,
        studentName: fb.student?.name ?? null,
        studentEmail: fb.student?.email ?? null,
        rollNumber: fb.student?.rollNumber ?? null,
        branch: fb.student?.branch ?? null,
        batch: fb.student?.batch ?? null,
        contactNumber: fb.student?.contactNumber ?? null,
        feedbackType: fb.feedbackType,
        subject: fb.subject || parsedContent.subject,
        message: fb.message || parsedContent.message,
        resolved: fb.resolved,
        adminResponse: fb.adminResponse ?? null,
        createdAt: typeof fb.createdAt === "string" ? fb.createdAt : new Date(fb.createdAt).toISOString(),
        resolvedAt: fb.resolvedAt ? (typeof fb.resolvedAt === "string" ? fb.resolvedAt : new Date(fb.resolvedAt).toISOString()) : null,
      };
    });
  } catch {
    // Prisma fallback
    const records = await db.feedback.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            rollNumber: true,
            branch: true,
            batch: true,
            contactNumber: true,
          },
        },
      },
    });

    items = records.map((fb) => {
      const parsedContent = readContent(fb.content);
      return {
        id: fb.id,
        userId: fb.userId,
        studentName: fb.user?.name ?? null,
        studentEmail: fb.user?.email ?? null,
        rollNumber: fb.user?.rollNumber ?? null,
        branch: fb.user?.branch ?? null,
        batch: fb.user?.batch ?? null,
        contactNumber: fb.user?.contactNumber ?? null,
        feedbackType: fb.feedbackType,
        subject: parsedContent.subject,
        message: parsedContent.message,
        resolved: fb.resolved,
        adminResponse: fb.adminResponse,
        createdAt: fb.createdAt.toISOString(),
        resolvedAt: fb.resolvedAt ? fb.resolvedAt.toISOString() : null,
      };
    });
  }

  return (
    <AuthenticatedAdminShell>
      <FeedbacksManager feedbacks={items} canPersist={Boolean(user?.id)} />
    </AuthenticatedAdminShell>
  );
}

