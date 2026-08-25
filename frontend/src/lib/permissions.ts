import type { Role } from "@prisma/client";
import { isAdminEmail } from "./auth-access";

export const PERM_USERS_READ = "users:read";
export const PERM_USERS_MANAGE = "users:manage";
export const PERM_COMPANIES_READ = "companies:read";
export const PERM_COMPANIES_MANAGE = "companies:manage";
export const PERM_JOBS_READ = "jobs:read";
export const PERM_JOBS_MANAGE = "jobs:manage";
export const PERM_APPLICATIONS_READ = "applications:read";
export const PERM_APPLICATIONS_MANAGE = "applications:manage";
export const PERM_STUDENTS_READ = "students:read";
export const PERM_STUDENTS_MANAGE = "students:manage";
export const PERM_ANNOUNCEMENTS_MANAGE = "announcements:manage";
export const PERM_FEEDBACKS_MANAGE = "feedbacks:manage";
export const PERM_NOC_MANAGE = "noc:manage";
export const PERM_TEAM_MANAGE = "team:manage";
export const PERM_ANALYTICS_VIEW = "analytics:view";
export const PERM_SETTINGS_MANAGE = "settings:manage";

export const ALL_PERMISSIONS = [
  PERM_USERS_READ,
  PERM_USERS_MANAGE,
  PERM_COMPANIES_READ,
  PERM_COMPANIES_MANAGE,
  PERM_JOBS_READ,
  PERM_JOBS_MANAGE,
  PERM_APPLICATIONS_READ,
  PERM_APPLICATIONS_MANAGE,
  PERM_STUDENTS_READ,
  PERM_STUDENTS_MANAGE,
  PERM_ANNOUNCEMENTS_MANAGE,
  PERM_FEEDBACKS_MANAGE,
  PERM_NOC_MANAGE,
  PERM_TEAM_MANAGE,
  PERM_ANALYTICS_VIEW,
  PERM_SETTINGS_MANAGE,
] as const;

export type PermissionKey = (typeof ALL_PERMISSIONS)[number];

export type PermissionDefinition = {
  key: PermissionKey;
  label: string;
  category: "Users & RBAC" | "Companies" | "Job Profiles" | "Applications" | "Students" | "Announcements" | "Feedback" | "Forms & NOC" | "Team" | "Analytics" | "Settings";
  description: string;
};

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  {
    key: PERM_USERS_READ,
    label: "View Users & Roles",
    category: "Users & RBAC",
    description: "Browse the user directory, view assigned roles, and inspect permissions.",
  },
  {
    key: PERM_USERS_MANAGE,
    label: "Manage Users & Access",
    category: "Users & RBAC",
    description: "Create, elevate, de-elevate, edit custom permissions, and remove accounts.",
  },
  {
    key: PERM_COMPANIES_READ,
    label: "View Companies",
    category: "Companies",
    description: "View registered recruiter companies and contact information.",
  },
  {
    key: PERM_COMPANIES_MANAGE,
    label: "Manage Companies",
    category: "Companies",
    description: "Add new companies, update details, and manage company records.",
  },
  {
    key: PERM_JOBS_READ,
    label: "View Job Openings",
    category: "Job Profiles",
    description: "Browse published and draft job opportunities.",
  },
  {
    key: PERM_JOBS_MANAGE,
    label: "Manage Job Profiles",
    category: "Job Profiles",
    description: "Create, edit, publish, close, and configure eligibility for job profiles.",
  },
  {
    key: PERM_APPLICATIONS_READ,
    label: "View Candidate Applications",
    category: "Applications",
    description: "Inspect applied candidate lists and review submissions.",
  },
  {
    key: PERM_APPLICATIONS_MANAGE,
    label: "Manage Application Stages",
    category: "Applications",
    description: "Progress candidate stages (Shortlist, Interview, Select), perform bulk updates, and export CSVs.",
  },
  {
    key: PERM_STUDENTS_READ,
    label: "View Student Records",
    category: "Students",
    description: "Search student directory, review academic profiles and uploaded resumes.",
  },
  {
    key: PERM_STUDENTS_MANAGE,
    label: "Manage Student Records",
    category: "Students",
    description: "Update student backlogs, placement bans, and eligibility overrides.",
  },
  {
    key: PERM_ANNOUNCEMENTS_MANAGE,
    label: "Manage Announcements",
    category: "Announcements",
    description: "Post, edit, and publish institute placement updates.",
  },
  {
    key: PERM_FEEDBACKS_MANAGE,
    label: "Manage Feedbacks & Queries",
    category: "Feedback",
    description: "Review, reply to, and resolve student queries and complaints.",
  },
  {
    key: PERM_NOC_MANAGE,
    label: "Manage NOC Requests",
    category: "Forms & NOC",
    description: "Review, approve, or reject student internship NOC requests.",
  },
  {
    key: PERM_TEAM_MANAGE,
    label: "Manage Placement Team",
    category: "Team",
    description: "Manage placement cell coordinators, contacts, and team members.",
  },
  {
    key: PERM_ANALYTICS_VIEW,
    label: "View Placement Analytics",
    category: "Analytics",
    description: "Access placement overview metrics, salary charts, and application funnels.",
  },
  {
    key: PERM_SETTINGS_MANAGE,
    label: "System Settings",
    category: "Settings",
    description: "Configure portal settings, allowlists, and system policies.",
  },
];

