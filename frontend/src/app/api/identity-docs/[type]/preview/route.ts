import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { backendAuthHeader, backendBaseUrl } from "@/lib/api-client";
import { db } from "@/lib/db";
import { decryptBuffer, decryptSensitiveValue } from "@/lib/encryption";
import { requireStudent } from "@/lib/student-session";
import { requireAdmin } from "@/lib/admin-session";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params;
  if (type !== "aadhaar" && type !== "pan") {
    return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
  }

  let body: { number?: string; studentId?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const number = (body.number || "").trim();
  if (!number) {
    return NextResponse.json({ error: "Number is required to unlock document" }, { status: 400 });
  }

  // Attempt backend proxy first
  try {
    const payloadKey = type === "aadhaar" ? "aadhaar" : "pan";
    // For admin, we don't proxy to backend because the backend requires a student token for this endpoint,
    // and would check the admin's own Aadhaar instead of the student's.
    // Skip proxying and go straight to local fallback if an admin studentId is provided.
    if (!body.studentId) {
      const res = await fetch(`${backendBaseUrl()}/api/v1/profile/${type}-doc/unlock`, {
        method: "POST",
        headers: {
          ...(await backendAuthHeader()),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ [payloadKey]: number }),
      });

      if (res.ok) {
        const pdfBytes = await res.arrayBuffer();
        return new NextResponse(new Uint8Array(pdfBytes), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": res.headers.get("Content-Disposition") || `inline; filename="${type}_card.pdf"`,
            "X-Frame-Options": "SAMEORIGIN",
          },
        });
      }

      if (res.status === 403) {
        const errJson = await res.json().catch(() => ({}));
        return NextResponse.json(
          { error: errJson.detail || "Incorrect number. Document cannot be unlocked." },
          { status: 403 },
        );
      }
    }
  } catch (backendError) {
    console.warn("Backend unlock proxy failed, trying local fallback", backendError);
  }

  // Local fallback
  let targetUserId: string | undefined;
  let isAdmin = false;

  try {
    const admin = await requireAdmin();
    if (admin) {
      isAdmin = true;
      targetUserId = body.studentId;
    }
  } catch {
    // Not admin
  }

  if (!isAdmin) {
    try {
      const student = await requireStudent();
      if (student?.user) {
        targetUserId = student.user.id;
      }
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!targetUserId) {
    return NextResponse.json({ error: "User identity required" }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: targetUserId },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (type === "aadhaar") {
    if (!user.aadhaarEncrypted || !user.aadhaarDocUrl) {
      return NextResponse.json({ error: "No Aadhaar document uploaded" }, { status: 404 });
    }
    try {
      const realAadhaar = decryptSensitiveValue(user.aadhaarEncrypted);
      if (realAadhaar !== number) {
        return NextResponse.json(
          { error: "Incorrect Aadhaar number. Access denied." },
          { status: 403 },
        );
      }
    } catch (err) {
      console.error("Failed to decrypt stored Aadhaar", err);
      return NextResponse.json({ error: "Failed to verify stored record" }, { status: 500 });
    }
  } else if (type === "pan") {
    if (!user.panCardEncrypted || !user.panCardDocUrl) {
      return NextResponse.json({ error: "No PAN document uploaded" }, { status: 404 });
    }
    try {
      const realPan = decryptSensitiveValue(user.panCardEncrypted);
      if (realPan.toUpperCase() !== number.toUpperCase()) {
        return NextResponse.json(
          { error: "Incorrect PAN. Access denied." },
          { status: 403 },
        );
      }
    } catch (err) {
      console.error("Failed to decrypt stored PAN", err);
      return NextResponse.json({ error: "Failed to verify stored record" }, { status: 500 });
    }
  }

  const docUrl = type === "aadhaar" ? user.aadhaarDocUrl : user.panCardDocUrl;
  const fileName = (type === "aadhaar" ? user.aadhaarDocFileName : user.panCardDocFileName) || `${type}_doc.pdf`;

  if (!docUrl) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const uploadsDir = process.env.UPLOADS_DIR || (existsSync("/app") ? "/tmp/uploads" : "./uploads");
  const filePath = path.join(uploadsDir, docUrl);

  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "Encrypted file not found on disk" }, { status: 404 });
  }

  try {
    const rawEncrypted = readFileSync(filePath);
    const decryptedPdf = decryptBuffer(rawEncrypted);
    return new NextResponse(new Uint8Array(decryptedPdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "X-Frame-Options": "SAMEORIGIN",
      },
    });
  } catch (err) {
    console.error("Failed to decrypt document file", err);
    return NextResponse.json({ error: "Failed to decrypt document file" }, { status: 500 });
  }
}
