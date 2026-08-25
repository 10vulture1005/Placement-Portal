"use client";

import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, MapPin, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

export type StudentJobListItem = {
  id: string;
  company: string;
  initials: string;
  color: string;
  title: string;
  type: string;
  location: string;
  deadline: string;
  status: "Active" | "Closed";
};

export function JobsList({ jobs: allJobs }: { jobs: StudentJobListItem[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("All");
  const [status, setStatus] = useState("All");
  const jobTypes = ["All", ...Array.from(new Set(allJobs.map((job) => job.type)))];
  const jobs = useMemo(
    () =>
      allJobs.filter(
        (job) =>
          (type === "All" || job.type === type) &&
          (status === "All" || job.status === status) &&
          `${job.company} ${job.title} ${job.location}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [allJobs, query, type, status],
  );

  return (
    <div className="jobs-page">
      <section className="page-heading">
        <div>
          <span className="eyebrow">Campus Recruitment</span>
          <h1>Company events</h1>
          <p>Explore active campus hiring drives and review automated eligibility criteria.</p>
        </div>
        <div className="job-count">
          <BriefcaseBusiness size={20} />
          <strong>{allJobs.filter((job) => job.status === "Active").length}</strong>
          <span>active openings</span>
        </div>
      </section>

      <section className="job-filters">
        <label>
          <Search size={18} />
          <input
            placeholder="Search by company, role title, or location..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div>
          <SlidersHorizontal size={14} className="ml-1 text-[var(--muted)]" />
          {jobTypes.map((item) => (
            <button
              className={type === item ? "selected" : ""}
              onClick={() => setType(item)}
              key={item}
            >
              {item}
            </button>
          ))}
        </div>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label="Filter by status"
        >
          <option value="All">All statuses</option>
          <option value="Active">Active only</option>
          <option value="Closed">Closed</option>
        </select>
      </section>

      <section className="jobs-table">
        <div className="jobs-row jobs-head">
          <span>Company & Role</span>
          <span>Location</span>
          <span>Application Deadline</span>
          <span>Status</span>
          <span />
        </div>
        {jobs.map((job) => (
          <Link className="jobs-row" href={`/company-events/${job.id}`} key={job.id}>
            <span className="job-company">
              <i style={{ background: job.color }}>{job.initials}</i>
              <span>
                <strong>{job.title}</strong>
                <small>
                  {job.company} · {job.type}
                </small>
              </span>
            </span>
            <span className="job-location">
              <MapPin size={15} />
              {job.location}
            </span>
            <span>{job.deadline}</span>
            <span>
              <b className={`status ${job.status.toLowerCase()}`}>{job.status}</b>
            </span>
            <span className="view-job flex items-center justify-end gap-1">
              View details <ArrowRight size={14} />
            </span>
          </Link>
        ))}
        {!jobs.length && (
          <div className="empty">
            <Search size={32} />
            <h3>No matching opportunities found</h3>
            <p>
              {allJobs.length
                ? "Try clearing your filters or using a broader search term."
                : "No campus placement drives have been published yet."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
