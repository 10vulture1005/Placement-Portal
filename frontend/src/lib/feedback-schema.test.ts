import assert from "node:assert/strict";
import test from "node:test";
import {
  feedbackDeleteSchema,
  feedbackReplySchema,
  feedbackSubmitSchema,
} from "./feedback-schema";

test("feedbackSubmitSchema accepts valid query and trims fields", () => {
  const parsed = feedbackSubmitSchema.parse({
    feedbackType: "QUERY",
    subject: "  Need information about off-campus drive  ",
    message: "  Can we apply for companies that require 6 months internship during 8th semester?  ",
  });

  assert.equal(parsed.feedbackType, "QUERY");
  assert.equal(parsed.subject, "Need information about off-campus drive");
  assert.equal(
    parsed.message,
    "Can we apply for companies that require 6 months internship during 8th semester?"
  );
});

test("feedbackSubmitSchema rejects short subject or message", () => {
  const shortSub = feedbackSubmitSchema.safeParse({
    feedbackType: "FEEDBACK",
    subject: "Hi",
    message: "Valid message that has more than twenty characters.",
  });
  assert.equal(shortSub.success, false);

  const shortMsg = feedbackSubmitSchema.safeParse({
    feedbackType: "FEEDBACK",
    subject: "Valid subject",
    message: "Short msg",
  });
  assert.equal(shortMsg.success, false);
});

test("feedbackReplySchema validates admin response", () => {
  const valid = feedbackReplySchema.parse({
    feedbackId: "fb_123",
    adminResponse: "Yes, 8th semester 6-month internships are permitted with prior NOC approval.",
    resolve: true,
  });

  assert.equal(valid.feedbackId, "fb_123");
  assert.equal(valid.resolve, true);

  const emptyResponse = feedbackReplySchema.safeParse({
    feedbackId: "fb_123",
    adminResponse: " ",
  });
  assert.equal(emptyResponse.success, false);

  const deleteValid = feedbackDeleteSchema.safeParse({ feedbackId: "fb_123" });
  assert.equal(deleteValid.success, true);
});
