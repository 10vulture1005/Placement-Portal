import type { JobStatus, JobType } from "@prisma/client";

const JOB_TYPE_LABELS: Record<JobType, string> = {
  INTERNSHIP: "Internship",
  FTE: "FTE",
  INTERNSHIP_PPO: "Internship + PPO",
  INTERNSHIP_FTE: "Internship + FTE",
};

export function jobTypeLabel(type: JobType) {
  return JOB_TYPE_LABELS[type];
}

export function jobStatusLabel(status: JobStatus) {
  return status === "ACTIVE" ? "Active" : status === "ENDED" ? "Closed" : "Draft";
}

export function companyInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function companyColor(name: string) {
  const colors = ["#1868db", "#4285f4", "#e11d48", "#6739b7", "#0f766e"];
  const hash = [...name].reduce((total, character) => total + character.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

export function formatPortalDate(date: Date, includeTime = false) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(date);
}
