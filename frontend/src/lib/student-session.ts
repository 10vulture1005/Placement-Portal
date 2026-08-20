import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const requireStudent = cache(async () => {
  const session = await auth();

  if (!session?.user) redirect("/login");
  if (session.user.role !== "STUDENT") redirect("/admin/dashboard");

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");

  return { session, user };
});

export function studentDisplayName(
  student: Awaited<ReturnType<typeof requireStudent>>,
) {
  return student.user.name ?? student.session.user.name ?? "Student";
}

export function studentInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "ST";
}