export const ROLE_DEFAULT_PERMISSIONS: Record<Role, readonly PermissionKey[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,
  ADMIN: [
    PERM_USERS_READ,
    PERM_USERS_MANAGE,
    PERM_COMPANIES_READ,
    PERM_COMPANIES_MANAGE,
    PERM_JOBS_READ,
    PERM_JOBS_MANAGE,
    PERM_APPLICATIONS_READ,
    PERM_APPLICATIONS_MANAGE,
    PERM_STUDENTS_READ,
    PERM_STUDENTS_MANAGE,
    PERM_ANNOUNCEMENTS_MANAGE,
    PERM_FEEDBACKS_MANAGE,
    PERM_NOC_MANAGE,
    PERM_TEAM_MANAGE,
    PERM_ANALYTICS_VIEW,
    PERM_SETTINGS_MANAGE,
  ],
  OFFICER: [
    PERM_USERS_READ,
    PERM_COMPANIES_READ,
    PERM_COMPANIES_MANAGE,
    PERM_JOBS_READ,
    PERM_JOBS_MANAGE,
    PERM_APPLICATIONS_READ,
    PERM_APPLICATIONS_MANAGE,
    PERM_STUDENTS_READ,
    PERM_ANNOUNCEMENTS_MANAGE,
    PERM_FEEDBACKS_MANAGE,
    PERM_NOC_MANAGE,
    PERM_TEAM_MANAGE,
    PERM_ANALYTICS_VIEW,
  ],
  COORDINATOR: [
    PERM_COMPANIES_READ,
    PERM_JOBS_READ,
    PERM_JOBS_MANAGE,
    PERM_APPLICATIONS_READ,
    PERM_APPLICATIONS_MANAGE,
    PERM_STUDENTS_READ,
    PERM_ANNOUNCEMENTS_MANAGE,
    PERM_ANALYTICS_VIEW,
  ],
  STUDENT: [],
};

export const ROLE_METADATA: Record<
  Role,
  { label: string; description: string; badgeClass: string; tier: number }
