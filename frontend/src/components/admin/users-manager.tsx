"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Edit3,
  KeyRound,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  UserX,
  X,
} from "lucide-react";
import type { Role } from "@prisma/client";
import {
  createUserAction,
  deleteUserAction,
  updateUserDetailsAction,
  updateUserPermissionsAction,
  updateUserRoleAction,
  updateUserStatusAction,
  type UserActionResult,
} from "@/app/admin/users/actions";
import {
  PERMISSION_DEFINITIONS,
  ROLE_DEFAULT_PERMISSIONS,
  ROLE_METADATA,
  type PermissionKey,
} from "@/lib/permissions";

export type AdminUserListItem = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: Role;
  title: string | null;
  isActive: boolean;
  rollNumber: string | null;
  branch: string | null;
  batch: number | null;
  customPermissions: string[];
  effectivePermissions: string[];
  applicationCount: number;
  createdAt: string;
};

export function UsersManager({
  users,
  currentUserId,
}: {
  users: AdminUserListItem[];
  currentUserId: string;
}) {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const [result, setResult] = useState<UserActionResult>({});
  const [saving, setSaving] = useState(false);

  // Modals state
  const [addingUser, setAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserListItem | null>(null);
  const [roleModalUser, setRoleModalUser] = useState<AdminUserListItem | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role>("STUDENT");
  const [selectedTitle, setSelectedTitle] = useState("");

  const [permModalUser, setPermModalUser] = useState<AdminUserListItem | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<string[]>([]);

  const [deletingUser, setDeletingUser] = useState<AdminUserListItem | null>(null);

  // Metrics
  const stats = useMemo(() => {
    let superAdmins = 0;
    let admins = 0;
    let officers = 0;
    let coordinators = 0;
    let students = 0;
    let inactive = 0;

    for (const u of users) {
      if (!u.isActive) inactive++;
      if (u.role === "SUPER_ADMIN") superAdmins++;
      else if (u.role === "ADMIN") admins++;
      else if (u.role === "OFFICER") officers++;
      else if (u.role === "COORDINATOR") coordinators++;
      else students++;
    }

    return {
      total: users.length,
      admins: superAdmins + admins,
      officers,
      coordinators,
      students,
      inactive,
    };
  }, [users]);

  // Filtered visible list
  const visible = useMemo(() => {
    return users.filter((u) => {
      const matchQuery =
        !query ||
        `${u.name ?? ""} ${u.email ?? ""} ${u.rollNumber ?? ""} ${u.title ?? ""} ${u.branch ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase());

      const matchRole =
        roleFilter === "ALL" || u.role === (roleFilter as Role);

      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && u.isActive) ||
        (statusFilter === "INACTIVE" && !u.isActive);

      return matchQuery && matchRole && matchStatus;
    });
  }, [users, query, roleFilter, statusFilter]);

  // Permission Categories
  const categories = useMemo(() => {
    const map = new Map<string, typeof PERMISSION_DEFINITIONS>();
    for (const def of PERMISSION_DEFINITIONS) {
      if (!map.has(def.category)) {
        map.set(def.category, []);
      }
      map.get(def.category)!.push(def);
    }
    return Array.from(map.entries());
  }, []);

  // Handlers
  async function handleCreateUser(formData: FormData) {
    setSaving(true);
    const res = await createUserAction(formData);
    setResult(res);
    setSaving(false);
    if (res.success) {
      setAddingUser(false);
      router.refresh();
    }
  }

  async function handleUpdateRole(formData: FormData) {
    setSaving(true);
    const res = await updateUserRoleAction(formData);
    setResult(res);
    setSaving(false);
    if (res.success) {
      setRoleModalUser(null);
      router.refresh();
    }
  }

  async function handleUpdatePermissions() {
    if (!permModalUser) return;
    setSaving(true);
    const res = await updateUserPermissionsAction(permModalUser.id, editingPermissions);
    setResult(res);
    setSaving(false);
    if (res.success) {
      setPermModalUser(null);
      router.refresh();
    }
  }

  async function handleUpdateDetails(formData: FormData) {
    setSaving(true);
    const res = await updateUserDetailsAction(formData);
    setResult(res);
    setSaving(false);
    if (res.success) {
      setEditingUser(null);
      router.refresh();
    }
  }

  async function handleToggleStatus(user: AdminUserListItem) {
    const res = await updateUserStatusAction(user.id, !user.isActive);
    setResult(res);
    if (res.success) {
      router.refresh();
    }
  }

  async function handleDeleteUser(formData: FormData) {
    setSaving(true);
    const res = await deleteUserAction(formData);
    setResult(res);
    setSaving(false);
    if (res.success) {
      setDeletingUser(null);
      router.refresh();
    }
  }

  function openRoleModal(user: AdminUserListItem) {
    setRoleModalUser(user);
    setSelectedRole(user.role);
    setSelectedTitle(user.title ?? "");
    setResult({});
  }

  function openPermModal(user: AdminUserListItem) {
    setPermModalUser(user);
    setEditingPermissions([...user.customPermissions]);
    setResult({});
  }

  function togglePermissionOverride(permKey: PermissionKey, defaultInRole: boolean) {
    setEditingPermissions((current) => {
      const isExplicitlyGranted = current.includes(permKey);
      const isExplicitlyRevoked = current.includes(`-${permKey}`);

      if (defaultInRole) {
        // Default is granted in role: toggle between neutral (inherited granted) and explicitly revoked (-permKey)
        if (isExplicitlyRevoked) {
          return current.filter((p) => p !== `-${permKey}`);
        } else {
          return [...current.filter((p) => p !== permKey), `-${permKey}`];
        }
      } else {
        // Default is not in role: toggle between neutral (not granted) and explicitly granted (+permKey)
        if (isExplicitlyGranted) {
          return current.filter((p) => p !== permKey);
        } else {
          return [...current.filter((p) => p !== `-${permKey}`), permKey];
        }
      }
    });
  }

  function getAvatarInitials(name: string | null, email: string | null) {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (email) return email.slice(0, 2).toUpperCase();
    return "U";
  }

  return (
    <div className="admin-page">
      {/* Heading */}
      <section className="admin-heading">
        <div>
          <span className="eyebrow">Access Control & Directory</span>
          <h1>User Management & RBAC</h1>
          <p>
            Configure user roles, elevate permissions, customize per-user access rights, and manage accounts.
          </p>
        </div>
        <button
          onClick={() => {
            setResult({});
            setAddingUser(true);
          }}
        >
          <UserPlus size={16} />
          Add / Provision User
        </button>
      </section>

      {/* Action Results */}
      {result.success && <div className="admin-success">{result.success}</div>}
      {result.error && <div className="admin-error">{result.error}</div>}

      {/* Summary Metrics */}
      <section className="admin-metrics">
        <article>
          <div className="metric-icon">
            <Users />
          </div>
          <div>
            <small>Total Users</small>
            <strong>{stats.total}</strong>
            <b>Active directory accounts</b>
          </div>
        </article>

        <article>
          <div className="metric-icon violet">
            <ShieldCheck />
          </div>
          <div>
            <small>Administrators</small>
            <strong>{stats.admins}</strong>
            <b>Super & domain admins</b>
          </div>
        </article>

        <article>
          <div className="metric-icon">
            <UserCheck />
          </div>
          <div>
            <small>Officers & Coordinators</small>
            <strong>{stats.officers + stats.coordinators}</strong>
            <b>{stats.officers} staff · {stats.coordinators} coordinators</b>
          </div>
        </article>

        <article>
          <div className="metric-icon">
            <UserX />
          </div>
          <div>
            <small>Students & Suspended</small>
            <strong>{stats.students}</strong>
            <b>{stats.inactive} suspended account(s)</b>
          </div>
        </article>
      </section>

      {/* Search & Filter Toolbar */}
      <section className="admin-toolbar">
        <label>
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, roll number, title, or branch"
          />
        </label>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          aria-label="Filter by role"
        >
          <option value="ALL">All Roles ({users.length})</option>
          <option value="SUPER_ADMIN">Super Admins</option>
          <option value="ADMIN">Administrators</option>
          <option value="OFFICER">Placement Officers</option>
          <option value="COORDINATOR">Student Coordinators</option>
          <option value="STUDENT">Students</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active Only</option>
          <option value="INACTIVE">Suspended Only</option>
        </select>
      </section>

      {/* Users Table */}
      <section className="admin-table">
        <div className="admin-row admin-row-head user-row-grid">
          <span>User & Title</span>
          <span>Role & Tier</span>
          <span>Academic Profile</span>
          <span>Permissions</span>
          <span>Status</span>
          <span>Actions</span>
        </div>

        {visible.map((u) => {
          const roleMeta = ROLE_METADATA[u.role] ?? ROLE_METADATA.STUDENT;
          const isSelf = u.id === currentUserId;
          const customCount = u.customPermissions.length;

          return (
            <div className="admin-row user-row-grid" key={u.id}>
              {/* User Name & Email */}
              <div className="company-admin-name">
                <span
                  className={`user-avatar-initials ${roleMeta.badgeClass}`}
                  title={`${roleMeta.label} · Tier ${roleMeta.tier}`}
                >
                  {getAvatarInitials(u.name, u.email)}
                </span>
                <span>
                  <strong>
                    {u.name || "No name registered"}
                    {isSelf && <small className="inline ml-1 text-blue-600 font-bold">(You)</small>}
                  </strong>
                  <small>{u.email || "No email"}</small>
                  {u.title && (
                    <span className="text-[10px] font-semibold text-[var(--navy)] block mt-0.5">
                      {u.title}
                    </span>
                  )}
                </span>
              </div>

              {/* Role Badge */}
              <div>
                <span className={`cell-status ${roleMeta.badgeClass}`}>
                  {roleMeta.label}
                </span>
                <small className="block text-[9.5px] text-[var(--muted)] mt-1">
                  Tier {roleMeta.tier} access
                </small>
              </div>

              {/* Academic Profile */}
              <div>
                <span>{u.rollNumber || "Roll not assigned"}</span>
                <small className="block text-[9.5px] text-[var(--muted)]">
                  {u.branch || "General"}
                  {u.batch ? ` · Batch of ${u.batch}` : ""}
                  {u.applicationCount > 0 ? ` · ${u.applicationCount} apps` : ""}
                </small>
              </div>

              {/* Permissions */}
              <div>
                <button
                  type="button"
                  onClick={() => openPermModal(u)}
                  className="permission-pill hover:border-[var(--blue)] cursor-pointer"
                  title="Click to view & edit granular permissions"
                >
                  <KeyRound size={11} />
                  {customCount > 0 ? (
                    <span className="text-[var(--blue)] font-bold">
                      {customCount} custom override(s)
                    </span>
                  ) : (
                    <span>Role defaults ({u.effectivePermissions.length})</span>
                  )}
                </button>
              </div>

              {/* Status */}
              <div>
                <button
                  type="button"
                  onClick={() => handleToggleStatus(u)}
                  disabled={isSelf && u.isActive}
                  className={`cell-status cursor-pointer ${
                    u.isActive ? "" : "pending"
                  }`}
                  title={
                    isSelf
                      ? "Cannot deactivate your own account"
                      : `Click to ${u.isActive ? "suspend" : "activate"} user`
                  }
                >
                  {u.isActive ? "Active" : "Suspended"}
                </button>
              </div>

              {/* Row Actions */}
              <div className="row-actions">
                <button
                  title={`Change role / Elevate ${u.name || u.email}`}
                  onClick={() => openRoleModal(u)}
                  aria-label="Elevate or change role"
                >
                  <UserCog size={14} />
                </button>

                <button
                  title={`Configure permissions for ${u.name || u.email}`}
                  onClick={() => openPermModal(u)}
                  aria-label="Configure permissions"
                >
                  <KeyRound size={14} />
                </button>

                <button
                  title={`Edit details for ${u.name || u.email}`}
                  onClick={() => {
                    setResult({});
                    setEditingUser(u);
                  }}
                  aria-label="Edit user details"
                >
                  <Edit3 size={14} />
                </button>

                <button
                  title={
                    isSelf
                      ? "Cannot delete your own account"
                      : `Delete user ${u.name || u.email}`
                  }
                  disabled={isSelf}
                  onClick={() => {
                    setResult({});
                    setDeletingUser(u);
                  }}
                  aria-label="Delete user"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}

        {!visible.length && (
          <div className="admin-empty">
            <Users />
            <h2>{users.length ? "No matching users" : "No users found"}</h2>
            <p>
              {users.length
                ? "Try adjusting your search query or role filter."
                : "Users will automatically register upon their first institute Google sign-in."}
            </p>
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Add / Pre-provision User */}
      {/* ------------------------------------------------------------- */}
      {addingUser && (
        <div className="modal-backdrop">
          <form className="modal" action={handleCreateUser}>
            <header>
              <div>
                <span className="eyebrow">Directory Provisioning</span>
                <h2>Add / Provision User Account</h2>
              </div>
              <button
                type="button"
                onClick={() => setAddingUser(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </header>

            <div className="form-grid">
              <label className="wide">
                Email Address *
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="student@iiitl.ac.in or external-admin@example.com"
                />
              </label>

              <label>
                Full Name
                <input name="name" placeholder="Tarun Sharma" />
              </label>

              <label>
                Assigned Role *
                <select name="role" defaultValue="STUDENT">
                  <option value="STUDENT">Student (Standard Applicant)</option>
                  <option value="COORDINATOR">Student Coordinator</option>
                  <option value="OFFICER">Placement Officer</option>
                  <option value="ADMIN">Administrator</option>
                  <option value="SUPER_ADMIN">Super Administrator</option>
                </select>
              </label>

              <label>
                Designation / Title
                <input name="title" placeholder="e.g. Lead Coordinator, Officer" />
              </label>

              <label>
                Roll Number
                <input name="rollNumber" placeholder="e.g. LCI2022001" />
              </label>

              <label>
                Academic Branch
                <input name="branch" placeholder="e.g. Computer Science & AI" />
              </label>

              <label>
                Graduation Batch
                <input
                  name="batch"
                  type="number"
                  min={2000}
                  max={2100}
                  placeholder="2026"
                />
              </label>
            </div>

            <footer>
              <button type="button" onClick={() => setAddingUser(false)}>
                Cancel
              </button>
              <button type="submit" disabled={saving}>
                {saving ? "Provisioning…" : "Provision User"}
              </button>
            </footer>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Elevate / Change Role */}
      {/* ------------------------------------------------------------- */}
      {roleModalUser && (
        <div className="modal-backdrop">
          <form className="modal" action={handleUpdateRole}>
            <header>
              <div>
                <span className="eyebrow">Role Elevation & Management</span>
                <h2>Elevate / Change Role</h2>
              </div>
              <button
                type="button"
                onClick={() => setRoleModalUser(null)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </header>

            <input type="hidden" name="userId" value={roleModalUser.id} />

            <div className="mb-4 p-3 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl">
              <strong>{roleModalUser.name || "Unnamed User"}</strong>
              <small className="block text-[var(--muted)]">{roleModalUser.email}</small>
              <div className="mt-2 text-[11px]">
                Current Role:{" "}
                <span className={`cell-status ${ROLE_METADATA[roleModalUser.role].badgeClass}`}>
                  {ROLE_METADATA[roleModalUser.role].label}
                </span>
              </div>
            </div>

            <div className="form-grid">
              <label className="wide">
                Select New Role *
                <select
                  name="role"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as Role)}
                >
                  <option value="SUPER_ADMIN">Super Administrator (Tier 5 - Unrestricted)</option>
                  <option value="ADMIN">Administrator (Tier 4 - Full Operations)</option>
                  <option value="OFFICER">Placement Officer (Tier 3 - Staff Operations)</option>
                  <option value="COORDINATOR">Student Coordinator (Tier 2 - Drives & Events)</option>
                  <option value="STUDENT">Student (Tier 1 - Standard Portal)</option>
                </select>
              </label>

              <label className="wide">
                Designation / Title
                <input
                  name="title"
                  value={selectedTitle}
                  onChange={(e) => setSelectedTitle(e.target.value)}
                  placeholder="e.g. Placement Coordinator, Senior Officer"
                />
              </label>
            </div>

            <div className="mt-3 p-3 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] text-xs">
              <p className="font-bold text-[var(--ink)] mb-1">
                {ROLE_METADATA[selectedRole].label} Capabilities:
              </p>
              <p className="text-[var(--muted)] mb-2">
                {ROLE_METADATA[selectedRole].description}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {ROLE_DEFAULT_PERMISSIONS[selectedRole].map((p) => (
                  <span key={p} className="permission-pill text-[9.5px]">
                    <Check size={10} className="text-green-600" />
                    {p}
                  </span>
                ))}
              </div>
            </div>

            {roleModalUser.id === currentUserId &&
              (selectedRole === "STUDENT" || selectedRole === "COORDINATOR") && (
                <div className="admin-error mt-3">
                  <ShieldAlert size={16} />
                  Warning: You are demoting your own account. You may lose access to this admin panel.
                </div>
              )}

            <footer>
              <button type="button" onClick={() => setRoleModalUser(null)}>
                Cancel
              </button>
              <button type="submit" disabled={saving}>
                {saving ? "Updating Role…" : "Save Role Elevation"}
              </button>
            </footer>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Custom Permissions Matrix Editor */}
      {/* ------------------------------------------------------------- */}
      {permModalUser && (
        <div className="modal-backdrop">
          <div className="modal permission-matrix-modal">
            <header>
              <div>
                <span className="eyebrow">Granular RBAC</span>
                <h2>Custom Permissions Matrix</h2>
              </div>
              <button
                type="button"
                onClick={() => setPermModalUser(null)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </header>

            <div className="p-3 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl flex items-center justify-between">
              <div>
                <strong>{permModalUser.name || "User"}</strong>
                <small className="block text-[var(--muted)]">{permModalUser.email}</small>
              </div>
              <div className="text-right">
                <span className={`cell-status ${ROLE_METADATA[permModalUser.role].badgeClass}`}>
                  {ROLE_METADATA[permModalUser.role].label}
                </span>
                <small className="block text-[9.5px] text-[var(--muted)] mt-1">
                  Base Role Defaults
                </small>
              </div>
            </div>

            <p className="text-xs text-[var(--muted)] mt-3">
              Configure fine-grained permissions specifically for this user. You can grant privileges
              beyond their role tier, or explicitly revoke default privileges.
            </p>

            <div className="permission-categories-grid">
              {categories.map(([catName, defs]) => (
                <div className="permission-category-box" key={catName}>
                  <h3>{catName}</h3>

                  {defs.map((def) => {
                    const defaultInRole = (
                      ROLE_DEFAULT_PERMISSIONS[permModalUser.role] as readonly PermissionKey[]
                    ).includes(def.key);

                    const isExplicitlyGranted = editingPermissions.includes(def.key);
                    const isExplicitlyRevoked = editingPermissions.includes(`-${def.key}`);

                    const effectiveActive =
                      (defaultInRole && !isExplicitlyRevoked) || isExplicitlyGranted;

                    return (
                      <div className="permission-item-row" key={def.key}>
                        <div className="permission-item-info">
                          <strong>{def.label}</strong>
                          <small>{def.description}</small>
                        </div>

                        <div className="permission-toggle-control">
                          {defaultInRole ? (
                            isExplicitlyRevoked ? (
                              <span className="permission-pill custom-revoked">Revoked</span>
                            ) : (
                              <span className="inherited-tag">In Role</span>
                            )
                          ) : isExplicitlyGranted ? (
                            <span className="permission-pill custom-granted">Granted</span>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => togglePermissionOverride(def.key, defaultInRole)}
                            className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                              effectiveActive
                                ? "bg-green-600 text-white border-green-600"
                                : "bg-[var(--surface-alt)] text-[var(--muted)] border-[var(--border)]"
                            }`}
                            title={`Toggle ${def.label}`}
                          >
                            {effectiveActive ? "Active" : "Off"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <footer>
              <button type="button" onClick={() => setPermModalUser(null)}>
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdatePermissions}
                disabled={saving}
              >
                {saving ? "Saving Matrix…" : "Save Permissions Matrix"}
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Edit User Details */}
      {/* ------------------------------------------------------------- */}
      {editingUser && (
        <div className="modal-backdrop">
          <form className="modal" action={handleUpdateDetails}>
            <header>
              <div>
                <span className="eyebrow">User Details</span>
                <h2>Edit Account Info</h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </header>

            <input type="hidden" name="userId" value={editingUser.id} />

            <div className="form-grid">
              <label className="wide">
                Full Name
                <input
                  name="name"
                  defaultValue={editingUser.name ?? ""}
                  placeholder="Student or Staff Name"
                />
              </label>

              <label>
                Designation / Title
                <input
                  name="title"
                  defaultValue={editingUser.title ?? ""}
                  placeholder="e.g. Lead Coordinator"
                />
              </label>

              <label>
                Roll Number
                <input
                  name="rollNumber"
                  defaultValue={editingUser.rollNumber ?? ""}
                  placeholder="e.g. LCI2022001"
                />
              </label>

              <label>
                Branch
                <input
                  name="branch"
                  defaultValue={editingUser.branch ?? ""}
                  placeholder="e.g. Computer Science"
                />
              </label>

              <label>
                Batch
                <input
                  name="batch"
                  type="number"
                  defaultValue={editingUser.batch ?? ""}
                  placeholder="2026"
                />
              </label>
            </div>

            <footer>
              <button type="button" onClick={() => setEditingUser(null)}>
                Cancel
              </button>
              <button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </footer>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Delete User Confirmation */}
      {/* ------------------------------------------------------------- */}
      {deletingUser && (
        <div className="modal-backdrop">
          <form className="modal" action={handleDeleteUser}>
            <header>
              <div>
                <span className="eyebrow text-red-600">Danger Zone</span>
                <h2>Delete User Account</h2>
              </div>
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </header>

            <input type="hidden" name="userId" value={deletingUser.id} />

            <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl my-3 text-xs leading-relaxed text-red-900 dark:text-red-200">
              <p className="font-bold mb-1">Are you sure you want to delete this account?</p>
              <p>
                <strong>{deletingUser.name || "User"}</strong> ({deletingUser.email}) with role{" "}
                <strong>{deletingUser.role}</strong> will be permanently removed.
              </p>
            </div>

            <footer>
              <button type="button" onClick={() => setDeletingUser(null)}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {saving ? "Deleting…" : "Confirm Delete User"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
