"use client";

import { useState, useMemo, useTransition } from "react";
import {
  Search,
  Download,
  CheckCircle2,
  Clock3,
  Users,
  Briefcase,
  FileText,
  ExternalLink,
} from "lucide-react";
import type { ApplicationStatus } from "@prisma/client";
import {
  updateApplicationStatusAction,
  bulkUpdateApplicationsAction,
} from "@/app/admin/applications/actions";

export type AdminApplicationRow = {
  id: string;
  userId: string;
  studentName: string;
  studentEmail: string;
  rollNumber: string | null;
  branch: string | null;
  batch: number | null;
  cgpa: number | null;
  jobProfileId: string;
  jobTitle: string;
  companyId: string;
  companyName: string;
  resumeId: string | null;
  resumeUrl: string | null;
  resumeLabel: string | null;
  status: ApplicationStatus;
  appliedAt: string;
  updatedAt: string;
};

export type JobOption = {
  id: string;
  title: string;
  companyName: string;
};

const ALL_STATUSES: ApplicationStatus[] = [
  "APPLIED",
  "SHORTLISTED",
  "INTERVIEW",
  "SELECTED",
  "REJECTED",
  "WITHDRAWN",
];

export function ApplicationsManager({
  applications: initialApplications,
  jobs,
}: {
  applications: AdminApplicationRow[];
  jobs: JobOption[];
}) {
  const [applications, setApplications] = useState<AdminApplicationRow[]>(initialApplications);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedBranch, setSelectedBranch] = useState<string>("ALL");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Extract unique branches
  const branches = useMemo(() => {
    const set = new Set<string>();
    for (const app of applications) {
      if (app.branch) set.add(app.branch);
    }
    return Array.from(set).sort();
  }, [applications]);

  // Filtering
  const filtered = useMemo(() => {
    return applications.filter((app) => {
      if (selectedJob !== "ALL" && app.jobProfileId !== selectedJob) return false;
      if (selectedStatus !== "ALL" && app.status !== selectedStatus) return false;
      if (selectedBranch !== "ALL" && app.branch !== selectedBranch) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const haystack = `${app.studentName} ${app.studentEmail} ${app.rollNumber ?? ""} ${app.jobTitle} ${app.companyName}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [applications, selectedJob, selectedStatus, selectedBranch, searchQuery]);

  // Metric counts
  const stats = useMemo(() => {
    const total = applications.length;
    const shortlisted = applications.filter((a) => a.status === "SHORTLISTED").length;
    const interviews = applications.filter((a) => a.status === "INTERVIEW").length;
    const selected = applications.filter((a) => a.status === "SELECTED").length;
    const rejected = applications.filter((a) => a.status === "REJECTED").length;
    return { total, shortlisted, interviews, selected, rejected };
  }, [applications]);

  // Check if all currently visible filtered items are selected
  const allFilteredSelected = useMemo(
    () => filtered.length > 0 && filtered.every((a) => selectedIds.has(a.id)),
    [filtered, selectedIds],
  );

  // Selection handlers
  const toggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (allFilteredSelected) {
      for (const item of filtered) {
        next.delete(item.id);
      }
    } else {
      for (const item of filtered) {
        next.add(item.id);
      }
    }
    setSelectedIds(next);
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Status update for a single application
  const handleSingleStatusChange = (appId: string, newStatus: ApplicationStatus) => {
    startTransition(async () => {
      setStatusMessage(null);
      const res = await updateApplicationStatusAction(appId, newStatus);
      if (res.error) {
        setStatusMessage({ type: "error", text: res.error });
      } else {
        setApplications((prev) =>
          prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a)),
        );
        setStatusMessage({ type: "success", text: res.success ?? "Status updated." });
      }
    });
  };

  // Bulk status update
  const handleBulkStatusChange = (newStatus: ApplicationStatus) => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;

    startTransition(async () => {
      setStatusMessage(null);
      const res = await bulkUpdateApplicationsAction(ids, newStatus);
      if (res.error) {
        setStatusMessage({ type: "error", text: res.error });
      } else {
        setApplications((prev) =>
          prev.map((a) => (selectedIds.has(a.id) ? { ...a, status: newStatus } : a)),
        );
        setSelectedIds(new Set());
        setStatusMessage({ type: "success", text: res.success ?? "Bulk status updated." });
      }
    });
  };

  // Client-side CSV export download
  const handleExportCsv = () => {
    const headers = [
      "Application ID",
      "Student Name",
      "Roll Number",
      "Email",
      "Branch",
      "Batch",
      "CGPA",
      "Company",
      "Job Title",
      "Status",
      "Applied Date",
      "Resume URL",
    ];

    const rows = filtered.map((a) => [
      a.id,
      `"${(a.studentName || "").replace(/"/g, '""')}"`,
      `"${a.rollNumber || ""}"`,
      `"${a.studentEmail || ""}"`,
      `"${a.branch || ""}"`,
      a.batch || "",
      a.cgpa || "",
      `"${(a.companyName || "").replace(/"/g, '""')}"`,
      `"${(a.jobTitle || "").replace(/"/g, '""')}"`,
      a.status,
      a.appliedAt,
      `"${a.resumeUrl || ""}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `applications_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadgeClass = (status: ApplicationStatus) => {
    switch (status) {
      case "SELECTED":
        return "cell-status";
      case "SHORTLISTED":
        return "cell-status" ;
      case "INTERVIEW":
        return "cell-status draft";
      case "REJECTED":
        return "cell-status pending";
      case "WITHDRAWN":
        return "cell-status pending";
      case "APPLIED":
      default:
        return "cell-status development";
    }
  };

  return (
    <div className="admin-page">
      <section className="admin-heading">
        <div>
          <span className="eyebrow">Candidate Management</span>
          <h1>Applications</h1>
          <p>Review candidate profiles, download resumes, and manage recruitment stage progression.</p>
        </div>
        <button onClick={handleExportCsv} title="Export CSV of filtered applications">
          <Download /> Export CSV
        </button>
      </section>

      {statusMessage ? (
        <div className={statusMessage.type === "success" ? "admin-success" : "admin-error"}>
          {statusMessage.text}
        </div>
      ) : null}

      {/* Summary Metrics */}
      <section className="admin-metrics">
        <article>
          <div className="company-admin-name">
            <i><Users /></i>
          </div>
          <div>
            <small>Total Applications</small>
            <strong>{stats.total}</strong>
            <b>All roles combined</b>
          </div>
        </article>
        <article>
          <div className="company-admin-name">
            <i style={{ background: "var(--badge-purple-bg)", color: "var(--badge-purple-text)" }}>
              <Clock3 />
            </i>
          </div>
          <div>
            <small>Shortlisted</small>
            <strong>{stats.shortlisted}</strong>
            <b style={{ color: "var(--blue)" }}>Ready for evaluation</b>
          </div>
        </article>
        <article>
          <div className="company-admin-name">
            <i style={{ background: "var(--badge-orange-bg)", color: "var(--orange)" }}>
              <Briefcase />
            </i>
          </div>
          <div>
            <small>In Interview</small>
            <strong>{stats.interviews}</strong>
            <b style={{ color: "var(--orange)" }}>Active rounds</b>
          </div>
        </article>
        <article>
          <div className="company-admin-name">
            <i style={{ background: "var(--badge-green-bg)", color: "var(--green)" }}>
              <CheckCircle2 />
            </i>
          </div>
          <div>
            <small>Offers / Selected</small>
            <strong>{stats.selected}</strong>
            <b>Final selections</b>
          </div>
        </article>
      </section>

      {/* Filters & Search Toolbar */}
      <section className="admin-toolbar" style={{ flexWrap: "wrap", gap: "10px" }}>
        <label style={{ minWidth: "220px", flex: 2 }}>
          <Search />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidate, email, roll no, or company"
          />
        </label>

        <select
          value={selectedJob}
          onChange={(e) => setSelectedJob(e.target.value)}
          aria-label="Filter by Job Profile"
          style={{ flex: 1.5, minWidth: "180px" }}
        >
          <option value="ALL">All Job Profiles ({jobs.length})</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.companyName} — {j.title}
            </option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          aria-label="Filter by Status"
          style={{ flex: 1, minWidth: "130px" }}
        >
          <option value="ALL">All Statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {branches.length > 0 && (
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            aria-label="Filter by Branch"
            style={{ flex: 1, minWidth: "120px" }}
          >
            <option value="ALL">All Branches</option>
            {branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        )}
      </section>

      {/* Multi-Candidate Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div
          style={{
            background: "var(--surface-alt)",
            border: "1px solid var(--blue)",
            borderRadius: "10px",
            padding: "10px 16px",
            marginBottom: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--ink)" }}>
            Selected <strong>{selectedIds.size}</strong> candidate(s)
          </span>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              onClick={() => handleBulkStatusChange("SHORTLISTED")}
              disabled={isPending}
              style={{
                border: "1px solid var(--border)",
                background: "var(--card-bg)",
                padding: "6px 10px",
                borderRadius: "7px",
                fontSize: "10px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Mark Shortlisted
            </button>
            <button
              onClick={() => handleBulkStatusChange("INTERVIEW")}
              disabled={isPending}
              style={{
                border: "1px solid var(--orange)",
                background: "var(--badge-orange-bg)",
                color: "var(--orange)",
                padding: "6px 10px",
                borderRadius: "7px",
                fontSize: "10px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Move to Interview
            </button>
            <button
              onClick={() => handleBulkStatusChange("SELECTED")}
              disabled={isPending}
              style={{
                border: "1px solid var(--green)",
                background: "var(--badge-green-bg)",
                color: "var(--green)",
                padding: "6px 10px",
                borderRadius: "7px",
                fontSize: "10px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Select / Offer
            </button>
            <button
              onClick={() => handleBulkStatusChange("REJECTED")}
              disabled={isPending}
              style={{
                border: "1px solid var(--badge-red-text)",
                background: "var(--badge-red-bg)",
                color: "var(--badge-red-text)",
                padding: "6px 10px",
                borderRadius: "7px",
                fontSize: "10px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {/* Applications Table */}
      <section className="admin-table">
        <div
          className="admin-row admin-row-head"
          style={{ gridTemplateColumns: "36px 1.4fr 1.1fr 1.3fr 1fr 1fr 1.2fr" }}
        >
          <span>
            <input
              type="checkbox"
              checked={allFilteredSelected}
              onChange={toggleSelectAll}
              aria-label="Select all candidates"
            />
          </span>
          <span>Candidate</span>
          <span>Academic Info</span>
          <span>Job & Company</span>
          <span>Resume</span>
          <span>Status</span>
          <span>Stage Action</span>
        </div>

        {filtered.map((app) => (
          <div
            className="admin-row"
            key={app.id}
            style={{ gridTemplateColumns: "36px 1.4fr 1.1fr 1.3fr 1fr 1fr 1.2fr" }}
          >
            {/* Checkbox */}
            <span>
              <input
                type="checkbox"
                checked={selectedIds.has(app.id)}
                onChange={() => toggleSelectOne(app.id)}
                aria-label={`Select ${app.studentName}`}
              />
            </span>

            {/* Candidate */}
            <div>
              <strong style={{ color: "var(--ink)", display: "block" }}>{app.studentName}</strong>
              <small style={{ color: "var(--muted)", fontSize: "9px" }}>{app.studentEmail}</small>
              {app.rollNumber ? (
                <small style={{ display: "block", color: "var(--ink)", fontWeight: 600, fontSize: "9px" }}>
                  {app.rollNumber}
                </small>
              ) : null}
            </div>

            {/* Academic Info */}
            <div>
              <span style={{ fontWeight: 600 }}>{app.branch ?? "Branch not specified"}</span>
              <small style={{ display: "block", color: "var(--muted)", fontSize: "9px" }}>
                {app.batch ? `Batch ${app.batch}` : ""} {app.cgpa !== null ? `· CGPA ${app.cgpa}` : ""}
              </small>
            </div>

            {/* Job & Company */}
            <div>
              <strong style={{ color: "var(--ink)" }}>{app.companyName}</strong>
              <small style={{ display: "block", color: "var(--muted)", fontSize: "9px" }}>
                {app.jobTitle}
              </small>
              <small style={{ display: "block", color: "var(--muted)", fontSize: "8px", marginTop: "2px" }}>
                Applied {app.appliedAt}
              </small>
            </div>

            {/* Resume */}
            <div>
              {app.resumeUrl ? (
                <a
                  href={app.resumeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="admin-external-link"
                  style={{ fontSize: "10px" }}
                  title="Open attached resume"
                >
                  <FileText style={{ width: "13px" }} />
                  {app.resumeLabel || "Resume"}
                  <ExternalLink style={{ width: "10px" }} />
                </a>
              ) : (
                <span style={{ color: "var(--muted)", fontSize: "9px" }}>Default profile</span>
              )}
            </div>

            {/* Current Status Pill */}
            <div>
              <b className={getStatusBadgeClass(app.status)}>{app.status}</b>
            </div>

            {/* Stage Action Dropdown */}
            <div>
              <select
                value={app.status}
                disabled={isPending}
                onChange={(e) => handleSingleStatusChange(app.id, e.target.value as ApplicationStatus)}
                style={{
                  padding: "5px 8px",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--surface-alt)",
                  color: "var(--ink)",
                  fontSize: "10px",
                  fontWeight: 600,
                  width: "100%",
                }}
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}

        {!filtered.length && (
          <div className="admin-empty">
            <Users />
            <h2>{applications.length ? "No matching candidates" : "No applications yet"}</h2>
            <p>
              {applications.length
                ? "Try adjusting your search query, job profile, status, or branch filters."
                : "Student applications submitted to active job postings will appear here."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
