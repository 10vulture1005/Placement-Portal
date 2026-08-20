"use client";

import { BellRing, BriefcaseBusiness, Building2, CalendarDays, ChevronRight, Clock3, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

export type DashboardFeedData = {
  studentName: string;
  dateLabel: string;
  metrics: {
    openOpportunities: number;
    closingThisWeek: number;
    applications: number;
    underReview: number;
    eligibleRoles: number | null;
  };
  nextDeadline: { company: string; date: string } | null;
  announcements: Array<{
    id: string;
    company: string;
    title: string;
    summary: string;
    date: string;
    type: string;
    category: "Company event" | "General";
    color: string;
    initial: string;
  }>;
};

const filters = ["All", "Company event", "General"] as const;

export function DashboardFeed({ data }: { data: DashboardFeedData }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const visible = useMemo(
    () =>
      data.announcements.filter(
        (announcement) =>
          (filter === "All" || announcement.category === filter) &&
          `${announcement.title} ${announcement.company} ${announcement.type}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [data.announcements, query, filter],
  );

  return <div className="dashboard">
    <section className="welcome"><div><span className="eyebrow">{data.dateLabel}</span><h1>Welcome, {data.studentName.split(" ")[0]} <span>👋</span></h1><p>Here’s what’s happening with placements today.</p></div>{data.nextDeadline ? <div className="deadline"><Clock3 /><div><span>Next deadline</span><strong>{data.nextDeadline.company} · {data.nextDeadline.date}</strong></div><ChevronRight /></div> : null}</section>
    <section className="metrics">
      <article><div className="metric-icon blue"><BriefcaseBusiness /></div><div><span>Open opportunities</span><strong>{data.metrics.openOpportunities}</strong><small>{data.metrics.closingThisWeek} closing this week</small></div></article>
      <article><div className="metric-icon orange"><CalendarDays /></div><div><span>My applications</span><strong>{data.metrics.applications}</strong><small>{data.metrics.underReview} under review</small></div></article>
      <article><div className="metric-icon green"><Sparkles /></div><div><span>Eligible roles</span><strong>{data.metrics.eligibleRoles ?? "—"}</strong><small>{data.metrics.eligibleRoles === null ? "Complete your profile to calculate" : "Based on your profile"}</small></div></article>
    </section>
    <section className="feed-header"><div><div className="section-icon"><BellRing /></div><div><h2>Announcements</h2><p>Latest opportunities and important updates</p></div></div></section>
    <section className="filters"><label><Search size={19} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search announcements or companies" /></label><div>{filters.map(item => <button className={filter === item ? "selected" : ""} onClick={() => setFilter(item)} key={item}>{item}</button>)}</div></section>
    <section className="announcement-list">{visible.length ? visible.map(item => <article key={item.id}><div className="company-logo" style={{ background: item.color }}>{item.initial}</div><div className="announcement-copy"><div className="announcement-meta"><span>{item.company}</span><i>•</i><span>{item.date}</span></div><h3>{item.title}</h3><p>{item.summary}</p><span className={`tag ${item.type.toLowerCase().replaceAll(" ", "-")}`}>{item.type}</span></div></article>) : <div className="empty"><Building2 /><h3>No announcements yet</h3><p>New placement updates will appear here when published.</p></div>}</section>
  </div>;
}
