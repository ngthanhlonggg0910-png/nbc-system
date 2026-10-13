import test from "node:test";
import assert from "node:assert/strict";
import { inferMissingAttendanceStatus, shiftAttendanceMonth } from "./attendanceMonth.utils.js";

test("moves from August to July", () => {
  assert.equal(shiftAttendanceMonth("2026-08", -1), "2026-07");
});

test("moves from August to September", () => {
  assert.equal(shiftAttendanceMonth("2026-08", 1), "2026-09");
});

test("moves across year boundaries", () => {
  assert.equal(shiftAttendanceMonth("2026-01", -1), "2025-12");
  assert.equal(shiftAttendanceMonth("2026-12", 1), "2027-01");
});

test("marks a past working day without logs as absent", () => {
  assert.equal(inferMissingAttendanceStatus("2026-07", 27, "2026-08-21"), "absent");
});

test("keeps weekends and non-past dates as no data", () => {
  assert.equal(inferMissingAttendanceStatus("2026-07", 26, "2026-08-21"), "no_data");
  assert.equal(inferMissingAttendanceStatus("2026-08", 21, "2026-08-21"), "no_data");
  assert.equal(inferMissingAttendanceStatus("2026-08", 24, "2026-08-21"), "no_data");
});
