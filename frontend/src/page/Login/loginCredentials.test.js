import assert from "node:assert/strict";
import test from "node:test";
import {
  hasLoginCredentials,
  prepareLoginCredentials,
} from "./loginCredentials.js";

test("normalizes the staff ID but preserves the password exactly", () => {
  assert.deepEqual(prepareLoginCredentials("  nbc001  ", " secret "), {
    staffId: "NBC001",
    password: " secret ",
  });
});

test("accepts a password containing only spaces because spaces may be significant", () => {
  assert.equal(hasLoginCredentials("NBC001", "   "), true);
});

test("rejects a missing staff ID or an empty password", () => {
  assert.equal(hasLoginCredentials("   ", "secret"), false);
  assert.equal(hasLoginCredentials("NBC001", ""), false);
});
