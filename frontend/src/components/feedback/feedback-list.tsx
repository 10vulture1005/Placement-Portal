"use client";

import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  HelpCircle,
  MessageSquare,
  MessageSquarePlus,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";

export type StudentFeedbackItem = {
  id: string;
  type: string;
  subject: string;
  message?: string;
  date: string;
  resolved: boolean;
  response: string | null;
};

export function FeedbackList({ items }: { items: StudentFeedbackItem[] }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "RESOLVED">("ALL");

  const visible = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        `${item.subject} ${item.message ?? ""} ${item.response ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesType = typeFilter === "ALL" || item.type.toUpperCase() === typeFilter;
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "RESOLVED" && item.resolved) ||
        (statusFilter === "PENDING" && !item.resolved);

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [items, search, typeFilter, statusFilter]);

  function getTypeBadge(type: string) {
    const norm = type.toUpperCase();
    if (norm === "QUERY") {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "3px",
            background: "var(--badge-blue-bg)",
            color: "var(--badge-blue-text)",
            padding: "2px 8px",
            borderRadius: "6px",
            fontSize: "10px",
            fontWeight: 700,
          }}
        >
          <HelpCircle size={11} /> Query
        </span>
      );
    }
    if (norm === "COMPLAINT") {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "3px",
            background: "var(--badge-red-bg)",
            color: "var(--badge-red-text)",
            padding: "2px 8px",
            borderRadius: "6px",
            fontSize: "10px",
            fontWeight: 700,
          }}
        >
          <AlertCircle size={11} /> Complaint
        </span>
      );
    }
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "3px",
          background: "var(--badge-green-bg)",
          color: "var(--badge-green-text)",
          padding: "2px 8px",
          borderRadius: "6px",
          fontSize: "10px",
          fontWeight: 700,
        }}
      >
        <MessageSquare size={11} /> Feedback
      </span>
    );
  }

  return (
    <div className="module-page">
      <section className="page-heading">
        <div>
          <span className="eyebrow">Support history</span>
          <h1>My feedbacks & queries</h1>
          <p>Track your messages and responses from the Training & Placement Cell.</p>
        </div>
        <Link className="primary-link" href="/feedback/new">
          <MessageSquarePlus />
          New message
        </Link>
      </section>

      {/* Filter toolbar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          alignItems: "center",
          justifyContent: "space-between",
          margin: "24px 0 16px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "var(--card-bg)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "0 14px",
            flex: "1 1 260px",
          }}
        >
          <Search size={16} style={{ color: "var(--muted)" }} />
          <input
            type="search"
            placeholder="Search your messages or replies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              border: 0,
              outline: 0,
              padding: "10px 0",
              background: "transparent",
              color: "var(--ink)",
              fontSize: "12px",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filter by type"
            style={{
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "8px 12px",
              background: "var(--card-bg)",
              color: "var(--ink)",
              fontSize: "11px",
              fontWeight: 600,
            }}
          >
            <option value="ALL">All Message Types</option>
            <option value="QUERY">Queries</option>
            <option value="FEEDBACK">Feedback</option>
            <option value="COMPLAINT">Complaints</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "ALL" | "PENDING" | "RESOLVED")}
            aria-label="Filter by status"
            style={{
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "8px 12px",
              background: "var(--card-bg)",
              color: "var(--ink)",
              fontSize: "11px",
              fontWeight: 600,
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Awaiting Response</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </div>

      <section className="feedback-list">
        {visible.map((item) => (
          <article key={item.id} style={{ display: "flex", gap: "16px", padding: "20px" }}>
            <div className={`feedback-state ${item.resolved ? "resolved" : "pending"}`}>
              {item.resolved ? <CheckCircle2 /> : <Clock3 />}
            </div>

            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                  marginBottom: "4px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {getTypeBadge(item.type)}
                  <span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 700 }}>
                    {item.id} · {item.date}
                  </span>
                </div>

                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: item.resolved ? "var(--green)" : "var(--orange)",
                  }}
                >
                  {item.resolved ? "Resolved" : "Awaiting response"}
                </span>
              </div>

              <h2 style={{ fontSize: "15px", margin: "6px 0 4px", color: "var(--ink)" }}>
                {item.subject}
              </h2>

              {item.message && (
                <p style={{ margin: "4px 0 8px", fontSize: "12px", color: "var(--muted)", lineHeight: "1.5" }}>
                  {item.message}
                </p>
              )}

              {item.response && (
                <blockquote
                  style={{
                    margin: "12px 0 0",
                    background: "var(--surface-alt)",
                    borderLeft: "3px solid var(--green)",
                    padding: "12px 14px",
                    borderRadius: "0 10px 10px 0",
                    fontSize: "12px",
                    lineHeight: "1.6",
                    color: "var(--ink)",
                  }}
                >
                  <strong style={{ color: "var(--green)", display: "block", marginBottom: "2px" }}>
                    Placement Team Response
                  </strong>
                  {item.response}
                </blockquote>
              )}
            </div>
          </article>
        ))}

        {!visible.length && (
          <div className="empty">
            <Search />
            <h3>{items.length ? "No matching messages" : "No messages yet"}</h3>
            <p>
              {items.length
                ? "No messages match your selected filters."
                : "Submit a feedback, query, or complaint to reach out to the placement team."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

