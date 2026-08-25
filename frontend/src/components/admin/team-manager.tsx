"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Building2,
  Edit3,
  GraduationCap,
  Info,
  Mail,
  Phone,
  Plus,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import type { Role } from "@prisma/client";
import {
  createTeamMemberAction,
  deleteTeamMemberAction,
  reorderTeamMembersAction,
  updateDefaultPermissionsAction,
  updateTeamMemberAction,
  type TeamActionResult,
} from "@/app/admin/team/actions";
import {
  PERMISSION_DEFINITIONS,
  ROLE_METADATA,
} from "@/lib/permissions";

export type AdminTeamMemberItem = {
  id: string;
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
  photoUrl: string | null;
  displayOrder: number;
  userId?: string | null;
  hasUserAccount: boolean;
  userRole?: string | null;
  userActive?: boolean | null;
  userCustomPermissions: string[];
};

export type AdminUserLookup = {
  id: string;
  name: string | null;
  email: string | null;
  role: Role;
  customPermissions: string[];
};

export function TeamManager({
  members,
  defaultPermissions,
  allUsers = [],
}: {
  members: AdminTeamMemberItem[];
  defaultPermissions: string[];
  allUsers?: AdminUserLookup[];
}) {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [tabFilter, setTabFilter] = useState<"ALL" | "FACULTY" | "COORDINATORS" | "LINKED">("ALL");

  const [result, setResult] = useState<TeamActionResult>({});
  const [saving, setSaving] = useState(false);

  // Modals state
  const [addingMember, setAddingMember] = useState(false);
  const [editingMember, setEditingMember] = useState<AdminTeamMemberItem | null>(null);
  const [deletingMember, setDeletingMember] = useState<AdminTeamMemberItem | null>(null);

  // Default permissions modal state
  const [configuringPermissions, setConfiguringPermissions] = useState(false);
  const [selectedDefaultPerms, setSelectedDefaultPerms] = useState<string[]>(defaultPermissions);
  const [syncExisting, setSyncExisting] = useState(false);

  // Form states
  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPhotoUrl, setFormPhotoUrl] = useState("");
  const [formDisplayOrder, setFormDisplayOrder] = useState(0);

  // Metrics
  const metrics = useMemo(() => {
    const total = members.length;
    const coordinators = members.filter((m) =>
      m.role.toLowerCase().includes("coordinator") || m.role.toLowerCase().includes("student")
    ).length;
    const faculty = total - coordinators;
    const linked = members.filter((m) => m.hasUserAccount).length;
    return { total, faculty, coordinators, linked };
  }, [members]);

  // Filtered members
  const filteredMembers = useMemo(() => {
    return members
      .filter((m) => {
        if (tabFilter === "COORDINATORS") {
          return (
            m.role.toLowerCase().includes("coordinator") ||
            m.role.toLowerCase().includes("student")
          );
        }
        if (tabFilter === "FACULTY") {
          return (
            !m.role.toLowerCase().includes("coordinator") &&
            !m.role.toLowerCase().includes("student")
          );
        }
        if (tabFilter === "LINKED") {
          return m.hasUserAccount;
        }
        return true;
      })
      .filter((m) => {
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return (
          m.name.toLowerCase().includes(q) ||
          m.role.toLowerCase().includes(q) ||
          (m.email && m.email.toLowerCase().includes(q)) ||
          (m.phone && m.phone.toLowerCase().includes(q))
        );
      });
  }, [members, tabFilter, query]);

  // Open add modal
  function openAddModal() {
    setFormName("");
    setFormRole("");
    setFormEmail("");
    setFormPhone("");
    setFormPhotoUrl("");
    const maxOrder = members.reduce((max, m) => Math.max(max, m.displayOrder), 0);
    setFormDisplayOrder(maxOrder + 1);
    setAddingMember(true);
    setResult({});
  }

  // Open edit modal
  function openEditModal(m: AdminTeamMemberItem) {
    setFormName(m.name);
    setFormRole(m.role);
    setFormEmail(m.email || "");
    setFormPhone(m.phone || "");
    setFormPhotoUrl(m.photoUrl || "");
    setFormDisplayOrder(m.displayOrder);
    setEditingMember(m);
    setResult({});
  }

  // Open permissions config modal
  function openPermissionsModal() {
    setSelectedDefaultPerms([...defaultPermissions]);
    setSyncExisting(false);
    setConfiguringPermissions(true);
    setResult({});
  }

  // Handle Add Submit
  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setResult({});

    const formData = new FormData();
    formData.append("name", formName);
    formData.append("role", formRole);
    formData.append("email", formEmail);
    formData.append("phone", formPhone);
    formData.append("photoUrl", formPhotoUrl);
    formData.append("displayOrder", String(formDisplayOrder));

    const res = await createTeamMemberAction(formData);
    setSaving(false);
    setResult(res);
    if (res.success) {
      setAddingMember(false);
      router.refresh();
    }
  }

  // Handle Edit Submit
  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMember) return;
    setSaving(true);
    setResult({});

    const formData = new FormData();
    formData.append("id", editingMember.id);
    formData.append("name", formName);
    formData.append("role", formRole);
    formData.append("email", formEmail);
    formData.append("phone", formPhone);
    formData.append("photoUrl", formPhotoUrl);
    formData.append("displayOrder", String(formDisplayOrder));

    const res = await updateTeamMemberAction(formData);
    setSaving(false);
    setResult(res);
    if (res.success) {
      setEditingMember(null);
      router.refresh();
    }
  }

  // Handle Delete Submit
  async function handleDeleteSubmit() {
    if (!deletingMember) return;
    setSaving(true);
    setResult({});

    const formData = new FormData();
    formData.append("id", deletingMember.id);

    const res = await deleteTeamMemberAction(formData);
    setSaving(false);
    setResult(res);
    if (res.success) {
      setDeletingMember(null);
      router.refresh();
    }
  }

  // Handle Default Permissions Save
  async function handleSaveDefaultPermissions() {
    setSaving(true);
    setResult({});

    const res = await updateDefaultPermissionsAction(selectedDefaultPerms, syncExisting);
    setSaving(false);
    setResult(res);
    if (res.success) {
      setConfiguringPermissions(false);
      router.refresh();
    }
  }

  // Reorder single member
  async function handleMove(index: number, direction: "UP" | "DOWN") {
    if (direction === "UP" && index === 0) return;
    if (direction === "DOWN" && index === filteredMembers.length - 1) return;

    const targetIndex = direction === "UP" ? index - 1 : index + 1;
    const currentItem = filteredMembers[index];
    const targetItem = filteredMembers[targetIndex];
    if (!currentItem || !targetItem) return;

    const newItems = [
      { id: currentItem.id, displayOrder: targetItem.displayOrder },
      { id: targetItem.id, displayOrder: currentItem.displayOrder },
    ];

    setSaving(true);
    const res = await reorderTeamMembersAction(newItems);
    setSaving(false);
    if (res.success) {
      router.refresh();
    } else {
      setResult(res);
    }
  }

  // Group permissions by category for modal
  const permissionsByCategory = useMemo(() => {
    const map = new Map<string, typeof PERMISSION_DEFINITIONS>();
    for (const def of PERMISSION_DEFINITIONS) {
      const list = map.get(def.category) || [];
      list.push(def);
      map.set(def.category, list);
    }
    return Array.from(map.entries());
  }, []);

  return (
    <div className="admin-page">
      {/* Top Heading */}
      <section className="admin-heading">
        <div>
          <span className="eyebrow">Placement Cell &amp; Structure</span>
          <h1>Placement Team Directory &amp; Permissions</h1>
          <p>
            Manage the official placement team members, student coordinators, and configure automatic default RBAC permissions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openPermissionsModal}
            className="admin-icon-link !w-auto !h-auto px-3.5 py-2 text-xs font-bold gap-2 text-white bg-[var(--surface-alt)] hover:bg-[var(--surface-highlight)] border border-[var(--border)] rounded-xl flex items-center shadow-sm"
          >
            <ShieldCheck size={16} className="text-[var(--orange)]" />
            <span>Default Permissions</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[var(--surface)] text-[var(--ink)] font-extrabold border border-[var(--border)]">
              {defaultPermissions.length}
            </span>
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="admin-icon-link !w-auto !h-auto px-4 py-2 text-xs font-bold gap-2 text-white bg-[var(--blue)] hover:bg-[var(--navy)] rounded-xl flex items-center shadow-sm"
          >
            <Plus size={16} />
            <span>Add Team Member</span>
          </button>
        </div>
      </section>

      {/* Action status message */}
      {result.error && (
        <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-medium flex items-center justify-between">
          <span>{result.error}</span>
          <button onClick={() => setResult({})} className="text-red-600 hover:text-red-800">
            <X size={14} />
          </button>
        </div>
      )}
      {result.success && (
        <div className="p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium flex items-center justify-between">
          <span>{result.success}</span>
          <button onClick={() => setResult({})} className="text-emerald-700 hover:text-emerald-900">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Metrics Banner */}
      <section className="admin-metrics">
        <article>
          <div className="metric-icon">
            <Users />
          </div>
          <div>
            <small>Total Team Members</small>
            <strong>{metrics.total}</strong>
            <b>Active in public portal</b>
          </div>
        </article>

        <article>
          <div className="metric-icon violet">
            <Building2 />
          </div>
          <div>
            <small>Faculty &amp; Officers</small>
            <strong>{metrics.faculty}</strong>
            <b>Leadership &amp; administration</b>
          </div>
        </article>

        <article>
          <div className="metric-icon">
            <GraduationCap />
          </div>
          <div>
            <small>Student Coordinators</small>
            <strong>{metrics.coordinators}</strong>
            <b>Drive &amp; event volunteers</b>
          </div>
        </article>

        <article>
          <div className="metric-icon green">
            <UserCheck />
          </div>
          <div>
            <small>Linked User Accounts</small>
            <strong>{metrics.linked}</strong>
            <b>Automated RBAC active</b>
          </div>
        </article>
      </section>

      {/* Filter and Search Bar */}
      <section className="admin-controls-card p-3 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] mb-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1 w-full md:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setTabFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              tabFilter === "ALL"
                ? "bg-[var(--navy)] text-white"
                : "bg-[var(--surface-alt)] text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            All Members ({members.length})
          </button>
          <button
            type="button"
            onClick={() => setTabFilter("FACULTY")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              tabFilter === "FACULTY"
                ? "bg-[var(--navy)] text-white"
                : "bg-[var(--surface-alt)] text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            Faculty &amp; Officers ({metrics.faculty})
          </button>
          <button
            type="button"
            onClick={() => setTabFilter("COORDINATORS")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              tabFilter === "COORDINATORS"
                ? "bg-[var(--navy)] text-white"
                : "bg-[var(--surface-alt)] text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            Student Coordinators ({metrics.coordinators})
          </button>
          <button
            type="button"
            onClick={() => setTabFilter("LINKED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              tabFilter === "LINKED"
                ? "bg-[var(--navy)] text-white"
                : "bg-[var(--surface-alt)] text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            Linked Accounts ({metrics.linked})
          </button>
        </div>

        <div className="relative w-full md:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, role, email, phone..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] text-[var(--ink)] focus:outline-none focus:border-[var(--blue)]"
          />
        </div>
      </section>

      {/* Team Member Table & Cards */}
      <section className="admin-card overflow-hidden">
        {filteredMembers.length === 0 ? (
          <div className="py-12 text-center text-[var(--muted)]">
            <Users size={36} className="mx-auto mb-2 opacity-40" />
            <p className="font-semibold text-sm">No placement team members found.</p>
            <p className="text-xs mt-1">
              {query ? "Try adjusting your search query." : "Click 'Add Team Member' above to create one."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-alt)] text-[var(--muted)]">
                  <th className="py-3 px-3 w-14 text-center">Order</th>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Role / Designation</th>
                  <th className="py-3 px-4">Contact Details</th>
                  <th className="py-3 px-4">User Account &amp; RBAC</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredMembers.map((member, index) => {
                  const initials = member.name
                    .split(" ")
                    .map((s) => s[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase() || "TM";

                  const isCoordinator =
                    member.role.toLowerCase().includes("coordinator") ||
                    member.role.toLowerCase().includes("student");

                  return (
                    <tr key={member.id} className="hover:bg-[var(--surface-alt)]/50 transition-colors">
                      {/* Order & Reorder arrows */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-mono text-xs font-bold text-[var(--muted)] w-5">
                            {member.displayOrder}
                          </span>
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              disabled={saving || index === 0}
                              onClick={() => handleMove(index, "UP")}
                              title="Move Up"
                              className="p-0.5 rounded hover:bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--ink)] disabled:opacity-20"
                            >
                              <ArrowUp size={11} />
                            </button>
                            <button
                              type="button"
                              disabled={saving || index === filteredMembers.length - 1}
                              onClick={() => handleMove(index, "DOWN")}
                              title="Move Down"
                              className="p-0.5 rounded hover:bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--ink)] disabled:opacity-20"
                            >
                              <ArrowDown size={11} />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Member Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {member.photoUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={member.photoUrl}
                              alt={member.name}
                              className="w-9 h-9 rounded-full object-cover border border-[var(--border)]"
                            />
                          ) : (
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                                isCoordinator
                                  ? "bg-[var(--blue)]/15 text-[var(--blue)]"
                                  : "bg-[var(--orange)]/15 text-[var(--orange)]"
                              }`}
                            >
                              {initials}
                            </div>
                          )}
                          <div>
                            <strong className="block text-sm text-[var(--ink)] font-bold">
                              {member.name}
                            </strong>
                            <span className="text-[10px] text-[var(--muted)]">
                              ID: {member.id.startsWith("cuid_") ? member.id.slice(0, 10) + "..." : member.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role / Designation */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            isCoordinator
                              ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                              : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {member.role}
                        </span>
                      </td>

                      {/* Contact Details */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5 text-xs">
                          {member.email ? (
                            <a
                              href={`mailto:${member.email}`}
                              className="flex items-center gap-1.5 text-[var(--blue)] hover:underline font-medium"
                            >
                              <Mail size={12} />
                              <span>{member.email}</span>
                            </a>
                          ) : (
                            <span className="text-[var(--muted)] italic text-[11px]">No email specified</span>
                          )}
                          {member.phone && (
                            <a
                              href={`tel:${member.phone}`}
                              className="flex items-center gap-1.5 text-[var(--muted)] hover:text-[var(--ink)] font-mono text-[11px]"
                            >
                              <Phone size={11} />
                              <span>{member.phone}</span>
                            </a>
                          )}
                        </div>
                      </td>

                      {/* User Account & RBAC Status */}
                      <td className="py-3 px-4">
                        {member.hasUserAccount ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`cell-status ${
                                  ROLE_METADATA[member.userRole as Role]?.badgeClass || "badge-student"
                                }`}
                              >
                                {member.userRole || "STUDENT"}
                              </span>
                              {member.userActive === false && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/15 text-red-600">
                                  Suspended
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-[var(--muted)] font-medium">
                                {member.userCustomPermissions.length} custom perms
                              </span>
                              <Link
                                href={`/admin/users?query=${encodeURIComponent(member.email || "")}`}
                                className="text-[10px] text-[var(--blue)] font-bold hover:underline"
                              >
                                Edit in RBAC →
                              </Link>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--surface-alt)] text-[var(--muted)] border border-[var(--border)]">
                              Not signed in yet
                            </span>
                            <small className="block text-[10px] text-[var(--muted)] mt-0.5">
                              Perms auto-apply on login
                            </small>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(member)}
                            className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--blue)] hover:bg-[var(--surface-alt)] transition-colors"
                            title="Edit Member"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeletingMember(member);
                              setResult({});
                            }}
                            className="p-1.5 rounded-lg text-[var(--muted)] hover:text-red-600 hover:bg-red-500/10 transition-colors"
                            title="Remove Member"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Configure Default Placement Team Permissions          */}
      {/* ------------------------------------------------------------- */}
      {configuringPermissions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-alt)]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[var(--blue)]/15 text-[var(--blue)] flex items-center justify-center">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[var(--ink)]">
                    Default Placement Team Permissions
                  </h3>
                  <p className="text-[11px] text-[var(--muted)]">
                    Set permissions automatically granted when a user is added to the placement team.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfiguringPermissions(false)}
                className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--ink)]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content / Permissions Matrix */}
            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              {/* Informational Callout */}
              <div className="p-3 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] flex gap-2.5 items-start">
                <Info size={16} className="text-[var(--blue)] shrink-0 mt-0.5" />
                <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                  When a user is added to the Placement Team, these default permissions are automatically granted to their account.
                  If removed, these permissions are automatically revoked. An administrator can still adjust or override any user&apos;s
                  permissions manually in <strong className="text-[var(--ink)]">User Management</strong>.
                </p>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--border)]">
                <span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">
                  Presets:
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedDefaultPerms([
                        "companies:read",
                        "jobs:read",
                        "jobs:manage",
                        "applications:read",
                        "applications:manage",
                        "students:read",
                        "announcements:manage",
                        "analytics:view",
                      ])
                    }
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[var(--surface-alt)] hover:bg-[var(--surface)] text-[var(--ink)] border border-[var(--border)]"
                  >
                    Coordinator Defaults
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedDefaultPerms(
                        PERMISSION_DEFINITIONS.map((p) => p.key)
                      )
                    }
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[var(--surface-alt)] hover:bg-[var(--surface)] text-[var(--ink)] border border-[var(--border)]"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDefaultPerms([])}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[var(--surface-alt)] hover:bg-[var(--surface)] text-[var(--muted)] hover:text-red-500 border border-[var(--border)]"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Permissions Categories */}
              <div className="space-y-4">
                {permissionsByCategory.map(([category, perms]) => (
                  <div key={category} className="space-y-2">
                    <h4 className="font-bold text-[11px] text-[var(--ink)] uppercase tracking-wider">
                      {category}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {perms.map((perm) => {
                        const isChecked = selectedDefaultPerms.includes(perm.key);
                        return (
                          <label
                            key={perm.key}
                            className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                              isChecked
                                ? "bg-[var(--blue)]/10 border-[var(--blue)]/40 text-[var(--ink)]"
                                : "bg-[var(--surface-alt)] border-[var(--border)] text-[var(--muted)] hover:border-[var(--border)] hover:bg-[var(--surface)]"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedDefaultPerms([...selectedDefaultPerms, perm.key]);
                                } else {
                                  setSelectedDefaultPerms(
                                    selectedDefaultPerms.filter((k) => k !== perm.key)
                                  );
                                }
                              }}
                              className="mt-0.5 rounded text-[var(--blue)] focus:ring-0"
                            />
                            <div className="space-y-0.5">
                              <strong className="block text-xs font-semibold text-[var(--ink)]">
                                {perm.label}
                              </strong>
                              <p className="text-[10px] text-[var(--muted)] leading-tight">
                                {perm.description}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Batch sync toggle */}
              <div className="pt-3 border-t border-[var(--border)]">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={syncExisting}
                    onChange={(e) => setSyncExisting(e.target.checked)}
                    className="rounded text-[var(--blue)] focus:ring-0"
                  />
                  <div>
                    <span className="font-bold text-xs text-[var(--ink)] block">
                      Apply and synchronize to all current placement team members now
                    </span>
                    <span className="text-[10px] text-[var(--muted)]">
                      Updates the user accounts of all existing team members with this permission set.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-alt)] flex items-center justify-between">
              <span className="text-xs text-[var(--muted)] font-medium">
                {selectedDefaultPerms.length} permissions selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfiguringPermissions(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-[var(--surface)] text-[var(--ink)] border border-[var(--border)] hover:bg-[var(--surface-highlight)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveDefaultPermissions}
                  className="px-4 py-1.5 text-xs font-bold rounded-xl bg-[var(--blue)] text-white hover:bg-[var(--navy)] disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  {saving ? "Saving..." : "Save Default Permissions"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Add / Edit Team Member                                */}
      {/* ------------------------------------------------------------- */}
      {(addingMember || editingMember) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-alt)]">
              <h3 className="font-bold text-sm text-[var(--ink)] flex items-center gap-2">
                {addingMember ? <UserPlus size={16} /> : <Edit3 size={16} />}
                <span>{addingMember ? "Add Placement Team Member" : "Edit Team Member"}</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setAddingMember(false);
                  setEditingMember(null);
                }}
                className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--ink)]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={addingMember ? handleAddSubmit : handleEditSubmit} className="p-4 space-y-3.5 text-xs">
              {/* Name */}
              <div>
                <label className="block font-bold text-[var(--ink)] mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Dr. Rajesh Kumar or Aarav Sharma"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] text-[var(--ink)] focus:outline-none focus:border-[var(--blue)]"
                />
              </div>

              {/* Role / Designation */}
              <div>
                <label className="block font-bold text-[var(--ink)] mb-1">
                  Role / Designation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  placeholder="e.g. Student Placement Coordinator (Lead) or Faculty In-charge"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] text-[var(--ink)] focus:outline-none focus:border-[var(--blue)]"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {[
                    "Faculty In-charge, Training & Placement",
                    "Placement Officer",
                    "Student Placement Coordinator (Lead)",
                    "Student Placement Coordinator (Internships)",
                    "Student Placement Coordinator",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setFormRole(preset)}
                      className="px-2 py-0.5 text-[10px] rounded-md bg-[var(--surface-alt)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--border)]"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block font-bold text-[var(--ink)] mb-1">
                  Institute Email Address
                </label>
                <input
                  type="email"
                  list="registered-users-list"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="e.g. student@iiitl.ac.in or officer@iiitl.ac.in"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] text-[var(--ink)] focus:outline-none focus:border-[var(--blue)]"
                />
                <datalist id="registered-users-list">
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.email || ""}>
                      {u.name ? `${u.name} (${u.role})` : u.role}
                    </option>
                  ))}
                </datalist>
                <p className="text-[10px] text-[var(--muted)] mt-1 flex items-center gap-1">
                  <Shield size={11} className="text-[var(--blue)]" />
                  Linking a user email will automatically assign the default placement team permissions to their account.
                </p>
              </div>

              {/* Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[var(--ink)] mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] text-[var(--ink)] focus:outline-none focus:border-[var(--blue)]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[var(--ink)] mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formDisplayOrder}
                    onChange={(e) => setFormDisplayOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] text-[var(--ink)] focus:outline-none focus:border-[var(--blue)]"
                  />
                </div>
              </div>

              {/* Photo URL */}
              <div>
                <label className="block font-bold text-[var(--ink)] mb-1">
                  Photo URL (Optional)
                </label>
                <input
                  type="url"
                  value={formPhotoUrl}
                  onChange={(e) => setFormPhotoUrl(e.target.value)}
                  placeholder="https://... (Leave blank for automatic initials avatar)"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] text-[var(--ink)] focus:outline-none focus:border-[var(--blue)]"
                />
              </div>

              {/* Footer Buttons */}
              <div className="pt-3 border-t border-[var(--border)] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAddingMember(false);
                    setEditingMember(null);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-[var(--surface-alt)] text-[var(--ink)] border border-[var(--border)] hover:bg-[var(--surface)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-[var(--blue)] text-white hover:bg-[var(--navy)] disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  {saving ? "Saving..." : addingMember ? "Add Team Member" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Delete Confirmation                                   */}
      {/* ------------------------------------------------------------- */}
      {deletingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[var(--ink)]">Remove Team Member?</h3>
                <p className="text-[11px] text-[var(--muted)]">
                  Are you sure you want to remove <strong>{deletingMember.name}</strong> from the placement team?
                </p>
              </div>
            </div>

            {deletingMember.email && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-[11px] flex gap-2 items-start">
                <ShieldAlert size={15} className="shrink-0 mt-0.5" />
                <p>
                  Removing this member will also automatically revoke the placement team&apos;s default permissions from their user account (
                  <code>{deletingMember.email}</code>).
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingMember(null)}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-[var(--surface-alt)] text-[var(--ink)] border border-[var(--border)] hover:bg-[var(--surface)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleDeleteSubmit}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 shadow-sm"
              >
                {saving ? "Removing..." : "Confirm Removal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
