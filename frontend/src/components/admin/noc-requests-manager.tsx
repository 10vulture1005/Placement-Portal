"use client";

import {
  Calendar,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileCheck2,
  FileText,
  FileUp,
  MapPin,
  Search,
  Upload,
  User,
  X,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  approveNocAction,
  rejectNocAction,
  uploadNocDocumentAction,
  type NocActionResult,
} from "@/app/admin/noc-requests/actions";

export type AdminNocItem = {
  id: string;
  userId: string;
  studentName: string | null;
  studentEmail: string | null;
  rollNumber: string | null;
  branch: string | null;
  batch: number | null;
  cgpa: number | null;
  contactNumber: string | null;
  company: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  startDate: string;
  endDate: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | string;
  message: string | null;
  documentUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export function NocRequestsManager({
  nocRequests,
}: {
  nocRequests: AdminNocItem[];
  canPersist?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");

  const [detailItem, setDetailItem] = useState<AdminNocItem | null>(null);
  const [approvingItem, setApprovingItem] = useState<AdminNocItem | null>(null);
  const [rejectingItem, setRejectingItem] = useState<AdminNocItem | null>(null);
  const [uploadingItem, setUploadingItem] = useState<AdminNocItem | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);

  const [result, setResult] = useState<NocActionResult>({});
  const [isPending, startTransition] = useTransition();

  const metrics = useMemo(() => {
    const total = nocRequests.length;
    const pending = nocRequests.filter((n) => n.status === "PENDING").length;
    const approved = nocRequests.filter((n) => n.status === "APPROVED").length;
    const rejected = nocRequests.filter((n) => n.status === "REJECTED").length;
    return { total, pending, approved, rejected };
  }, [nocRequests]);

  const visible = useMemo(() => {
    return nocRequests.filter((item) => {
      const matchesSearch =
        `${item.studentName ?? ""} ${item.rollNumber ?? ""} ${item.studentEmail ?? ""} ${item.company} ${item.city} ${item.state} ${item.message ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase());

      const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [nocRequests, query, statusFilter]);

  function handleApprove(formData: FormData) {
    setResult({});
    startTransition(async () => {
      // Check if a file was selected
      const file = formData.get("certificateFile") as File | null;
      let docUrl = formData.get("documentUrl") as string | null;

      if (file && file.size > 0) {
        const uploadFormData = new FormData();
        uploadFormData.append("file", file);
        uploadFormData.append("nocId", approvingItem!.id);
        const uploadRes = await uploadNocDocumentAction(uploadFormData);
        if (uploadRes.error) {
          setResult({ error: uploadRes.error });
          return;
        }
        if (uploadRes.url) {
          docUrl = uploadRes.url;
        }
      }

      const approveFormData = new FormData();
      approveFormData.append("nocId", approvingItem!.id);
      if (formData.get("message")) {
        approveFormData.append("message", formData.get("message") as string);
      }
      if (docUrl) {
        approveFormData.append("documentUrl", docUrl);
      }

      const res = await approveNocAction(approveFormData);
      setResult(res);
      if (res.success) {
        setApprovingItem(null);
        router.refresh();
      }
    });
  }

  function handleReject(formData: FormData) {
    setResult({});
    startTransition(async () => {
      const res = await rejectNocAction(formData);
      setResult(res);
      if (res.success) {
        setRejectingItem(null);
        router.refresh();
      }
    });
  }

  function handleUploadDoc(formData: FormData) {
    setResult({});
    startTransition(async () => {
      const uploadRes = await uploadNocDocumentAction(formData);
      if (uploadRes.error) {
        setResult({ error: uploadRes.error });
      } else {
        setResult({ success: "Signed NOC certificate uploaded successfully." });
        setUploadingItem(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="admin-page">
      <section className="admin-heading">
        <div>
          <span className="eyebrow">Management</span>
          <h1>NOC Requests</h1>
          <p>Review, approve, or reject student internship and off-campus training NOC requests.</p>
        </div>
      </section>

      {/* Metrics Grid */}
      <section className="admin-metrics">
        <article>
          <div className="metric-icon violet">
            <FileText size={20} />
          </div>
          <div>
            <small>Total Requests</small>
            <strong>{metrics.total}</strong>
            <b>All-time student submissions</b>
          </div>
        </article>

        <article>
          <div className="metric-icon" style={{ background: "var(--badge-orange-bg)", color: "var(--badge-orange-text)" }}>
            <Clock3 size={20} />
          </div>
          <div>
            <small>Pending Review</small>
            <strong>{metrics.pending}</strong>
            <b>Awaiting decision</b>
          </div>
        </article>

        <article>
          <div className="metric-icon" style={{ background: "var(--badge-green-bg)", color: "var(--badge-green-text)" }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <small>Approved</small>
            <strong>{metrics.approved}</strong>
            <b>Certificates issued</b>
          </div>
        </article>

        <article>
          <div className="metric-icon" style={{ background: "var(--badge-red-bg)", color: "var(--badge-red-text)" }}>
            <XCircle size={20} />
          </div>
          <div>
            <small>Rejected</small>
            <strong>{metrics.rejected}</strong>
            <b>Ineligible / declined</b>
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
            placeholder="Search by student name, roll number, email, company, city..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "ALL" | "PENDING" | "APPROVED" | "REJECTED")}
          aria-label="Filter by status"
        >
          <option value="ALL">All Statuses ({nocRequests.length})</option>
          <option value="PENDING">Pending Review ({metrics.pending})</option>
          <option value="APPROVED">Approved ({metrics.approved})</option>
          <option value="REJECTED">Rejected ({metrics.rejected})</option>
        </select>
      </div>

      {/* Table */}
      <section className="admin-table">
        <div
          className="admin-row admin-row-head"
          style={{ gridTemplateColumns: "1.8fr 1.6fr 1.3fr 1fr 1fr 1.4fr" }}
        >
          <span>Student</span>
          <span>Company & Location</span>
          <span>Training Period</span>
          <span>Status</span>
          <span>Certificate</span>
          <span style={{ textAlign: "right" }}>Actions</span>
        </div>

        {visible.length > 0 ? (
          visible.map((item) => {
            const isPendingStatus = item.status === "PENDING";
            const isApproved = item.status === "APPROVED";
            const isRejected = item.status === "REJECTED";

            return (
              <div
                key={item.id}
                className="admin-row"
                style={{ gridTemplateColumns: "1.8fr 1.6fr 1.3fr 1fr 1fr 1.4fr" }}
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

                {/* Company & Location */}
                <div>
                  <strong style={{ color: "var(--ink)" }}>{item.company}</strong>
                  <small style={{ color: "var(--muted)", display: "block", fontSize: "10px" }}>
                    {[item.city, item.state].filter(Boolean).join(", ")}
                  </small>
                </div>

                {/* Training Period */}
                <div>
                  <span style={{ fontWeight: 600, display: "block" }}>
                    {new Date(item.startDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <small style={{ color: "var(--muted)", fontSize: "10px" }}>
                    to {new Date(item.endDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                  </small>
                </div>

                {/* Status */}
                <div>
                  {isPendingStatus && (
                    <span className="cell-status pending" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <Clock3 size={11} /> Pending
                    </span>
                  )}
                  {isApproved && (
                    <span className="cell-status" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <CheckCircle2 size={11} /> Approved
                    </span>
                  )}
                  {isRejected && (
                    <span
                      className="cell-status"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        background: "var(--badge-red-bg)",
                        color: "var(--badge-red-text)",
                      }}
                    >
                      <XCircle size={11} /> Rejected
                    </span>
                  )}
                </div>

                {/* Certificate */}
                <div>
                  {item.documentUrl ? (
                    <button
                      type="button"
                      onClick={() => setPreviewDoc({ url: item.documentUrl!, title: `NOC - ${item.company} (${item.studentName || item.rollNumber})` })}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        background: "var(--badge-green-bg)",
                        color: "var(--badge-green-text)",
                        border: 0,
                        padding: "4px 8px",
                        borderRadius: "6px",
                        fontSize: "10px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      <FileCheck2 size={12} /> View PDF
                    </button>
                  ) : (
                    <small style={{ color: "var(--muted)", fontSize: "10px" }}>No document</small>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={() => setDetailItem(item)}
                    title="View full request details"
                    style={{
                      border: 0,
                      background: "var(--surface-alt)",
                      color: "var(--blue)",
                      borderRadius: "8px",
                      padding: "6px 9px",
                      fontSize: "11px",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      cursor: "pointer",
                    }}
                  >
                    <Eye size={13} /> Details
                  </button>

                  {isPendingStatus && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setResult({});
                          setApprovingItem(item);
                        }}
                        title="Approve NOC request"
                        style={{
                          border: 0,
                          background: "var(--badge-green-bg)",
                          color: "var(--green)",
                          borderRadius: "8px",
                          padding: "6px 9px",
                          fontSize: "11px",
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          cursor: "pointer",
                        }}
                      >
                        <CheckCircle2 size={13} /> Approve
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setResult({});
                          setRejectingItem(item);
                        }}
                        title="Reject NOC request"
                        style={{
                          border: 0,
                          background: "var(--badge-red-bg)",
                          color: "var(--badge-red-text)",
                          borderRadius: "8px",
                          padding: "6px 9px",
                          fontSize: "11px",
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          cursor: "pointer",
                        }}
                      >
                        <XCircle size={13} /> Reject
                      </button>
                    </>
                  )}

                  {isApproved && (
                    <button
                      type="button"
                      onClick={() => {
                        setResult({});
                        setUploadingItem(item);
                      }}
                      title="Upload/replace certificate PDF"
                      style={{
                        border: 0,
                        background: "var(--surface-alt)",
                        color: "var(--ink)",
                        borderRadius: "8px",
                        padding: "6px 9px",
                        fontSize: "11px",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        cursor: "pointer",
                      }}
                    >
                      <FileUp size={13} /> {item.documentUrl ? "Replace" : "Upload"}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="admin-empty">
            <FileText size={32} />
            <h2>No NOC requests found</h2>
            <p>
              {query
                ? "No student requests match your search filter."
                : "No NOC requests are currently registered in the database."}
            </p>
          </div>
        )}
      </section>

      {/* Details Modal */}
      {detailItem && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: "680px" }}>
            <header>
              <div>
                <span className="eyebrow">Inspection</span>
                <h2>NOC Request Details</h2>
              </div>
              <button type="button" onClick={() => setDetailItem(null)} aria-label="Close">
                <X />
              </button>
            </header>

            <div style={{ display: "grid", gap: "14px", margin: "16px 0", fontSize: "12px", color: "var(--ink)" }}>
              {/* Student info box */}
              <div style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", borderRadius: "12px", padding: "14px" }}>
                <span style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                  <User size={12} /> Student Information
                </span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "8px" }}>
                  <div>
                    <strong style={{ display: "block" }}>{detailItem.studentName || "Name not recorded"}</strong>
                    <small style={{ color: "var(--muted)" }}>{detailItem.studentEmail}</small>
                  </div>
                  <div>
                    <span>Roll: <strong>{detailItem.rollNumber || "N/A"}</strong></span>
                    <span style={{ display: "block" }}>
                      Branch/Batch: <strong>{[detailItem.branch, detailItem.batch].filter(Boolean).join(" - ") || "N/A"}</strong>
                    </span>
                    {detailItem.cgpa !== null && <span>CGPA: <strong>{detailItem.cgpa}</strong></span>}
                  </div>
                </div>
              </div>

              {/* Company & Location info */}
              <div style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", borderRadius: "12px", padding: "14px" }}>
                <span style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                  <MapPin size={12} /> Company & Facility Address
                </span>
                <strong style={{ display: "block", marginTop: "6px", fontSize: "13px" }}>{detailItem.company}</strong>
                <p style={{ margin: "4px 0 0", color: "var(--ink)", lineHeight: "1.5" }}>
                  {detailItem.address}<br />
                  {[detailItem.city, detailItem.state, detailItem.pincode].filter(Boolean).join(", ")}
                </p>
              </div>

              {/* Dates & Status */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", borderRadius: "12px", padding: "12px" }}>
                  <span style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                    <Calendar size={12} /> Training Timeline
                  </span>
                  <strong style={{ display: "block", marginTop: "4px" }}>
                    {new Date(detailItem.startDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })} –{" "}
                    {new Date(detailItem.endDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                  </strong>
                </div>

                <div style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", borderRadius: "12px", padding: "12px" }}>
                  <span style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                    Current Status
                  </span>
                  <strong style={{ display: "block", marginTop: "4px" }}>
                    {detailItem.status}
                  </strong>
                </div>
              </div>

              {/* Student Remarks */}
              {detailItem.message && (
                <div style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", borderRadius: "12px", padding: "12px" }}>
                  <span style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                    Student Remarks / Statement of Purpose
                  </span>
                  <p style={{ margin: "4px 0 0", fontStyle: "italic", lineHeight: "1.5" }}>
                    &ldquo;{detailItem.message}&rdquo;
                  </p>
                </div>
              )}

              {/* Certificate preview button if attached */}
              {detailItem.documentUrl && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--badge-green-bg)", border: "1px solid var(--green)", padding: "12px 14px", borderRadius: "12px" }}>
                  <div>
                    <strong style={{ color: "var(--badge-green-text)", display: "block" }}>Signed Certificate Available</strong>
                    <small style={{ color: "var(--muted)" }}>Click to view or download document</small>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewDoc({ url: detailItem.documentUrl!, title: `NOC - ${detailItem.company}` });
                    }}
                    style={{
                      background: "var(--green)",
                      color: "#fff",
                      border: 0,
                      padding: "8px 14px",
                      borderRadius: "8px",
                      fontSize: "11px",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      cursor: "pointer",
                    }}
                  >
                    <Eye size={13} /> View Certificate
                  </button>
                </div>
              )}
            </div>

            <footer>
              <button type="button" onClick={() => setDetailItem(null)}>
                Close
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {approvingItem && (
        <div className="modal-backdrop">
          <form className="modal" style={{ maxWidth: "540px" }} onSubmit={(e) => { e.preventDefault(); handleApprove(new FormData(e.currentTarget)); }}>
            <input type="hidden" name="nocId" value={approvingItem.id} />
            <header>
              <div>
                <span className="eyebrow" style={{ color: "var(--green)" }}>Decision</span>
                <h2>Approve NOC Request</h2>
              </div>
              <button type="button" onClick={() => setApprovingItem(null)} aria-label="Close">
                <X />
              </button>
            </header>

            <p style={{ fontSize: "12px", color: "var(--muted)", margin: "10px 0" }}>
              Approving NOC for <strong>{approvingItem.studentName || approvingItem.rollNumber}</strong> at <strong>{approvingItem.company}</strong>.
            </p>

            <div style={{ display: "grid", gap: "12px", margin: "14px 0" }}>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--ink)", display: "grid", gap: "4px" }}>
                Approval remarks / notes (optional)
                <textarea
                  name="message"
                  rows={3}
                  placeholder="e.g. Approved subject to maintaining minimum academic attendance..."
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    padding: "8px 12px",
                    background: "var(--input-bg)",
                    color: "var(--ink)",
                    fontSize: "12px",
                  }}
                />
              </label>

              <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--ink)", display: "grid", gap: "4px" }}>
                Upload signed NOC Certificate PDF (optional)
                <input
                  type="file"
                  name="certificateFile"
                  accept="application/pdf"
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    padding: "8px",
                    background: "var(--input-bg)",
                    color: "var(--ink)",
                    fontSize: "11px",
                  }}
                />
              </label>
            </div>

            <footer>
              <button type="button" onClick={() => setApprovingItem(null)}>
                Cancel
              </button>
              <button type="submit" disabled={isPending} style={{ background: "var(--green)", color: "#fff" }}>
                <CheckCircle2 size={14} />
                {isPending ? "Approving..." : "Confirm Approval"}
              </button>
            </footer>
          </form>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingItem && (
        <div className="modal-backdrop">
          <form className="modal" style={{ maxWidth: "520px" }} onSubmit={(e) => { e.preventDefault(); handleReject(new FormData(e.currentTarget)); }}>
            <input type="hidden" name="nocId" value={rejectingItem.id} />
            <header>
              <div>
                <span className="eyebrow" style={{ color: "var(--badge-red-text)" }}>Decision</span>
                <h2>Reject NOC Request</h2>
              </div>
              <button type="button" onClick={() => setRejectingItem(null)} aria-label="Close">
                <X />
              </button>
            </header>

            <p style={{ fontSize: "12px", color: "var(--muted)", margin: "10px 0" }}>
              State the reason for rejecting the NOC request for <strong>{rejectingItem.studentName || rejectingItem.rollNumber}</strong>. The student will receive this in their notification.
            </p>

            <div style={{ margin: "14px 0" }}>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--ink)", display: "grid", gap: "4px" }}>
                Rejection reason (required)
                <textarea
                  name="message"
                  required
                  minLength={2}
                  rows={4}
                  placeholder="e.g. Schedule conflicts with core curriculum; unaccredited off-campus entity; active placement ban..."
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    padding: "8px 12px",
                    background: "var(--input-bg)",
                    color: "var(--ink)",
                    fontSize: "12px",
                  }}
                />
              </label>
            </div>

            <footer>
              <button type="button" onClick={() => setRejectingItem(null)}>
                Cancel
              </button>
              <button type="submit" disabled={isPending} style={{ background: "var(--badge-red-text)", color: "#fff" }}>
                <XCircle size={14} />
                {isPending ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </footer>
          </form>
        </div>
      )}

      {/* Direct Upload Document Modal */}
      {uploadingItem && (
        <div className="modal-backdrop">
          <form className="modal" style={{ maxWidth: "480px" }} onSubmit={(e) => { e.preventDefault(); handleUploadDoc(new FormData(e.currentTarget)); }}>
            <input type="hidden" name="nocId" value={uploadingItem.id} />
            <header>
              <div>
                <span className="eyebrow">Certificate</span>
                <h2>Upload Signed NOC PDF</h2>
              </div>
              <button type="button" onClick={() => setUploadingItem(null)} aria-label="Close">
                <X />
              </button>
            </header>

            <p style={{ fontSize: "12px", color: "var(--muted)", margin: "10px 0" }}>
              Upload signed certificate PDF for <strong>{uploadingItem.studentName || uploadingItem.rollNumber}</strong> ({uploadingItem.company}).
            </p>

            <div style={{ margin: "14px 0" }}>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--ink)", display: "grid", gap: "4px" }}>
                Signed PDF file (max 10MB)
                <input
                  type="file"
                  name="file"
                  required
                  accept="application/pdf"
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    padding: "8px",
                    background: "var(--input-bg)",
                    color: "var(--ink)",
                    fontSize: "11px",
                  }}
                />
              </label>
            </div>

            <footer>
              <button type="button" onClick={() => setUploadingItem(null)}>
                Cancel
              </button>
              <button type="submit" disabled={isPending} style={{ background: "var(--navy)", color: "#fff" }}>
                <Upload size={14} />
                {isPending ? "Uploading..." : "Upload Certificate"}
              </button>
            </footer>
          </form>
        </div>
      )}

      {/* PDF Document Preview Modal */}
      {previewDoc && (
        <div className="modal-backdrop">
          <div className="modal doc-preview-modal">
            <div className="preview-header">
              <h2>{previewDoc.title}</h2>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <a
                  href={previewDoc.url}
                  download="noc-certificate.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="primary-link"
                  style={{ padding: "6px 12px", fontSize: "11px", borderRadius: "8px" }}
                >
                  <Download size={13} /> Download
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  style={{
                    border: 0,
                    background: "var(--surface-alt)",
                    color: "var(--muted)",
                    borderRadius: "8px",
                    padding: "6px",
                    cursor: "pointer",
                  }}
                  aria-label="Close preview"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="preview-frame-container">
              <iframe
                src={previewDoc.url}
                title={previewDoc.title}
                style={{ width: "100%", height: "100%", border: "none" }}
              />
            </div>
            <footer>
              <button type="button" onClick={() => setPreviewDoc(null)}>
                Close preview
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
