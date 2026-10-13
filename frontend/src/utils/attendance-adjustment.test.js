import test from "node:test";
import assert from "node:assert/strict";
import { calculateAdjustedAttendance } from "./attendance-adjustment.js";

test("subtracts the overlapping lunch break from worked hours", () => {
  assert.deepEqual(calculateAdjustedAttendance("07:30", "16:30"), {
    valid: true, hours: 8, status: ["full"], workedMinutes: 480,
    lateMinutes: 0, earlyLeaveMinutes: 0, overtimeMinutes: 0, workdayUnits: 1,
  });
});

test("recalculates late and early-leave status", () => {
  const result = calculateAdjustedAttendance("07:45", "16:15");
  assert.equal(result.hours, 7.5);
  assert.deepEqual(result.status, ["late", "early_leave"]);
  assert.equal(result.workedMinutes, 450);
  assert.equal(result.workdayUnits, 0.94);
});

test("calculates overtime and workday units", () => {
  const result = calculateAdjustedAttendance("07:30", "17:00");
  assert.equal(result.hours, 8);
  assert.equal(result.workedMinutes, 480);
  assert.equal(result.overtimeMinutes, 30);
  assert.equal(result.workdayUnits, 1);
});

test("uses the configured standard minutes for shorter shifts", () => {
  const result = calculateAdjustedAttendance("08:00", "12:00", {
    startTime: "08:00",
    endTime: "12:00",
    breakMinutes: 0,
    standardWorkMinutes: 240,
  });
  assert.equal(result.workedMinutes, 240);
  assert.equal(result.workdayUnits, 1);
});

test("rejects invalid time ranges", () => {
  assert.equal(calculateAdjustedAttendance("16:30", "07:30").valid, false);
  assert.equal(calculateAdjustedAttendance("", "16:30").valid, false);
});
