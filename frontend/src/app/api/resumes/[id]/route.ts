import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeader, backendBaseUrl } from "@/lib/api-client";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/student-session";
import { requireAdmin } from "@/lib/admin-session";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) {
    return new NextResponse("Resume ID is required", { status: 400 });
  }

  // Authorize: Must be student owner or admin
  let isAuthorized = false;
  let currentUserId: string | undefined;

  try {
    const admin = await requireAdmin();
    if (admin) isAuthorized = true;
  } catch {
    // Not admin, check student session
    try {
      const student = await requireStudent();
      if (student?.user) {
        currentUserId = student.user.id;
      }
    } catch {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  // Load resume record from database
  const resume = await db.resume.findUnique({
    where: { id },
  });

  if (!resume) {
    return new NextResponse("Resume not found", { status: 404 });
  }

  // Check student ownership if not admin
  if (!isAuthorized && resume.userId !== currentUserId) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // If the fileUrl is an external link (Cloudinary or public document)
  if (resume.fileUrl.startsWith("http://") || resume.fileUrl.startsWith("https://")) {
    return NextResponse.redirect(resume.fileUrl);
  }

  // If the fileUrl is a static path (e.g. /documents/...)
  if (resume.fileUrl.startsWith("/documents/")) {
    const url = new URL(resume.fileUrl, request.url);
    return NextResponse.redirect(url);
  }

  // Local storage: stream from backend
  try {
    const backendUrl = `${backendBaseUrl()}${resume.fileUrl}`;
    const res = await fetch(backendUrl, {
      headers: await backendAuthHeader(),
    });

    if (!res.ok) {
      // Fallback to sample template if file is missing locally
      return NextResponse.redirect(new URL("/documents/student-resume-template.pdf", request.url));
    }

    const data = await res.arrayBuffer();
    return new NextResponse(data, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${resume.fileName || "resume.pdf"}"`,
        "X-Frame-Options": "SAMEORIGIN",
      },
    });
  } catch (error) {
    console.error("Failed to stream resume from backend", error);
    return NextResponse.redirect(new URL("/documents/student-resume-template.pdf", request.url));
  }
}
