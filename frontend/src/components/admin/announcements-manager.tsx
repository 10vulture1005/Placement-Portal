"use client";

import {
  BellRing,
  Building2,
  Calendar,
  Edit3,
  Eye,
  Megaphone,
  Plus,
  Search,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  deleteAnnouncementAction,
  saveAnnouncementAction,
  type AnnouncementActionResult,
} from "@/app/admin/announcements/actions";

export type AdminAnnouncementItem = {
  id: string;
  title: string;
  content: string;
  category: "COMPANY_EVENT" | "GENERAL";
  tags: string[];
  companyId: string | null;
  companyName: string | null;
  companyLogoUrl: string | null;
  createdAt: string;
  createdByName: string | null;
  createdByEmail: string | null;
};

export type CompanyOption = {
  id: string;
  name: string;
};

const PRESET_TAGS = [
  "Shortlist",
  "Interview",
  "Assessment",
  "Drive",
  "PPT",
  "Results",
  "Registration",
  "Policy",
  "Urgent",
];

export function AnnouncementsManager({
  announcements,
  companies,
  canPersist,
}: {
  announcements: AdminAnnouncementItem[];
  companies: CompanyOption[];
  canPersist: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | "COMPANY_EVENT" | "GENERAL">("ALL");
  const [companyFilter, setCompanyFilter] = useState<string>("ALL");
  const [editing, setEditing] = useState<AdminAnnouncementItem | null | undefined>(undefined);
  const [previewing, setPreviewing] = useState<AdminAnnouncementItem | null>(null);
  const [deleting, setDeleting] = useState<AdminAnnouncementItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<AnnouncementActionResult>({});

  // Modal form internal state
  const [formCategory, setFormCategory] = useState<"COMPANY_EVENT" | "GENERAL">("GENERAL");
  const [formTags, setFormTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState("");

  const visible = useMemo(() => {
    return announcements.filter((item) => {
      const matchesSearch =
        `${item.title} ${item.content} ${item.companyName ?? ""} ${item.tags.join(" ")} ${item.createdByName ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase());
      const matchesCat =
        categoryFilter === "ALL" || item.category === categoryFilter;
      const matchesComp =
        companyFilter === "ALL" || item.companyId === companyFilter;
      return matchesSearch && matchesCat && matchesComp;
    });
  }, [announcements, query, categoryFilter, companyFilter]);

  // Metrics computation
  const metrics = useMemo(() => {
    const total = announcements.length;
    const companyEvents = announcements.filter((a) => a.category === "COMPANY_EVENT").length;
    const general = announcements.filter((a) => a.category === "GENERAL").length;
    return { total, companyEvents, general };
  }, [announcements]);

  function openCreateModal() {
    setResult({});
    setFormCategory("GENERAL");
    setFormTags([]);
    setCustomTagInput("");
    setEditing(null);
  }

  function openEditModal(item: AdminAnnouncementItem) {
    setResult({});
    setFormCategory(item.category);
    setFormTags([...item.tags]);
    setCustomTagInput("");
    setEditing(item);
  }

  function togglePresetTag(tag: string) {
    setFormTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function addCustomTag() {
    const trimmed = customTagInput.trim();
    if (trimmed && !formTags.includes(trimmed)) {
      setFormTags((prev) => [...prev, trimmed]);
      setCustomTagInput("");
    }
  }

  function removeTag(tagToRemove: string) {
    setFormTags((prev) => prev.filter((t) => t !== tagToRemove));
  }

  async function submitForm(formData: FormData) {
    setSaving(true);
    formData.set("tags", JSON.stringify(formTags));
    formData.set("category", formCategory);
    const nextResult = await saveAnnouncementAction(formData);
    setResult(nextResult);
    setSaving(false);
    if (nextResult.success) {
      setEditing(undefined);
      router.refresh();
    }
  }

  async function handleRemove(formData: FormData) {
    setSaving(true);
    const nextResult = await deleteAnnouncementAction(formData);
    setResult(nextResult);
    setSaving(false);
    setDeleting(null);
    if (nextResult.success) {
      router.refresh();
    }
  }

  return (
    <div className="admin-page">
      <section className="admin-heading">
        <div>
          <span className="eyebrow">Communications & Drives</span>
          <h1>Announcements</h1>
          <p>
            Publish recruitment updates, shortlists, test schedules, and placement guidelines.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          disabled={!canPersist}
          title={!canPersist ? "Administrator permission required" : "Publish new announcement"}
        >
          <Plus />
          New announcement
        </button>
      </section>

      {result.success ? <div className="admin-success">{result.success}</div> : null}
      {result.error ? <div className="admin-error">{result.error}</div> : null}

      {/* Metrics Banner */}
      <section className="admin-metrics">
        <article>
          <div className="metric-icon blue">
            <Megaphone />
          </div>
          <div>
            <small>Total Announcements</small>
            <strong>{metrics.total}</strong>
            <b>Active placement communications</b>
          </div>
        </article>

        <article>
          <div className="metric-icon orange">
            <Building2 />
          </div>
          <div>
            <small>Company Drives</small>
            <strong>{metrics.companyEvents}</strong>
            <b style={{ color: "var(--orange)" }}>Hiring updates & shortlists</b>
          </div>
        </article>

        <article>
          <div className="metric-icon violet">
            <BellRing />
          </div>
          <div>
            <small>General Notices</small>
            <strong>{metrics.general}</strong>
            <b style={{ color: "var(--badge-purple-text)" }}>Policy & campus updates</b>
          </div>
        </article>
      </section>

      {/* Toolbar & Filters */}
      <section className="admin-toolbar" style={{ marginTop: 20 }}>
        <label>
          <Search />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, content, company, or tags…"
          />
        </label>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as "ALL" | "COMPANY_EVENT" | "GENERAL")}
          aria-label="Filter by category"
        >
          <option value="ALL">All Categories</option>
          <option value="COMPANY_EVENT">Company Events</option>
          <option value="GENERAL">General Updates</option>
        </select>

        {companies.length > 0 ? (
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            aria-label="Filter by company"
          >
            <option value="ALL">All Companies</option>
            {companies.map((comp) => (
              <option value={comp.id} key={comp.id}>
                {comp.name}
              </option>
            ))}
          </select>
        ) : null}
      </section>

      {/* Announcements Table */}
      <section className="admin-table" style={{ marginTop: 14 }}>
        <div
          className="admin-row admin-row-head"
          style={{ gridTemplateColumns: "1.6fr 1fr 1fr 1fr 100px" }}
        >
          <span>Title & Overview</span>
          <span>Category & Target</span>
          <span>Tags</span>
          <span>Author & Published</span>
          <span style={{ textAlign: "right" }}>Actions</span>
        </div>

        {visible.map((item) => (
          <div
            className="admin-row"
            key={item.id}
            style={{ gridTemplateColumns: "1.6fr 1fr 1fr 1fr 100px" }}
          >
            {/* Title & Preview */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background:
                    item.category === "COMPANY_EVENT"
                      ? "var(--badge-blue-bg)"
                      : "var(--badge-purple-bg)",
                  color:
                    item.category === "COMPANY_EVENT"
                      ? "var(--blue)"
                      : "var(--badge-purple-text)",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                {item.category === "COMPANY_EVENT" ? <Building2 size={16} /> : <Megaphone size={16} />}
              </div>
              <div style={{ minWidth: 0 }}>
                <strong
                  style={{
                    color: "var(--ink)",
                    fontSize: 12,
                    fontWeight: 700,
                    display: "block",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={item.title}
                >
                  {item.title}
                </strong>
                <p
                  style={{
                    color: "var(--muted)",
                    fontSize: 11,
                    margin: "2px 0 0",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: 320,
                  }}
                >
                  {item.content}
                </p>
              </div>
            </div>

            {/* Category & Company */}
            <div>
              <span
                className={`cell-status ${
                  item.category === "COMPANY_EVENT" ? "" : "development"
                }`}
                style={{
                  fontSize: 9.5,
                  padding: "3px 8px",
                  borderRadius: 6,
                  fontWeight: 700,
                }}
              >
                {item.category === "COMPANY_EVENT" ? "Company Event" : "General Update"}
              </span>
              {item.companyName ? (
                <small
                  style={{
                    display: "block",
                    color: "var(--ink)",
                    fontWeight: 600,
                    marginTop: 4,
                  }}
                >
                  {item.companyName}
                </small>
              ) : null}
            </div>

            {/* Tags */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {item.tags.length > 0 ? (
                item.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: 9,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: "var(--surface-alt)",
                      border: "1px solid var(--border)",
                      color: "var(--ink)",
                      fontWeight: 600,
                    }}
                  >
                    {tag}
                  </span>
                ))
              ) : (
                <small style={{ color: "var(--muted)" }}>No tags</small>
              )}
              {item.tags.length > 3 ? (
                <span
                  style={{
                    fontSize: 9,
                    padding: "2px 5px",
                    borderRadius: 4,
                    background: "var(--surface-highlight)",
                    color: "var(--muted)",
                    fontWeight: 700,
                  }}
                >
                  +{item.tags.length - 3}
                </span>
              ) : null}
            </div>

            {/* Author & Date */}
            <div>
              <span style={{ fontWeight: 600, color: "var(--ink)", display: "block" }}>
                {item.createdByName || item.createdByEmail || "Placement Cell"}
              </span>
              <small style={{ color: "var(--muted)", fontSize: 10 }}>
                {new Intl.DateTimeFormat("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }).format(new Date(item.createdAt))}
              </small>
            </div>

            {/* Actions */}
            <div className="row-actions" style={{ justifyContent: "flex-end" }}>
              <button
                title="Preview announcement"
                onClick={() => setPreviewing(item)}
                type="button"
              >
                <Eye />
              </button>
              <button
                title="Edit announcement"
                onClick={() => openEditModal(item)}
                type="button"
              >
                <Edit3 />
              </button>
              <button
                title="Delete announcement"
                onClick={() => setDeleting(item)}
                type="button"
              >
                <Trash2 />
              </button>
            </div>
          </div>
        ))}

        {!visible.length ? (
          <div className="admin-empty">
            <Megaphone />
            <h2>{announcements.length ? "No matching announcements" : "No announcements published yet"}</h2>
            <p>
              {announcements.length
                ? "Try clearing filters or refining your search term."
                : "Use 'New announcement' above to post the first campus placement update."}
            </p>
          </div>
        ) : null}
      </section>

      {/* CREATE / EDIT MODAL */}
      {editing !== undefined ? (
        <div className="modal-backdrop">
          <form
            key={editing?.id ?? "create"}
            className="modal"
            action={submitForm}
            style={{ width: "min(720px, 100%)" }}
          >
            <header>
              <div>
                <span className="eyebrow">Announcement Record</span>
                <h2>{editing ? "Edit announcement" : "Create announcement"}</h2>
              </div>
              <button
                type="button"
                onClick={() => setEditing(undefined)}
                aria-label="Close dialog"
              >
                <X />
              </button>
            </header>

            <input type="hidden" name="id" value={editing?.id ?? ""} />

            <div className="form-grid">
              {/* Title */}
              <label className="wide">
                Announcement Title *
                <input
                  name="title"
                  required
                  minLength={2}
                  maxLength={200}
                  defaultValue={editing?.title ?? ""}
                  placeholder="e.g., Google Technical Assessment Shortlist & Schedule"
                />
              </label>

              {/* Category Segmented Selector */}
              <div className="wide">
                <span
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--ink)",
                    marginBottom: 6,
                  }}
                >
                  Category *
                </span>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setFormCategory("GENERAL")}
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1px solid",
                      borderColor:
                        formCategory === "GENERAL" ? "var(--blue)" : "var(--border)",
                      background:
                        formCategory === "GENERAL"
                          ? "var(--surface-highlight)"
                          : "var(--surface-alt)",
                      color: formCategory === "GENERAL" ? "var(--ink)" : "var(--muted)",
                      fontWeight: formCategory === "GENERAL" ? 700 : 500,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      fontSize: 12,
                    }}
                  >
                    <Megaphone size={16} />
                    General Update
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormCategory("COMPANY_EVENT")}
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1px solid",
                      borderColor:
                        formCategory === "COMPANY_EVENT" ? "var(--blue)" : "var(--border)",
                      background:
                        formCategory === "COMPANY_EVENT"
                          ? "var(--surface-highlight)"
                          : "var(--surface-alt)",
                      color:
                        formCategory === "COMPANY_EVENT" ? "var(--ink)" : "var(--muted)",
                      fontWeight: formCategory === "COMPANY_EVENT" ? 700 : 500,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      fontSize: 12,
                    }}
                  >
                    <Building2 size={16} />
                    Company Drive / Event
                  </button>
                </div>
              </div>

              {/* Associated Company (when category is Company Event) */}
              {formCategory === "COMPANY_EVENT" ? (
                <label className="wide">
                  Associated Company
                  <select
                    name="companyId"
                    defaultValue={editing?.companyId ?? ""}
                  >
                    <option value="">-- Select Recruiting Company (Optional) --</option>
                    {companies.map((comp) => (
                      <option value={comp.id} key={comp.id}>
                        {comp.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {/* Tags Selector & Custom Tag Input */}
              <div className="wide">
                <span
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--ink)",
                    marginBottom: 6,
                  }}
                >
                  Tags & Badges
                </span>

                {/* Preset Suggestions */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  {PRESET_TAGS.map((tag) => {
                    const isSelected = formTags.includes(tag);
                    return (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => togglePresetTag(tag)}
                        style={{
                          fontSize: 10,
                          fontWeight: isSelected ? 700 : 500,
                          padding: "4px 9px",
                          borderRadius: 9999,
                          border: "1px solid",
                          borderColor: isSelected ? "var(--blue)" : "var(--border)",
                          background: isSelected ? "var(--badge-blue-bg)" : "var(--card-bg)",
                          color: isSelected ? "var(--blue)" : "var(--muted)",
                          cursor: "pointer",
                        }}
                      >
                        {isSelected ? "✓ " : "+ "}
                        {tag}
                      </button>
                    );
                  })}
                </div>

                {/* Active Selected Tags Display */}
                {formTags.length > 0 ? (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      padding: "8px 10px",
                      background: "var(--surface-alt)",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      marginBottom: 8,
                    }}
                  >
                    {formTags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 6,
                          background: "var(--card-bg)",
                          border: "1px solid var(--border)",
                          color: "var(--ink)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          style={{
                            border: 0,
                            background: "transparent",
                            cursor: "pointer",
                            color: "var(--muted)",
                            padding: 0,
                            lineHeight: 1,
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}

                {/* Custom tag adder */}
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomTag();
                      }
                    }}
                    placeholder="Add custom tag (press Enter or Add)..."
                    style={{ fontSize: 11 }}
                  />
                  <button
                    type="button"
                    onClick={addCustomTag}
                    style={{
                      padding: "0 14px",
                      fontSize: 11,
                      fontWeight: 700,
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: "var(--surface-alt)",
                      color: "var(--ink)",
                      cursor: "pointer",
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Content / Body */}
              <label className="wide">
                Announcement Content *
                <textarea
                  name="content"
                  required
                  rows={8}
                  minLength={2}
                  maxLength={10000}
                  defaultValue={editing?.content ?? ""}
                  placeholder="Enter the full announcement details, test links, shortlist instructions, eligibility criteria, etc."
                />
              </label>
            </div>

            <footer>
              <button type="button" onClick={() => setEditing(undefined)}>
                Cancel
              </button>
              <button type="submit" disabled={saving}>
                {saving ? "Publishing…" : editing ? "Save changes" : "Publish announcement"}
              </button>
            </footer>
          </form>
        </div>
      ) : null}

      {/* DETAIL PREVIEW MODAL */}
      {previewing ? (
        <div className="modal-backdrop">
          <div className="modal" style={{ width: "min(680px, 100%)" }}>
            <header>
              <div>
                <span className="eyebrow">
                  {previewing.category === "COMPANY_EVENT"
                    ? "Company Drive Announcement"
                    : "General Notice"}
                </span>
                <h2>{previewing.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setPreviewing(null)}
                aria-label="Close dialog"
              >
                <X />
              </button>
            </header>

            <div style={{ padding: "16px 0", display: "grid", gap: 16 }}>
              {/* Metadata Banner */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  background: "var(--surface-alt)",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  fontSize: 11,
                }}
              >
                {previewing.companyName ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--ink)" }}>
                    <Building2 size={14} color="var(--blue)" />
                    <strong>{previewing.companyName}</strong>
                  </div>
                ) : null}

                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted)" }}>
                  <Calendar size={14} />
                  <span>
                    {new Intl.DateTimeFormat("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(previewing.createdAt))}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted)" }}>
                  <User size={14} />
                  <span>{previewing.createdByName || previewing.createdByEmail || "Placement Cell"}</span>
                </div>
              </div>

              {/* Tags */}
              {previewing.tags.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {previewing.tags.map((tag) => (
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

              {/* Body text with whitespace preservation */}
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
                {previewing.content}
              </div>
            </div>

            <footer>
              <button
                type="button"
                onClick={() => {
                  const toEdit = previewing;
                  setPreviewing(null);
                  openEditModal(toEdit);
                }}
              >
                Edit
              </button>
              <button type="button" onClick={() => setPreviewing(null)}>
                Done
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      {/* DELETE CONFIRMATION MODAL */}
      {deleting ? (
        <div className="modal-backdrop">
          <form className="modal" action={handleRemove} style={{ width: "min(460px, 100%)" }}>
            <header>
              <div>
                <span className="eyebrow" style={{ color: "var(--badge-red-text)" }}>
                  Confirm Deletion
                </span>
                <h2>Delete Announcement</h2>
              </div>
              <button
                type="button"
                onClick={() => setDeleting(null)}
                aria-label="Close dialog"
              >
                <X />
              </button>
            </header>

            <input type="hidden" name="announcementId" value={deleting.id} />

            <div style={{ padding: "14px 0", fontSize: 12, color: "var(--ink)", lineHeight: 1.5 }}>
              Are you sure you want to delete <strong>&ldquo;{deleting.title}&rdquo;</strong>?
              <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: 11 }}>
                This action cannot be undone. The announcement will be immediately removed from student dashboards.
              </p>
            </div>

            <footer>
              <button type="button" onClick={() => setDeleting(null)}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  background: "var(--badge-red-text)",
                  color: "#fff",
                  border: 0,
                  fontWeight: 700,
                }}
              >
                {saving ? "Deleting…" : "Delete announcement"}
              </button>
            </footer>
          </form>
        </div>
      ) : null}
    </div>
  );
}
