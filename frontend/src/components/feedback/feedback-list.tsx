"use client";

import Link from "next/link";
import { CheckCircle2, Clock3, MessageSquarePlus, Search } from "lucide-react";
import { useState } from "react";

export type StudentFeedbackItem = { id: string; type: string; subject: string; date: string; resolved: boolean; response: string | null };

export function FeedbackList({ items }: { items: StudentFeedbackItem[] }) {
  const [showResolved, setShowResolved] = useState(true);
  const visible = items.filter(item => showResolved || !item.resolved);
  return <div className="module-page"><section className="page-heading"><div><span className="eyebrow">Support history</span><h1>My feedbacks</h1><p>Track your messages and responses from the placement team.</p></div><Link className="primary-link" href="/feedback/new"><MessageSquarePlus/>New message</Link></section><div className="feedback-toggle"><label><input type="checkbox" checked={showResolved} onChange={event => setShowResolved(event.target.checked)}/>Show resolved messages</label></div><section className="feedback-list">{visible.map(item => <article key={item.id}><div className={`feedback-state ${item.resolved ? "resolved" : "pending"}`}>{item.resolved ? <CheckCircle2/> : <Clock3/>}</div><div><span>{item.type} · {item.id} · {item.date}</span><h2>{item.subject}</h2><b>{item.resolved ? "Resolved" : "Awaiting response"}</b>{item.response && <blockquote><strong>Placement team response</strong>{item.response}</blockquote>}</div></article>)}{!visible.length && <div className="empty"><Search/><h3>{items.length ? "No open messages" : "No messages yet"}</h3><p>{items.length ? "All of your messages have been resolved." : "Messages you submit will appear here."}</p></div>}</section></div>;
}