> = {
  SUPER_ADMIN: {
    label: "Super Admin",
    description: "Unrestricted system access and root user management.",
    badgeClass: "badge-superadmin",
    tier: 5,
  },
  ADMIN: {
    label: "Administrator",
    description: "Full placement management and administrative operations.",
    badgeClass: "badge-admin",
    tier: 4,
  },
  OFFICER: {
    label: "Placement Officer",
    description: "Cell staff with company, job, NOC, and feedback management privileges.",
    badgeClass: "badge-officer",
    tier: 3,
  },
  COORDINATOR: {
    label: "Student Coordinator",
    description: "Student volunteer assisting with job profiles, events, and candidate tracking.",
    badgeClass: "badge-coordinator",
    tier: 2,
  },
  STUDENT: {
    label: "Student",
    description: "Registered student accessing placement drives and applications.",
    badgeClass: "badge-student",
    tier: 1,
  },
};

export function isElevatedRole(role: Role | string | null | undefined): boolean {
  if (!role) return false;
  return role === "SUPER_ADMIN" || role === "ADMIN" || role === "OFFICER" || role === "COORDINATOR";
}

export function computeEffectivePermissions(
  role: Role | string,
  customPermissions: string[] = [],
  email?: string | null,
): string[] {
  if (email && isAdminEmail(email)) {
    return Array.from(ALL_PERMISSIONS);
  }
  if (role === "SUPER_ADMIN") {
    return Array.from(ALL_PERMISSIONS);
  }

  const baseSet = new Set<string>(ROLE_DEFAULT_PERMISSIONS[role as Role] ?? []);

  for (const perm of customPermissions) {
    if (perm.startsWith("-")) {
      baseSet.delete(perm.slice(1));
    } else if ((ALL_PERMISSIONS as readonly string[]).includes(perm)) {
      baseSet.add(perm);
    }
  }

  return Array.from(baseSet).sort();
}

export function hasPermission(
  user: {
    role?: Role | string;
    customPermissions?: string[];
    effectivePermissions?: string[];
    email?: string | null;
  } | null | undefined,
  permission: PermissionKey,
): boolean {
  if (!user) return false;
  if (user.email && isAdminEmail(user.email)) return true;
  if (user.role === "SUPER_ADMIN") return true;

  if (user.effectivePermissions) {
    return user.effectivePermissions.includes(permission);
  }

  const effective = computeEffectivePermissions(
    user.role ?? "STUDENT",
    user.customPermissions ?? [],
    user.email,
  );
  return effective.includes(permission);
}

export const ROUTE_PERMISSIONS: Record<string, PermissionKey[]> = {
  "/admin/dashboard": [PERM_ANALYTICS_VIEW, PERM_USERS_READ],
  "/admin/users": [PERM_USERS_READ, PERM_USERS_MANAGE],
  "/admin/companies": [PERM_COMPANIES_READ, PERM_COMPANIES_MANAGE],
  "/admin/job-profiles": [PERM_JOBS_READ, PERM_JOBS_MANAGE],
  "/admin/applications": [PERM_APPLICATIONS_READ, PERM_APPLICATIONS_MANAGE],
  "/admin/students": [PERM_STUDENTS_READ, PERM_STUDENTS_MANAGE],
  "/admin/announcements": [PERM_ANNOUNCEMENTS_MANAGE],
  "/admin/feedbacks": [PERM_FEEDBACKS_MANAGE],
  "/admin/noc-requests": [PERM_NOC_MANAGE],
  "/admin/team": [PERM_TEAM_MANAGE],
  "/admin/settings": [PERM_SETTINGS_MANAGE, PERM_USERS_MANAGE],
};

export function canAccessAdminRoute(
  user: {
    role?: Role | string;
    customPermissions?: string[];
    effectivePermissions?: string[];
    email?: string | null;
  } | null | undefined,
  pathname: string,
): boolean {
  if (!user) return false;
  if (user.email && isAdminEmail(user.email)) return true;
  if (user.role === "SUPER_ADMIN") return true;

  for (const [prefix, requiredPerms] of Object.entries(ROUTE_PERMISSIONS)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return requiredPerms.some((perm) => hasPermission(user, perm));
    }
  }

  return isElevatedRole(user.role);
}
