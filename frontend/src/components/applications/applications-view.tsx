"use client";

import Link from "next/link";
import type { ApplicationStatus } from "@prisma/client";
import { CalendarDays, CheckCircle2, Clock3, FileText, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { withdrawApplication } from "@/app/applications/actions";

export type StudentApplicationItem = {
  id: string;
  role: string;
  company: string;
  applied: string;
  status: ApplicationStatus;
  next: string;
  color: string;
  initials: string;
};

const steps: ApplicationStatus[] = ["APPLIED", "SHORTLISTED", "INTERVIEW", "SELECTED"];

export function ApplicationsView({ applications }: { applications: StudentApplicationItem[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const visible = useMemo(
    () =>
      applications.filter(
        (application) =>
          (filter === "ALL" || application.status === filter) &&
          `${application.role} ${application.company}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [applications, filter, query],
  );

  return <div className="module-page"><section className="page-heading"><div><span className="eyebrow">Your journey</span><h1>My applications</h1><p>Track every application from submission to final decision.</p></div><Link className="primary-link" href="/company-events">Browse opportunities</Link></section><section className="application-stats"><article><strong>{applications.length}</strong><span>Total applications</span></article><article><strong>{applications.filter(application => application.status === "SHORTLISTED").length}</strong><span>Shortlisted</span></article><article><strong>{applications.filter(application => application.status === "INTERVIEW").length}</strong><span>Interviews</span></article><article><strong>{applications.filter(application => application.status === "SELECTED").length}</strong><span>Offers</span></article></section><section className="compact-filters"><label><Search/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search applications"/></label><select value={filter} onChange={event => setFilter(event.target.value)}><option value="ALL">All statuses</option>{["APPLIED", "SHORTLISTED", "INTERVIEW", "SELECTED", "REJECTED", "WITHDRAWN"].map(status => <option key={status}>{status}</option>)}</select></section><section className="application-list">{visible.map(item => { const active = steps.indexOf(item.status); return <article key={item.id}><div className="application-title"><i style={{ background: item.color }}>{item.initials}</i><div><span>{item.company}</span><h2>{item.role}</h2><small><CalendarDays/> Applied {item.applied}</small></div><b className={`application-status ${item.status.toLowerCase()}`}>{item.status}</b></div>{active >= 0 && <div className="status-track">{steps.map((step, index) => <div className={index <= active ? "done" : ""} key={step}><span>{index < active ? <CheckCircle2/> : index === active ? <Clock3/> : <i/>}</span><small>{step}</small></div>)}</div>}<div className="application-footer"><span><FileText/>{item.next}</span>{["APPLIED", "SHORTLISTED"].includes(item.status) && <form action={withdrawApplication}><input type="hidden" name="applicationId" value={item.id}/><button type="submit">Withdraw</button></form>}</div></article>; })}{!visible.length && <div className="empty"><Search/><h3>{applications.length ? "No applications found" : "No applications yet"}</h3><p>{applications.length ? "Try another status or search term." : "Applications you submit will appear here."}</p></div>}</section></div>;
}
