import test from "node:test";
import assert from "node:assert/strict";
import { getPermissions, hasPermission } from "./permission.js";

test("permission checks are null safe", () => {
  assert.deepEqual(getPermissions(null), []);
  assert.equal(hasPermission(null, "view_home"), false);
});

test("authorization uses permissions without admin bypass", () => {
  const adminWithoutDelete = { role: { code: "admin", permissions: ["view_employee", "edit_employee"] } };
  assert.equal(hasPermission(adminWithoutDelete, "view_employee"), true);
  assert.equal(hasPermission(adminWithoutDelete, "delete_employee"), false);
});

test("view and action permissions are independent", () => {
  const user = { role: { permissions: ["view_role"] } };
  assert.equal(hasPermission(user, "view_role"), true);
  assert.equal(hasPermission(user, "edit_role"), false);
});
