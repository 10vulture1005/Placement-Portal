import assert from "node:assert/strict";
import test from "node:test";
import { companyFormSchema } from "./company-schema";

test("company input trims real values and normalizes optional fields", () => {
  const parsed = companyFormSchema.parse({
    id: "",
    name: "  Example Technologies  ",
    website: "https://example.com",
    logoUrl: "",
    description: "  Product engineering company.  ",
  });

  assert.equal(parsed.name, "Example Technologies");
  assert.equal(parsed.logoUrl, null);
  assert.equal(parsed.description, "Product engineering company.");
});

test("company input rejects invalid URLs", () => {
  const parsed = companyFormSchema.safeParse({
    id: "",
    name: "Example Technologies",
    website: "not-a-url",
    logoUrl: "",
    description: "",
  });

  assert.equal(parsed.success, false);
});
