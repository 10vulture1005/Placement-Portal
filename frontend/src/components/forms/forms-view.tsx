"use client";

import {
  Calendar,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileBadge,
  FileCheck2,
  FileText,
  MapPin,
  Plus,
  ShieldAlert,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { useState, useTransition } from "react";
import { cancelNocRequestAction, submitNocRequest } from "@/app/forms/actions";

const downloads = [
  {
    name: "Placement Policy 2026–27",
    size: "Official PDF",
    url: "/documents/placement-policy-2026-27.pdf",
    filename: "placement-policy-2026-27.pdf",
  },
  {
    name: "Student Resume Template",
    size: "Template Guide PDF",
    url: "/documents/student-resume-template.pdf",
    filename: "student-resume-template.pdf",
  },
  {
    name: "Internship Undertaking Form",
    size: "Official Form PDF",
    url: "/documents/internship-undertaking-form.pdf",
    filename: "internship-undertaking-form.pdf",
  },
];

export type LocalNoc = {
  id: string;
  company: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  startDate: string;
  endDate: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | string;
  message?: string | null;
  documentUrl?: string | null;
  createdAt?: string;
};

export function FormsView({ initialNocs = [] }: { initialNocs?: LocalNoc[] }) {
  const [tab, setTab] = useState("guidelines");
  const [modal, setModal] = useState(false);
  const [viewingNoc, setViewingNoc] = useState<LocalNoc | null>(null);
  const [previewDocUrl, setPreviewDocUrl] = useState<{ url: string; title: string } | null>(null);
  const [cancellingNoc, setCancellingNoc] = useState<LocalNoc | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAction(formData: FormData) {
    setFormError(null);
    setActionSuccess(null);
    startTransition(async () => {
      const result = await submitNocRequest(formData);
      if (!result?.error) {
        setModal(false);
        setFormError(null);
        setActionSuccess("NOC request submitted successfully.");
      } else {
        setFormError(result.error);
      }
    });
  }

  function handleCancelSubmit(formData: FormData) {
    setFormError(null);
    setActionSuccess(null);
    startTransition(async () => {
      const result = await cancelNocRequestAction(formData);
      if (!result?.error) {
        setCancellingNoc(null);
        setActionSuccess("NOC request cancelled successfully.");
      } else {
        setFormError(result.error);
      }
    });
  }

  function openModal() {
    setFormError(null);
    setActionSuccess(null);
    setModal(true);
  }

  function closeModal() {
    setFormError(null);
    setModal(false);
  }

  return (
    <div className="module-page">
      <section className="page-heading">
        <div>
          <span className="eyebrow">Resources</span>
          <h1>Forms & documents</h1>
          <p>Placement guidelines, NOC requests, and official downloads.</p>
        </div>
      </section>

      {actionSuccess && (
        <div className="save-message" style={{ marginBottom: "16px" }}>
          <CheckCircle2 size={16} />
          {actionSuccess}
        </div>
      )}

      <div className="tabs">
        {[
          ["guidelines", "T&P guidelines"],
          ["noc", `NOC requests (${initialNocs.length})`],
          ["downloads", "Downloads"],
        ].map(([id, label]) => (
          <button
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
            key={id}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "guidelines" && (
        <section className="guidelines">
          <div className="notice">
            <ShieldAlert />
            <div>
              <strong>Read before applying</strong>
              <p>Participation in placement activities indicates acceptance of the institute placement policy.</p>
            </div>
          </div>
          <h2>Student placement guidelines</h2>
          <ol>
            <li>Keep your academic and contact information accurate at all times.</li>
            <li>Apply only after reviewing the complete role description and eligibility criteria.</li>
            <li>Attendance in registered tests and interviews is mandatory unless formally excused.</li>
            <li>Misrepresentation of academic or personal information may result in a placement ban.</li>
            <li>Communicate with recruiters only through the designated placement coordinators.</li>
            <li>Report off-campus offers to the Training & Placement Cell promptly.</li>
          </ol>
        </section>
      )}

      {tab === "noc" && (
        <section className="noc-section">
          <div className="notice warning">
            <ShieldAlert />
            <div>
              <strong>Important academic notice</strong>
              <p>
                An NOC grants permission for training but does not waive attendance, credits, examinations, or other academic requirements.
              </p>
            </div>
          </div>

          <div className="section-action">
            <div>
              <h2>Your NOC requests</h2>
            </div>
            <button onClick={openModal}>
              <Plus />
              Request NOC
            </button>
          </div>

          {initialNocs.length ? (
            <div className="simple-table" style={{ marginTop: "14px" }}>
              <div>
                <b>Company & location</b>
                <b>Training period</b>
                <b>Status</b>
                <b>Actions</b>
              </div>
              {initialNocs.map((noc) => {
                const isPendingReview = noc.status === "PENDING";
                const isApproved = noc.status === "APPROVED";
                const isRejected = noc.status === "REJECTED";

                return (
                  <div key={noc.id} style={{ gridTemplateColumns: "1.4fr 1.1fr 0.8fr 1.1fr" }}>
                    <div>
                      <strong style={{ color: "var(--ink)", display: "block" }}>{noc.company}</strong>
                      <small style={{ color: "var(--muted)", fontSize: "10px" }}>
                        {[noc.city, noc.state].filter(Boolean).join(", ") || "Location specified in request"}
                      </small>
                    </div>

                    <div>
                      <span style={{ display: "block", fontWeight: 600 }}>
                        {new Date(noc.startDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })} –{" "}
                        {new Date(noc.endDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>

                    <div>
                      {isPendingReview && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "3px 8px",
                            borderRadius: "9999px",
                            fontSize: "9px",
                            fontWeight: 800,
                            background: "var(--badge-orange-bg)",
                            color: "var(--badge-orange-text)",
                          }}
                        >
                          <Clock3 size={11} /> Pending
                        </span>
                      )}
                      {isApproved && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "3px 8px",
                            borderRadius: "9999px",
                            fontSize: "9px",
                            fontWeight: 800,
                            background: "var(--badge-green-bg)",
                            color: "var(--badge-green-text)",
                          }}
                        >
                          <CheckCircle2 size={11} /> Approved
                        </span>
                      )}
                      {isRejected && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "3px 8px",
                            borderRadius: "9999px",
                            fontSize: "9px",
                            fontWeight: 800,
                            background: "var(--badge-red-bg)",
                            color: "var(--badge-red-text)",
                          }}
                        >
                          <XCircle size={11} /> Rejected
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={() => setViewingNoc(noc)}
                        title="View request details"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          color: "var(--blue)",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          background: "var(--surface-alt)",
                          fontSize: "11px",
                        }}
                      >
                        <Eye size={13} />
                        Details
                      </button>

                      {isApproved && noc.documentUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewDocUrl({ url: noc.documentUrl!, title: `NOC - ${noc.company}` })}
                          title="View certificate"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            color: "var(--green)",
                            padding: "4px 8px",
                            borderRadius: "6px",
                            background: "var(--badge-green-bg)",
                            fontSize: "11px",
                          }}
                        >
                          <FileCheck2 size={13} />
                          Certificate
                        </button>
                      )}

                      {isPendingReview && (
                        <button
                          type="button"
                          onClick={() => setCancellingNoc(noc)}
                          title="Cancel request"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            color: "var(--badge-red-text)",
                            padding: "4px 8px",
                            borderRadius: "6px",
                            background: "var(--badge-red-bg)",
                            fontSize: "11px",
                          }}
                        >
                          <Trash2 size={13} />
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty">
              <FileBadge />
              <h3>No NOC requests</h3>
              <p>You have not made any NOC requests.</p>
            </div>
          )}
        </section>
      )}

      {tab === "downloads" && (
        <section className="downloads">
          <h2>Official documents</h2>
          {downloads.map((file) => (
            <article key={file.name}>
              <FileText />
              <div>
                <strong>{file.name}</strong>
                <span>PDF · {file.size}</span>
              </div>
              <a
                href={file.url}
                download={file.filename}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download />
                Download
              </a>
            </article>
          ))}
        </section>
      )}

      {/* New NOC Modal */}
      {modal && (
        <div className="modal-backdrop">
          <form className="modal" action={handleAction}>
            <header>
              <div>
                <span className="eyebrow">New request</span>
                <h2>Request an NOC</h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close modal"
              >
                <X />
              </button>
            </header>
            <div className="form-grid">
              {formError && (
                <div
                  style={{
                    color: "var(--badge-red-text)",
                    background: "var(--badge-red-bg)",
                    border: "1px solid var(--badge-red-text)",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    fontSize: "11px",
                    fontWeight: 600,
                    gridColumn: "1 / -1",
                  }}
                >
                  {formError}
                </div>
              )}
              <label>
                Company name
                <input name="company" required minLength={2} placeholder="e.g. Google India" />
              </label>
              <label>
                City
                <input name="city" required minLength={2} placeholder="e.g. Bengaluru" />
              </label>
              <label className="wide">
                Company address
                <input name="address" required minLength={2} placeholder="Complete office / facility address" />
              </label>
              <label>
                Start date
                <input name="startDate" required type="date" />
              </label>
              <label>
                End date
                <input name="endDate" required type="date" />
              </label>
              <label>
                State
                <input name="state" required minLength={2} placeholder="e.g. Karnataka" />
              </label>
              <label>
                Pincode
                <input name="pincode" required pattern="[0-9]{6}" title="6-digit pincode" placeholder="6-digit postal code" />
              </label>
              <label className="wide">
                Remarks / Purpose (optional)
                <textarea
                  name="message"
                  rows={3}
                  placeholder="Provide context on the training offer, department, or special schedule requirements..."
                />
              </label>
            </div>
            <footer>
              <button type="button" onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" disabled={isPending}>
                <FileBadge />
                {isPending ? "Submitting..." : "Submit request"}
              </button>
            </footer>
          </form>
        </div>
      )}

      {/* View NOC Details Modal */}
      {viewingNoc && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: "600px" }}>
            <header>
              <div>
                <span className="eyebrow">NOC Details</span>
                <h2>{viewingNoc.company}</h2>
              </div>
              <button
                type="button"
                onClick={() => setViewingNoc(null)}
                aria-label="Close details"
              >
                <X />
              </button>
            </header>

            <div style={{ display: "grid", gap: "14px", fontSize: "12px", color: "var(--ink)", margin: "16px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "var(--surface-alt)", borderRadius: "10px", border: "1px solid var(--border)" }}>
                <span style={{ fontWeight: 600, color: "var(--muted)" }}>Status</span>
                <span style={{ fontWeight: 800 }}>{viewingNoc.status}</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ background: "var(--surface-alt)", padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--border)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--muted)", fontSize: "10px", textTransform: "uppercase", fontWeight: 700 }}>
                    <Calendar size={12} /> Start date
                  </span>
                  <strong style={{ display: "block", marginTop: "4px" }}>
                    {new Date(viewingNoc.startDate).toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })}
                  </strong>
                </div>

                <div style={{ background: "var(--surface-alt)", padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--border)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--muted)", fontSize: "10px", textTransform: "uppercase", fontWeight: 700 }}>
                    <Calendar size={12} /> End date
                  </span>
                  <strong style={{ display: "block", marginTop: "4px" }}>
                    {new Date(viewingNoc.endDate).toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })}
                  </strong>
                </div>
              </div>

              <div style={{ background: "var(--surface-alt)", padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--border)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--muted)", fontSize: "10px", textTransform: "uppercase", fontWeight: 700 }}>
                  <MapPin size={12} /> Company Address
                </span>
                <p style={{ margin: "4px 0 0", lineHeight: "1.5" }}>
                  {viewingNoc.address || "Address not provided"}<br />
                  {[viewingNoc.city, viewingNoc.state, viewingNoc.pincode].filter(Boolean).join(", ")}
                </p>
              </div>

              {viewingNoc.message && (
                <div style={{ background: "var(--surface-alt)", padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--border)" }}>
                  <span style={{ color: "var(--muted)", fontSize: "10px", textTransform: "uppercase", fontWeight: 700 }}>
                    Student remarks / notes
                  </span>
                  <p style={{ margin: "4px 0 0", fontStyle: "italic", lineHeight: "1.5" }}>
                    &ldquo;{viewingNoc.message}&rdquo;
                  </p>
                </div>
              )}

              {viewingNoc.documentUrl && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--badge-green-bg)", border: "1px solid var(--green)", padding: "12px 14px", borderRadius: "10px" }}>
                  <div>
                    <strong style={{ color: "var(--badge-green-text)", fontSize: "12px", display: "block" }}>Signed NOC Certificate Available</strong>
                    <small style={{ color: "var(--muted)", fontSize: "10px" }}>Approved by Placement Cell</small>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewDocUrl({ url: viewingNoc.documentUrl!, title: `NOC - ${viewingNoc.company}` });
                    }}
                    style={{
                      background: "var(--green)",
                      color: "#fff",
                      border: 0,
                      padding: "7px 12px",
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
              <button type="button" onClick={() => setViewingNoc(null)}>
                Close
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Cancel Request Dialog */}
      {cancellingNoc && (
        <div className="modal-backdrop">
          <form className="modal" style={{ maxWidth: "460px" }} action={handleCancelSubmit}>
            <input type="hidden" name="nocId" value={cancellingNoc.id} />
            <header>
              <div>
                <span className="eyebrow" style={{ color: "var(--badge-red-text)" }}>Cancel request</span>
                <h2>Cancel NOC Request?</h2>
              </div>
              <button type="button" onClick={() => setCancellingNoc(null)} aria-label="Close">
                <X />
              </button>
            </header>
            <p style={{ fontSize: "12px", color: "var(--muted)", lineHeight: "1.6", margin: "14px 0" }}>
              Are you sure you want to cancel your NOC request for <strong>{cancellingNoc.company}</strong>? This action cannot be undone.
            </p>
            {formError && (
              <div style={{ color: "var(--badge-red-text)", background: "var(--badge-red-bg)", border: "1px solid var(--badge-red-text)", padding: "8px 12px", borderRadius: "8px", fontSize: "11px", marginBottom: "12px" }}>
                {formError}
              </div>
            )}
            <footer>
              <button type="button" onClick={() => setCancellingNoc(null)}>
                Keep request
              </button>
              <button type="submit" disabled={isPending} style={{ background: "var(--badge-red-text)", color: "#fff" }}>
                <Trash2 size={13} />
                {isPending ? "Cancelling..." : "Yes, cancel request"}
              </button>
            </footer>
          </form>
        </div>
      )}

      {/* PDF Document Preview Modal */}
      {previewDocUrl && (
        <div className="modal-backdrop">
          <div className="modal doc-preview-modal">
            <div className="preview-header">
              <h2>{previewDocUrl.title}</h2>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <a
                  href={previewDocUrl.url}
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
                  onClick={() => setPreviewDocUrl(null)}
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
                src={previewDocUrl.url}
                title={previewDocUrl.title}
                style={{ width: "100%", height: "100%", border: "none" }}
              />
            </div>
            <footer>
              <button type="button" onClick={() => setPreviewDocUrl(null)}>
                Close preview
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

