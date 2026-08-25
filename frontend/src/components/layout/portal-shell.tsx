"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  CircleUserRound,
  ClipboardList,
  FileQuestion,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Phone,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { handleSignOut } from "@/lib/actions/auth";
import { ThemeToggle } from "@/components/shared/theme-toggle";

const navigation = [
  ["Dashboard", "/dashboard", LayoutDashboard],
  ["Company events", "/company-events", Building2],
  ["Applications", "/applications", ClipboardList],
  ["Feedback or query", "/feedback/new", FileQuestion],
  ["My feedbacks", "/feedback", BriefcaseBusiness],
  ["Profile", "/profile", CircleUserRound],
  ["Forms & documents", "/forms", FileText],
  ["Contact us", "/contact", Phone],
  ["Our team", "/team", Users],
] as const;

export function PortalShell({
  children,
  student,
}: {
  children: React.ReactNode;
  student: { name: string; initials: string; subtitle: string };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className="portal-shell">
      <button
        className="menu-button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
      >
        <Menu />
      </button>
      {open && (
        <button
          className="backdrop"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
        />
      )}
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <button
          className="close-button"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
        >
          <X />
        </button>
        <div className="brand">
          <div className="brand-mark">
            <Image
              src="/iiitl-emblem.png"
              alt=""
              width={34}
              height={27}
              priority
            />
          </div>
          <div>
            <strong>Placement Cell</strong>
            <span>IIIT Lucknow</span>
          </div>
        </div>
        <nav aria-label="Main navigation">
          {navigation.map(([label, href, Icon]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={pathname === href ? "active" : ""}
            >
              <Icon size={19} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-help">
          <Bell size={18} />
          <div>
            <strong>Need assistance?</strong>
            <span>Contact the placement team</span>
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div>
            <span className="eyebrow">Student portal</span>
            <strong>Training & Placement Cell</strong>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="student cursor-pointer"
                aria-label="User account menu"
              >
                <div className="avatar">{student.initials}</div>
                <div>
                  <strong>{student.name}</strong>
                  <span>{student.subtitle}</span>
                </div>
              </button>
              {profileOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileOpen(false)}
                  />
                  <div className="absolute right-0 mt-3 w-52 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-2xl z-50 overflow-hidden animate-[fadeSlideUp_0.15s_ease] p-1.5">
                    <div className="px-3 py-2 border-b border-[var(--border)] mb-1">
                      <strong className="block text-xs font-bold text-[var(--ink)] truncate">{student.name}</strong>
                      <span className="block text-[10px] text-[var(--muted)] truncate">{student.subtitle}</span>
                    </div>
                    <form action={handleSignOut}>
                      <button
                        type="submit"
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-500 hover:bg-[var(--badge-red-bg)] font-semibold rounded-xl bg-transparent border-none cursor-pointer text-left transition-colors"
                      >
                        <LogOut size={15} />
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
