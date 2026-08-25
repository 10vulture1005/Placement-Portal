import assert from "node:assert/strict";
import test from "node:test";
import { announcementDeleteSchema, announcementFormSchema } from "./announcement-schema";

test("announcement schema trims values and handles comma-separated tags", () => {
  const parsed = announcementFormSchema.parse({
    id: "ann_123",
    title: "  Google Shortlist Announced  ",
    content: "  Here is the list of shortlisted candidates for round 2.  ",
    category: "COMPANY_EVENT",
    companyId: "comp_123",
    tags: "Shortlist, Round 2, Shortlist, Drive",
  });

  assert.equal(parsed.title, "Google Shortlist Announced");
  assert.equal(parsed.content, "Here is the list of shortlisted candidates for round 2.");
  assert.equal(parsed.category, "COMPANY_EVENT");
  assert.equal(parsed.companyId, "comp_123");
  assert.deepEqual(parsed.tags, ["Shortlist", "Round 2", "Drive"]);
});

test("announcement schema clears companyId when category is GENERAL", () => {
  const parsed = announcementFormSchema.parse({
    title: "Placement Policy Update",
    content: "Please review the updated placement guidelines for 2026.",
    category: "GENERAL",
    companyId: "comp_123",
    tags: ["Policy", "Guidelines"],
  });

  assert.equal(parsed.category, "GENERAL");
  assert.equal(parsed.companyId, null);
  assert.deepEqual(parsed.tags, ["Policy", "Guidelines"]);
});

test("announcement schema rejects invalid input", () => {
  const shortTitle = announcementFormSchema.safeParse({
    title: "A",
    content: "Valid content here.",
    category: "GENERAL",
  });
  assert.equal(shortTitle.success, false);

  const shortContent = announcementFormSchema.safeParse({
    title: "Valid Title",
    content: "",
    category: "GENERAL",
  });
  assert.equal(shortContent.success, false);

  const invalidCat = announcementFormSchema.safeParse({
    title: "Valid Title",
    content: "Valid content here.",
    category: "UNKNOWN_CAT",
  });
  assert.equal(invalidCat.success, false);
});

test("announcement delete schema validates required ID", () => {
  const valid = announcementDeleteSchema.safeParse({ announcementId: "ann_123" });
  assert.equal(valid.success, true);

  const empty = announcementDeleteSchema.safeParse({ announcementId: "" });
  assert.equal(empty.success, false);
});
