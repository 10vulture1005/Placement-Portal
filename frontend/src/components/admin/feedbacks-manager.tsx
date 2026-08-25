"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  HelpCircle,
  MessageSquare,
  MessageSquareReply,
  MessageSquareText,
  Search,
  Send,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  deleteFeedbackAction,
  respondFeedbackAction,
  type FeedbackActionResult,
} from "@/app/admin/feedbacks/actions";

export type AdminFeedbackItem = {
  id: string;
  userId: string;
  studentName: string | null;
  studentEmail: string | null;
  rollNumber: string | null;
  branch: string | null;
  batch: number | null;
  contactNumber: string | null;
  feedbackType: "QUERY" | "FEEDBACK" | "COMPLAINT" | string;
  subject: string;
  message: string;
  resolved: boolean;
  adminResponse: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export function FeedbacksManager({
  feedbacks,
}: {
  feedbacks: AdminFeedbackItem[];
  canPersist?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "RESOLVED">("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  const [activeItem, setActiveItem] = useState<AdminFeedbackItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<AdminFeedbackItem | null>(null);
  const [replyText, setReplyText] = useState("");
  const [resolveCheck, setResolveCheck] = useState(true);

  const [result, setResult] = useState<FeedbackActionResult>({});
  const [isPending, startTransition] = useTransition();

  const metrics = useMemo(() => {
    const total = feedbacks.length;
    const pending = feedbacks.filter((f) => !f.resolved).length;
    const resolved = feedbacks.filter((f) => f.resolved).length;
    const queries = feedbacks.filter((f) => f.feedbackType.toUpperCase() === "QUERY").length;
    const feedbackCount = feedbacks.filter((f) => f.feedbackType.toUpperCase() === "FEEDBACK").length;
    const complaints = feedbacks.filter((f) => f.feedbackType.toUpperCase() === "COMPLAINT").length;
    return { total, pending, resolved, queries, feedbackCount, complaints };
  }, [feedbacks]);

  const visible = useMemo(() => {
    return feedbacks.filter((item) => {
      const matchesSearch =
        `${item.studentName ?? ""} ${item.rollNumber ?? ""} ${item.studentEmail ?? ""} ${item.subject} ${item.message} ${item.adminResponse ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "RESOLVED" && item.resolved) ||
        (statusFilter === "PENDING" && !item.resolved);

      const matchesType = typeFilter === "ALL" || item.feedbackType.toUpperCase() === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [feedbacks, query, statusFilter, typeFilter]);

  function openRespondModal(item: AdminFeedbackItem) {
    setResult({});
    setActiveItem(item);
    setReplyText(item.adminResponse ?? "");
    setResolveCheck(true);
  }

  function handleRespondSubmit(formData: FormData) {
    setResult({});
    startTransition(async () => {
      formData.set("feedbackId", activeItem!.id);
      formData.set("adminResponse", replyText);
      formData.set("resolve", resolveCheck ? "true" : "false");

      const res = await respondFeedbackAction(formData);
      setResult(res);
      if (res.success) {
        setActiveItem(null);
        router.refresh();
      }
    });
  }

  function handleDeleteSubmit(formData: FormData) {
    setResult({});
    startTransition(async () => {
      const res = await deleteFeedbackAction(formData);
      setResult(res);
      if (res.success) {
        setDeletingItem(null);
        router.refresh();
      }
    });
  }

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
            padding: "3px 8px",
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
            padding: "3px 8px",
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
          padding: "3px 8px",
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
    <div className="admin-page">
      <section className="admin-heading">
        <div>
          <span className="eyebrow">Management</span>
          <h1>Feedbacks & Queries</h1>
          <p>Respond to student queries, suggestions, and grievances regarding placement operations.</p>
        </div>
      </section>

      {/* Metrics Grid */}
      <section className="admin-metrics">
        <article>
          <div className="metric-icon violet">
            <MessageSquareText size={20} />
          </div>
          <div>
            <small>Total Messages</small>
            <strong>{metrics.total}</strong>
            <b>All student inquiries</b>
          </div>
        </article>

        <article>
          <div className="metric-icon" style={{ background: "var(--badge-orange-bg)", color: "var(--badge-orange-text)" }}>
            <Clock3 size={20} />
          </div>
          <div>
            <small>Awaiting Response</small>
            <strong>{metrics.pending}</strong>
            <b>Unresolved items</b>
          </div>
        </article>

        <article>
          <div className="metric-icon" style={{ background: "var(--badge-green-bg)", color: "var(--badge-green-text)" }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <small>Resolved</small>
            <strong>{metrics.resolved}</strong>
            <b>Answered queries</b>
          </div>
        </article>

        <article>
          <div className="metric-icon" style={{ background: "var(--badge-blue-bg)", color: "var(--badge-blue-text)" }}>
            <HelpCircle size={20} />
          </div>
          <div>
            <small>Queries & Complaints</small>
            <strong>{metrics.queries + metrics.complaints}</strong>
            <b>{metrics.queries} Qs · {metrics.complaints} Complaints</b>
          </div>
        </article>
      </section>

      {/* Result feedback */}
      {result.success && <div className="admin-success">{result.success}</div>}
      {result.error && <div className="admin-error">{result.error}</div>}

      {/* Toolbar */}
      <div className="admin-toolbar">
        <label>
          <Search />
          <input
            type="search"
            placeholder="Search by student name, roll number, subject, content..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          aria-label="Filter by type"
        >
          <option value="ALL">All Types ({feedbacks.length})</option>
          <option value="QUERY">Queries ({metrics.queries})</option>
          <option value="FEEDBACK">Feedback ({metrics.feedbackCount})</option>
          <option value="COMPLAINT">Complaints ({metrics.complaints})</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "ALL" | "PENDING" | "RESOLVED")}
          aria-label="Filter by resolution status"
        >
          <option value="ALL">All Statuses ({feedbacks.length})</option>
          <option value="PENDING">Awaiting Response ({metrics.pending})</option>
          <option value="RESOLVED">Resolved ({metrics.resolved})</option>
        </select>
      </div>

      {/* Table */}
      <section className="admin-table">
        <div
          className="admin-row admin-row-head"
          style={{ gridTemplateColumns: "1.8fr 1.1fr 2.4fr 1.1fr 1fr 1.2fr" }}
        >
          <span>Student</span>
          <span>Type</span>
          <span>Subject & Message</span>
          <span>Submitted</span>
          <span>Status</span>
          <span style={{ textAlign: "right" }}>Actions</span>
        </div>

        {visible.length > 0 ? (
          visible.map((item) => {
            return (
              <div
                key={item.id}
                className="admin-row"
                style={{ gridTemplateColumns: "1.8fr 1.1fr 2.4fr 1.1fr 1fr 1.2fr" }}
              >
                {/* Student */}
                <div>
                  <strong style={{ color: "var(--ink)", fontWeight: 700 }}>
                    {item.studentName || item.rollNumber || "Student"}
                  </strong>
                  <small style={{ color: "var(--muted)", display: "block", fontSize: "10px" }}>
                    {[item.rollNumber, item.branch, item.batch ? `Batch '${String(item.batch).slice(-2)}` : null]
                      .filter(Boolean)
                      .join(" · ") || item.studentEmail}
                  </small>
                </div>

                {/* Type */}
                <div>{getTypeBadge(item.feedbackType)}</div>

                {/* Subject & snippet */}
                <div>
                  <strong style={{ color: "var(--ink)", fontSize: "12px" }}>{item.subject}</strong>
                  <small
                    style={{
                      color: "var(--muted)",
                      display: "block",
                      fontSize: "10px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: "280px",
                    }}
                  >
                    {item.message}
                  </small>
                </div>

                {/* Date */}
                <div>
                  <span style={{ fontWeight: 600, fontSize: "11px" }}>
                    {new Date(item.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>

                {/* Status */}
                <div>
                  {item.resolved ? (
                    <span className="cell-status" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <CheckCircle2 size={11} /> Resolved
                    </span>
                  ) : (
                    <span className="cell-status pending" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <Clock3 size={11} /> Awaiting
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={() => openRespondModal(item)}
                    title={item.resolved ? "View conversation & edit response" : "Respond to student"}
                    style={{
                      border: 0,
                      background: item.resolved ? "var(--surface-alt)" : "var(--badge-blue-bg)",
                      color: "var(--blue)",
                      borderRadius: "8px",
                      padding: "6px 10px",
                      fontSize: "11px",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      cursor: "pointer",
                    }}
                  >
                    <MessageSquareReply size={13} /> {item.resolved ? "View" : "Reply"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setResult({});
                      setDeletingItem(item);
                    }}
                    title="Delete feedback item"
                    style={{
                      border: 0,
                      background: "var(--surface-alt)",
                      color: "var(--badge-red-text)",
                      borderRadius: "8px",
                      padding: "6px",
                      cursor: "pointer",
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="admin-empty">
            <MessageSquare size={32} />
            <h2>No messages found</h2>
            <p>
              {query
                ? "No student feedback items match your search filter."
                : "No messages or queries submitted yet."}
            </p>
          </div>
        )}
      </section>

      {/* Response & Detail Modal */}
      {activeItem && (
        <div className="modal-backdrop">
          <form className="modal" style={{ maxWidth: "660px" }} onSubmit={(e) => { e.preventDefault(); handleRespondSubmit(new FormData(e.currentTarget)); }}>
            <input type="hidden" name="feedbackId" value={activeItem.id} />
            <header>
              <div>
                <span className="eyebrow">{activeItem.resolved ? "Support History" : "Support Response"}</span>
                <h2>{activeItem.subject}</h2>
              </div>
              <button type="button" onClick={() => setActiveItem(null)} aria-label="Close">
                <X />
              </button>
            </header>

            <div style={{ display: "grid", gap: "14px", margin: "16px 0", fontSize: "12px", color: "var(--ink)" }}>
              {/* Student info box */}
              <div style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", borderRadius: "12px", padding: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                    <User size={12} /> Student Details
                  </span>
                  {getTypeBadge(activeItem.feedbackType)}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "8px" }}>
                  <div>
                    <strong style={{ display: "block" }}>{activeItem.studentName || "Name not recorded"}</strong>
                    <small style={{ color: "var(--muted)" }}>{activeItem.studentEmail}</small>
                  </div>
                  <div>
                    <span>Roll: <strong>{activeItem.rollNumber || "N/A"}</strong></span>
                    <span style={{ display: "block" }}>
                      Branch: <strong>{[activeItem.branch, activeItem.batch ? `Batch ${activeItem.batch}` : null].filter(Boolean).join(" - ") || "N/A"}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Message box */}
              <div style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", borderRadius: "12px", padding: "14px" }}>
                <span style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                  Student Message · {new Date(activeItem.createdAt).toLocaleString("en-IN")}
                </span>
                <p style={{ margin: "6px 0 0", color: "var(--ink)", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                  {activeItem.message}
                </p>
              </div>

              {/* Reply field */}
              <div style={{ display: "grid", gap: "6px" }}>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--ink)" }}>
                  Placement Cell Response
                </label>
                <textarea
                  name="adminResponse"
                  rows={5}
                  required
                  minLength={2}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Draft your official response to the student..."
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    padding: "10px 12px",
                    background: "var(--input-bg)",
                    color: "var(--ink)",
                    fontSize: "12px",
                    lineHeight: "1.5",
                  }}
                />
              </div>

              {/* Resolve checkbox */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: 600, color: "var(--ink)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={resolveCheck}
                    onChange={(e) => setResolveCheck(e.target.checked)}
                    style={{ width: "16px", height: "16px", accentColor: "var(--blue)" }}
                  />
                  Mark query as resolved
                </label>
              </div>
            </div>

            <footer>
              <button type="button" onClick={() => setActiveItem(null)}>
                Cancel
              </button>
              <button type="submit" disabled={isPending} style={{ background: "var(--navy)", color: "#fff" }}>
                <Send size={13} />
                {isPending ? "Submitting..." : activeItem.resolved ? "Update Response" : "Send Response"}
              </button>
            </footer>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <div className="modal-backdrop">
          <form className="modal" style={{ maxWidth: "460px" }} onSubmit={(e) => { e.preventDefault(); handleDeleteSubmit(new FormData(e.currentTarget)); }}>
            <input type="hidden" name="feedbackId" value={deletingItem.id} />
            <header>
              <div>
                <span className="eyebrow" style={{ color: "var(--badge-red-text)" }}>Delete</span>
                <h2>Delete Feedback?</h2>
              </div>
              <button type="button" onClick={() => setDeletingItem(null)} aria-label="Close">
                <X />
              </button>
            </header>

            <p style={{ fontSize: "12px", color: "var(--muted)", lineHeight: "1.6", margin: "14px 0" }}>
              Are you sure you want to delete message &ldquo;<strong>{deletingItem.subject}</strong>&rdquo; from <strong>{deletingItem.studentName || deletingItem.studentEmail}</strong>? This action cannot be undone.
            </p>

            <footer>
              <button type="button" onClick={() => setDeletingItem(null)}>
                Keep message
              </button>
              <button type="submit" disabled={isPending} style={{ background: "var(--badge-red-text)", color: "#fff" }}>
                <Trash2 size={13} />
                {isPending ? "Deleting..." : "Yes, delete message"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
