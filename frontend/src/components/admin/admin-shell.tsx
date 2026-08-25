"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  BellRing,
  BriefcaseBusiness,
  Building2,
  ClipboardCheck,
  FileQuestion,
  FileText,
  GraduationCap,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { handleSignOut } from "@/lib/actions/auth";
import { ThemeToggle } from "@/components/shared/theme-toggle";

const nav = [
  ["Overview", "/admin/dashboard", BarChart3],
  ["Announcements", "/admin/announcements", BellRing],
  ["Companies", "/admin/companies", Building2],
  ["Job profiles", "/admin/job-profiles", BriefcaseBusiness],
  ["Applications", "/admin/applications", ClipboardCheck],
  ["Students", "/admin/students", GraduationCap],
  ["Users & RBAC", "/admin/users", ShieldCheck],
  ["Feedbacks", "/admin/feedbacks", FileQuestion],
  ["NOC requests", "/admin/noc-requests", FileText],
  ["Team", "/admin/team", Users],
  ["Settings", "/admin/settings", Settings],
] as const;

export function AdminShell({
  children,
  admin,
}: {
  children: React.ReactNode;
  admin: { name: string; initials: string; role?: string; title?: string | null };
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className="admin-shell">
      <button
        className="menu-button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <Menu />
      </button>
      {open && (
        <button
          className="backdrop"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        />
      )}
      <aside className={open ? "sidebar-open" : ""}>
        <button
          className="close-button"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        >
          <X />
        </button>
        <div className="admin-brand">
          <Image
            src="/iiitl-emblem.png"
            alt=""
            width={40}
            height={32}
            priority
          />
          <div>
            <strong>T&P Admin</strong>
            <span>IIIT Lucknow</span>
          </div>
        </div>
        <nav>
          {nav.map(([label, href, Icon]) => (
            <Link
              className={path === href ? "active" : ""}
              href={href}
              key={href}
              onClick={() => setOpen(false)}
            >
              <Icon />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <Link className="student-portal-link" href="/dashboard">
          Open student portal →
        </Link>
      </aside>
      <main>
        <header className="admin-topbar">
          <div>
            <span className="eyebrow">Administration</span>
            <strong>Placement Operations</strong>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="admin-user bg-transparent border-none p-0 text-left cursor-pointer"
              >
                <span>{admin.initials}</span>
                <div>
                  <strong>{admin.name}</strong>
                  <small>{admin.title || (admin.role ? admin.role.replace("_", " ") : "Administrator")}</small>
                </div>
              </button>
              {profileOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileOpen(false)}
                  />
                  <div className="absolute right-0 mt-3 w-48 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-xl z-50 overflow-hidden animate-[fadeSlideUp_0.15s_ease]">
                    <form action={handleSignOut}>
                      <button
                        type="submit"
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-500 hover:bg-[var(--badge-red-bg)] font-semibold bg-transparent border-none cursor-pointer text-left transition-colors"
                      >
                        <LogOut size={16} />
                        Sign out
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
