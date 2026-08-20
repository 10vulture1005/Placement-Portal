"use client";

import Link from "next/link";
import { CheckCircle2, MessageSquareText, Send } from "lucide-react";
import { useState } from "react";
import { submitFeedback, type FeedbackSubmitResult } from "@/app/feedback/actions";

export function FeedbackForm({ student }: { student: { name: string; rollNumber: string; email: string; canSubmit: boolean } }) {
  const [result, setResult] = useState<FeedbackSubmitResult>({});
  const [submitting, setSubmitting] = useState(false);
  async function submit(formData: FormData) {
    setSubmitting(true);
    setResult(await submitFeedback(formData));
    setSubmitting(false);
  }
  if (result.reference) return <div className="module-page"><div className="success-state"><CheckCircle2/><h1>Message submitted</h1><p>Your reference number is <strong>{result.reference}</strong>. The placement team will respond here.</p><Link href="/feedback">View my feedbacks</Link></div></div>;
  return <div className="module-page"><section className="page-heading"><div><span className="eyebrow">Support</span><h1>Feedback or query</h1><p>Send a question, suggestion, or complaint to the placement team.</p></div></section><form className="feedback-form" action={submit}><header><MessageSquareText/><div><h2>New message</h2><p>Your saved student details are attached automatically.</p></div></header><div className="form-grid"><label>Student name<input disabled value={student.name}/></label><label>Roll number<input disabled value={student.rollNumber}/></label><label>Institute email<input disabled value={student.email}/></label><label>Message type<select name="feedbackType" required defaultValue="QUERY"><option value="QUERY">Query</option><option value="FEEDBACK">Feedback</option><option value="COMPLAINT">Complaint</option></select></label><label className="wide">Subject<input name="subject" required minLength={5} maxLength={150} placeholder="Briefly describe your request"/></label><label className="wide">Message<textarea name="message" required minLength={20} maxLength={4000} rows={7} placeholder="Include enough detail for the team to help you..."/></label></div>{result.error ? <div className="profile-error">{result.error}</div> : null}<footer><span>Typical response time: 1–2 working days</span><button type="submit" disabled={!student.canSubmit || submitting}><Send/>{student.canSubmit ? (submitting ? "Submitting…" : "Submit message") : "Google sign-in required"}</button></footer></form></div>;
}
