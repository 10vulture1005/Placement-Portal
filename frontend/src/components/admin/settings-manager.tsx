"use client";

import Link from "next/link";
import { KeyRound, Shield, ShieldCheck, UserCheck, Users } from "lucide-react";
import { ROLE_METADATA } from "@/lib/permissions";

export function SettingsManager({
  userCounts,
  adminEmails,
  currentAdminEmail,
}: {
  userCounts: {
    superAdmins: number;
    admins: number;
    officers: number;
    coordinators: number;
    students: number;
    total: number;
  };
  adminEmails: string[];
  currentAdminEmail: string | null;
}) {
  return (
    <div className="admin-page">
      <section className="admin-heading">
        <div>
          <span className="eyebrow">Administration</span>
          <h1>System Settings & Access Controls</h1>
          <p>Review system security status, role configurations, and access policies.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/team" className="admin-icon-link !w-auto !h-auto px-3 py-2 text-xs font-bold gap-2 text-white bg-[var(--surface-alt)] hover:bg-[var(--surface-highlight)] border border-[var(--border)] rounded-xl flex items-center shadow-sm">
            <Shield size={15} className="text-[var(--orange)]" />
            Placement Team &amp; Permissions
          </Link>
          <Link href="/admin/users" className="admin-icon-link !w-auto !h-auto px-3 py-2 text-xs font-bold gap-2 text-white bg-[var(--navy)] rounded-xl flex items-center">
            <Users size={15} />
            Manage Users &amp; RBAC
          </Link>
        </div>
      </section>

      <section className="admin-metrics">
        <article>
          <div className="metric-icon violet">
            <ShieldCheck />
          </div>
          <div>
            <small>Active Administrators</small>
            <strong>{userCounts.superAdmins + userCounts.admins}</strong>
            <b>Root & operation admins</b>
          </div>
        </article>

        <article>
          <div className="metric-icon">
            <UserCheck />
          </div>
          <div>
            <small>Staff & Coordinators</small>
            <strong>{userCounts.officers + userCounts.coordinators}</strong>
            <b>{userCounts.officers} officers · {userCounts.coordinators} coords</b>
          </div>
        </article>

        <article>
          <div className="metric-icon">
            <Users />
          </div>
          <div>
            <small>Total Directory</small>
            <strong>{userCounts.total}</strong>
            <b>{userCounts.students} students registered</b>
          </div>
        </article>

        <article>
          <div className="metric-icon">
            <KeyRound />
          </div>
          <div>
            <small>Bootstrap Allowlist</small>
            <strong>{adminEmails.length}</strong>
            <b>Configured in ADMIN_EMAILS</b>
          </div>
        </article>
      </section>

      <section className="analytics-grid">
        <article>
          <header>
            <div>
              <h2>Role-Based Access Control Architecture</h2>
              <p>5-tier granular permission hierarchy</p>
            </div>
            <Shield size={18} />
          </header>

          <div className="mt-4 flex flex-col gap-3">
            {Object.entries(ROLE_METADATA).map(([roleKey, meta]) => (
              <div
                key={roleKey}
                className="p-3 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)] flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`cell-status ${meta.badgeClass}`}>{meta.label}</span>
                    <span className="text-[10px] text-[var(--muted)] font-semibold">Tier {meta.tier}</span>
                  </div>
                  <small className="block text-[var(--muted)] text-[11px] mt-1">{meta.description}</small>
                </div>
                <Link
                  href={`/admin/users?role=${roleKey}`}
                  className="text-xs font-bold text-[var(--blue)] hover:underline"
                >
                  View Accounts →
                </Link>
              </div>
            ))}
          </div>
        </article>

        <article>
          <header>
            <div>
              <h2>Security Environment</h2>
              <p>Active environment boundaries & allowlists</p>
            </div>
            <ShieldCheck size={18} />
          </header>

          <div className="mt-4 text-xs space-y-3">
            <div className="p-3 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl">
              <strong className="block text-[var(--ink)] mb-1">Your Active Session</strong>
              <span className="text-[var(--muted)]">{currentAdminEmail || "Anonymous"}</span>
            </div>

            <div className="p-3 bg-[var(--surface-alt)] border border-[var(--border)] rounded-xl">
              <strong className="block text-[var(--ink)] mb-1">Emergency Bootstrap Allowlist</strong>
              <p className="text-[var(--muted)] mb-2">
                Accounts defined in <code>ADMIN_EMAILS</code> receive automatic Super Admin privileges on sign-in.
              </p>
              <div className="flex flex-wrap gap-1">
                {adminEmails.length > 0 ? (
                  adminEmails.map((email) => (
                    <span key={email} className="permission-pill">
                      {email}
                    </span>
                  ))
                ) : (
                  <span className="text-[var(--muted)] italic">No allowlist configured.</span>
                )}
              </div>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
