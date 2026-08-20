import assert from "node:assert/strict";
import test from "node:test";
import { calculateProfileCompletion, toEligibilityProfile } from "./student-profile";

test("new OAuth profiles report only fields that actually exist", () => {
  assert.equal(calculateProfileCompletion({
    name: "Student Name",
    rollNumber: null,
    branch: null,
    batch: null,
    degree: null,
    personalEmail: null,
    contactNumber: null,
    currentAddress: null,
    class10Percent: null,
    class12Percent: null,
    cgpa: null,
  }), 9);
});

test("eligibility remains unavailable until required academic fields exist", () => {
  assert.equal(toEligibilityProfile({
    cgpa: null,
    batch: 2027,
    branch: "CSE",
    backlogs: 0,
    bans: 0,
    aadhaarEncrypted: null,
    panCardEncrypted: null,
  }, 0), null);
});

test("eligibility document completeness reflects stored documents and resume", () => {
  const profile = toEligibilityProfile({
    cgpa: 8.2,
    batch: 2027,
    branch: "CSE",
    backlogs: 0,
    bans: 0,
    aadhaarEncrypted: "encrypted-aadhaar",
    panCardEncrypted: "encrypted-pan",
  }, 1);

  assert.equal(profile?.documentsComplete, true);
});
