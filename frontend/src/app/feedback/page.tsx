import { FeedbackList, type StudentFeedbackItem } from "@/components/feedback/feedback-list";
import { AuthenticatedPortalShell } from "@/components/layout/authenticated-portal-shell";
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

export const dynamic = "force-dynamic";

export default async function Page() {
  const student = await requireStudent();
  const feedbacks = student.user ? await db.feedback.findMany({ where: { userId: student.user.id }, orderBy: { createdAt: "desc" } }) : [];
  const items: StudentFeedbackItem[] = feedbacks.map(feedback => {
    const content = readContent(feedback.content);
    return {
      id: `FB-${feedback.id.slice(-8).toUpperCase()}`,
      type: feedback.feedbackType,
      subject: content.subject,
      date: formatPortalDate(feedback.createdAt),
      resolved: feedback.resolved,
      response: feedback.adminResponse,
    };
  });
  return <AuthenticatedPortalShell><FeedbackList items={items}/></AuthenticatedPortalShell>;
}
