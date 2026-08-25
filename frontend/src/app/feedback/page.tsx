import { FeedbackList, type StudentFeedbackItem } from "@/components/feedback/feedback-list";
import { AuthenticatedPortalShell } from "@/components/layout/authenticated-portal-shell";
import { backendFetch } from "@/lib/api-client";
import { db } from "@/lib/db";
import { formatPortalDate } from "@/lib/job-presenters";
import { requireStudent } from "@/lib/student-session";

function readContent(content: string): { subject: string; message: string } {
  try {
    const parsed = JSON.parse(content) as { subject?: unknown; message?: unknown };
    if (typeof parsed.subject === "string" && typeof parsed.message === "string") {
      return { subject: parsed.subject, message: parsed.message };
    }
  } catch {}
  return { subject: content.slice(0, 100), message: content };
}

interface BackendStudentFeedbackDto {
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
}

export const dynamic = "force-dynamic";

export default async function Page() {
  const student = await requireStudent();

  let items: StudentFeedbackItem[] = [];

  try {
    const rawFeedbacks = await backendFetch<BackendStudentFeedbackDto[]>("/api/v1/feedback");
    items = rawFeedbacks.map((feedback) => {
      const content = readContent(feedback.content);
      const createdAtDate = typeof feedback.createdAt === "string" ? new Date(feedback.createdAt) : feedback.createdAt;
      return {
        id: `FB-${feedback.id.slice(-8).toUpperCase()}`,
        type: feedback.feedbackType,
        subject: feedback.subject || content.subject,
        message: feedback.message || content.message,
        date: formatPortalDate(createdAtDate),
        resolved: feedback.resolved,
        response: feedback.adminResponse ?? null,
      };
    });
  } catch {
    const feedbacks = student.user
      ? await db.feedback.findMany({
          where: { userId: student.user.id },
          orderBy: { createdAt: "desc" },
        })
      : [];

    items = feedbacks.map((feedback) => {
      const content = readContent(feedback.content);
      return {
        id: `FB-${feedback.id.slice(-8).toUpperCase()}`,
        type: feedback.feedbackType,
        subject: content.subject,
        message: content.message,
        date: formatPortalDate(feedback.createdAt),
        resolved: feedback.resolved,
        response: feedback.adminResponse,
      };
    });
  }

  return (
    <AuthenticatedPortalShell>
      <FeedbackList items={items} />
    </AuthenticatedPortalShell>
  );
}

