"use client";

import {
  BellRing,
  BriefcaseBusiness,
  Building2,
  Calendar,
  CalendarDays,
  ChevronRight,
  Clock3,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

export type DashboardAnnouncement = {
  id: string;
  company: string;
  title: string;
  summary: string;
  date: string;
  type: string;
  category: "Company event" | "General";
  tags?: string[];
  color: string;
  initial: string;
};

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
  announcements: DashboardAnnouncement[];
};

const filters = ["All", "Company event", "General"] as const;

export function DashboardFeed({ data }: { data: DashboardFeedData }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<DashboardAnnouncement | null>(null);

  const visible = useMemo(
    () =>
      data.announcements.filter(
        (announcement) =>
          (filter === "All" || announcement.category === filter) &&
          `${announcement.title} ${announcement.company} ${announcement.type} ${(announcement.tags || []).join(" ")}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [data.announcements, query, filter],
  );

  return (
    <div className="dashboard">
      <section className="welcome">
        <div>
          <span className="eyebrow">{data.dateLabel}</span>
          <h1>
            Welcome, {data.studentName.split(" ")[0]} <span>👋</span>
          </h1>
          <p>Here’s what’s happening with campus placements today.</p>
        </div>
        {data.nextDeadline ? (
          <div className="deadline">
            <Clock3 />
            <div>
              <span>Next deadline</span>
              <strong>
                {data.nextDeadline.company} · {data.nextDeadline.date}
              </strong>
            </div>
            <ChevronRight />
          </div>
        ) : null}
      </section>

      <section className="metrics">
        <article>
          <div className="metric-icon blue">
            <BriefcaseBusiness />
          </div>
          <div>
            <span>Open opportunities</span>
            <strong>{data.metrics.openOpportunities}</strong>
            <small>{data.metrics.closingThisWeek} closing this week</small>
          </div>
        </article>
        <article>
          <div className="metric-icon orange">
            <CalendarDays />
          </div>
          <div>
            <span>My applications</span>
            <strong>{data.metrics.applications}</strong>
            <small>{data.metrics.underReview} active in pipeline</small>
          </div>
        </article>
        <article>
          <div className="metric-icon green">
            <Sparkles />
          </div>
          <div>
            <span>Eligible roles</span>
            <strong>{data.metrics.eligibleRoles ?? "—"}</strong>
            <small>
              {data.metrics.eligibleRoles === null
                ? "Complete profile to calculate"
                : "Based on your academic profile"}
            </small>
          </div>
        </article>
      </section>

      <section className="feed-header">
        <div>
          <div className="section-icon">
            <BellRing />
          </div>
          <div>
            <h2>Announcements & Drives</h2>
            <p>Latest hiring updates, tests, and shortlist publications</p>
          </div>
        </div>
      </section>

      <section className="filters">
        <label>
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search announcements, companies, or drive types..."
          />
        </label>
        <div>
          {filters.map((item) => (
            <button
              className={filter === item ? "selected" : ""}
              onClick={() => setFilter(item)}
              key={item}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      <section className="announcement-list">
        {visible.length ? (
          visible.map((item) => (
            <article
              key={item.id}
              onClick={() => setSelectedAnnouncement(item)}
              style={{ cursor: "pointer" }}
              tabIndex={0}
              role="button"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedAnnouncement(item);
                }
              }}
            >
              <div className="company-logo" style={{ background: item.color }}>
                {item.initial}
              </div>
              <div className="announcement-copy">
                <div className="announcement-meta">
                  <span>{item.company}</span>
                  <i>•</i>
                  <span>{item.date}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                  <span className={`tag ${item.type.toLowerCase().replaceAll(" ", "-")}`}>
                    {item.type}
                  </span>
                  {item.tags && item.tags.length > 1
                    ? item.tags.slice(1, 4).map((t) => (
                        <span
                          key={t}
                          style={{
                            fontSize: 9,
                            padding: "3px 8px",
                            borderRadius: 9999,
                            background: "var(--surface-alt)",
                            border: "1px solid var(--border)",
                            color: "var(--ink)",
                            fontWeight: 700,
                          }}
                        >
                          {t}
                        </span>
                      ))
                    : null}
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="empty">
            <Building2 />
            <h3>No announcements found</h3>
            <p>Placement notifications and updates will appear here when published.</p>
          </div>
        )}
      </section>

      {/* STUDENT ANNOUNCEMENT DETAIL MODAL */}
      {selectedAnnouncement ? (
        <div className="modal-backdrop" onClick={() => setSelectedAnnouncement(null)}>
          <div
            className="modal"
            style={{ width: "min(680px, 100%)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <header>
              <div>
                <span className="eyebrow">{selectedAnnouncement.category}</span>
                <h2>{selectedAnnouncement.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAnnouncement(null)}
                aria-label="Close dialog"
              >
                <X />
              </button>
            </header>

            <div style={{ padding: "16px 0", display: "grid", gap: 14 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  background: "var(--surface-alt)",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  fontSize: 11,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: selectedAnnouncement.color,
                      color: "#fff",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {selectedAnnouncement.initial}
                  </div>
                  <strong style={{ color: "var(--ink)" }}>
                    {selectedAnnouncement.company}
                  </strong>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    color: "var(--muted)",
                  }}
                >
                  <Calendar size={13} />
                  <span>{selectedAnnouncement.date}</span>
                </div>
              </div>

              {selectedAnnouncement.tags && selectedAnnouncement.tags.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {selectedAnnouncement.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: 9999,
                        background: "var(--badge-blue-bg)",
                        color: "var(--blue)",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}

              <div
                style={{
                  color: "var(--ink)",
                  fontSize: 13,
                  lineHeight: 1.7,
                  whiteSpace: "pre-wrap",
                  background: "var(--card-bg)",
                  padding: 16,
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                }}
              >
                {selectedAnnouncement.summary}
              </div>
            </div>

            <footer>
              <button
                type="button"
                onClick={() => setSelectedAnnouncement(null)}
                style={{
                  background: "var(--blue)",
                  color: "#fff",
                  border: 0,
                  fontWeight: 700,
                }}
              >
                Close
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}

