import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";

const validStatuses = ["APPLIED", "SHORTLISTED", "INTERVIEW", "SELECTED", "REJECTED", "WITHDRAWN"] as const;

const applySchema = z.object({
  jobId: z.string().trim().min(1).max(100),
  resumeId: z.string().trim().max(100).optional().nullable(),
});

const updateStatusSchema = z.object({
  applicationId: z.string().min(1),
  status: z.enum(validStatuses),
});

const bulkUpdateSchema = z.object({
  applicationIds: z.array(z.string().min(1)).min(1),
  status: z.enum(validStatuses),
});

test("application apply schema validates job profile and optional resumeId", () => {
  const valid = applySchema.safeParse({ jobId: "job-123", resumeId: "resume-456" });
  assert.equal(valid.success, true);
  if (valid.success) {
    assert.equal(valid.data.jobId, "job-123");
    assert.equal(valid.data.resumeId, "resume-456");
  }

  const withoutResume = applySchema.safeParse({ jobId: "job-123", resumeId: null });
  assert.equal(withoutResume.success, true);
});

test("application apply schema rejects empty jobId", () => {
  const invalid = applySchema.safeParse({ jobId: "", resumeId: "res-1" });
  assert.equal(invalid.success, false);
});

test("admin update status schema accepts valid statuses and rejects invalid ones", () => {
  const valid = updateStatusSchema.safeParse({ applicationId: "app-1", status: "SHORTLISTED" });
  assert.equal(valid.success, true);

  const invalid = updateStatusSchema.safeParse({ applicationId: "app-1", status: "INVALID_STATUS" });
  assert.equal(invalid.success, false);
});

test("admin bulk update schema requires at least one application ID", () => {
  const valid = bulkUpdateSchema.safeParse({ applicationIds: ["app-1", "app-2"], status: "SELECTED" });
  assert.equal(valid.success, true);

  const empty = bulkUpdateSchema.safeParse({ applicationIds: [], status: "SELECTED" });
  assert.equal(empty.success, false);
});
