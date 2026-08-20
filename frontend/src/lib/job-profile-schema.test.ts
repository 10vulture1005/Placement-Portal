import assert from "node:assert/strict";
import test from "node:test";
import { jobProfileFormSchema } from "./job-profile-schema";

const validInput = {
  id: "",
  companyId: "cm12345678901234567890123",
  title: "Software Engineer",
  type: "FTE",
  locations: "Bengaluru, Bengaluru, Remote",
  ctcStipend: "1800000",
  ctcStipendInfo: "Annual CTC",
  minCGPA: "7.5",
  maxBacklogs: "0",
  maxBans: "0",
  allowedBranches: "CSE, IT",
  allowedDegrees: "B.Tech",
  allowedGenders: "",
  jobCategory: "Engineering",
  batch: "2027",
  registrationDeadline: "2099-12-31T23:59",
  status: "ACTIVE",
  description: "Build reliable products.",
  openingOverview: "Graduate engineering role.",
};

test("job profile input normalizes numbers and comma-separated eligibility lists", () => {
  const parsed = jobProfileFormSchema.parse(validInput);
  assert.equal(parsed.ctcStipend, 1_800_000);
  assert.deepEqual(parsed.locations, ["Bengaluru", "Remote"]);
  assert.deepEqual(parsed.allowedBranches, ["CSE", "IT"]);
  assert.equal(parsed.allowedGenders.length, 0);
});

test("active jobs reject deadlines in the past", () => {
  const parsed = jobProfileFormSchema.safeParse({
    ...validInput,
    registrationDeadline: "2020-01-01T00:00",
  });
  assert.equal(parsed.success, false);
  assert.match(parsed.error?.issues[0]?.message ?? "", /future deadline/i);
});

test("job profiles require at least one branch and degree", () => {
  const parsed = jobProfileFormSchema.safeParse({
    ...validInput,
    allowedBranches: "",
    allowedDegrees: "",
  });
  assert.equal(parsed.success, false);
});

