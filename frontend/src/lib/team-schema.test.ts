import test from "node:test";
import assert from "node:assert/strict";
import {
  createTeamMemberSchema,
  updateTeamMemberSchema,
  updateDefaultPermissionsSchema,
  reorderTeamSchema,
} from "./team-schema";
import { PERM_JOBS_READ, PERM_JOBS_MANAGE, PERM_APPLICATIONS_MANAGE } from "./permissions";

test("createTeamMemberSchema accepts valid input", () => {
  const result = createTeamMemberSchema.safeParse({
    name: "Aarav Sharma",
    role: "Student Placement Coordinator",
    email: "Aarav@iiitl.ac.in",
    phone: "+91 98765 43210",
    displayOrder: "1",
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.name, "Aarav Sharma");
    assert.equal(result.data.role, "Student Placement Coordinator");
    assert.equal(result.data.email, "aarav@iiitl.ac.in"); // Lowercased
    assert.equal(result.data.displayOrder, 1);
  }
});

test("createTeamMemberSchema accepts empty and whitespace-only email as optional/undefined", () => {
  const resultEmpty = createTeamMemberSchema.safeParse({
    name: "Dr. Faculty",
    role: "Faculty In-Charge",
    email: "",
    displayOrder: 0,
  });
  assert.equal(resultEmpty.success, true);
  if (resultEmpty.success) {
    assert.equal(resultEmpty.data.email, undefined);
  }

  const resultSpaces = createTeamMemberSchema.safeParse({
    name: "Dr. Faculty",
    role: "Faculty In-Charge",
    email: "   ",
    displayOrder: 0,
  });
  assert.equal(resultSpaces.success, true);
  if (resultSpaces.success) {
    assert.equal(resultSpaces.data.email, undefined);
  }
});

test("createTeamMemberSchema rejects invalid name or invalid email", () => {
  const badName = createTeamMemberSchema.safeParse({
    name: "A",
    role: "Officer",
  });
  assert.equal(badName.success, false);

  const badEmail = createTeamMemberSchema.safeParse({
    name: "Valid Name",
    role: "Officer",
    email: "not-an-email",
  });
  assert.equal(badEmail.success, false);
});

test("updateTeamMemberSchema accepts valid updates and trims strings", () => {
  const result = updateTeamMemberSchema.safeParse({
    id: "mem-1",
    role: "Lead Placement Coordinator",
    displayOrder: 2,
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.id, "mem-1");
    assert.equal(result.data.role, "Lead Placement Coordinator");
    assert.equal(result.data.displayOrder, 2);
  }
});

test("updateDefaultPermissionsSchema validates allowed permissions and rejects invalid ones", () => {
  const valid = updateDefaultPermissionsSchema.safeParse({
    defaultPermissions: [PERM_JOBS_READ, PERM_JOBS_MANAGE, PERM_APPLICATIONS_MANAGE],
    syncExistingMembers: true,
  });
  assert.equal(valid.success, true);

  const invalid = updateDefaultPermissionsSchema.safeParse({
    defaultPermissions: ["invalid:fake:permission"],
    syncExistingMembers: false,
  });
  assert.equal(invalid.success, false);
});

test("reorderTeamSchema validates items array", () => {
  const valid = reorderTeamSchema.safeParse({
    items: [
      { id: "mem-1", displayOrder: 1 },
      { id: "mem-2", displayOrder: 2 },
    ],
  });
  assert.equal(valid.success, true);

  const empty = reorderTeamSchema.safeParse({
    items: [],
  });
  assert.equal(empty.success, false);
});
