export const DEFAULT_ATTENDANCE_SHIFT = {
  startTime: "07:30", endTime: "16:30", breakStart: "12:00", breakEnd: "13:00", breakMinutes: 60,
  standardWorkMinutes: 480, lateGraceMinutes: 0, earlyLeaveGraceMinutes: 0,
};

function timeToMinutes(value) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ""))) return undefined;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function normalizeShift(shift = {}) {
  return {
    startTime: String(shift.startTime ?? shift.start_time ?? DEFAULT_ATTENDANCE_SHIFT.startTime).slice(0, 5),
    endTime: String(shift.endTime ?? shift.end_time ?? DEFAULT_ATTENDANCE_SHIFT.endTime).slice(0, 5),
    breakStart: String(shift.breakStart ?? shift.break_start ?? DEFAULT_ATTENDANCE_SHIFT.breakStart).slice(0, 5),
    breakEnd: String(shift.breakEnd ?? shift.break_end ?? DEFAULT_ATTENDANCE_SHIFT.breakEnd).slice(0, 5),
    breakMinutes: Number(shift.breakMinutes ?? shift.break_minutes ?? DEFAULT_ATTENDANCE_SHIFT.breakMinutes),
    standardWorkMinutes: Number(shift.standardWorkMinutes ?? shift.standard_work_minutes ?? DEFAULT_ATTENDANCE_SHIFT.standardWorkMinutes),
    lateGraceMinutes: Number(shift.lateGraceMinutes ?? shift.late_grace_minutes ?? 0),
    earlyLeaveGraceMinutes: Number(shift.earlyLeaveGraceMinutes ?? shift.early_leave_grace_minutes ?? 0),
    crossesMidnight: Boolean(shift.crossesMidnight ?? shift.crosses_midnight),
  };
}

export function calculateAdjustedAttendance(checkIn, checkOut, rawShift = {}) {
  const shift = normalizeShift(rawShift);
  const start = timeToMinutes(checkIn);
  let end = timeToMinutes(checkOut);
  const shiftStart = timeToMinutes(shift.startTime);
  let shiftEnd = timeToMinutes(shift.endTime);
  if ([start, end, shiftStart, shiftEnd].some((value) => value === undefined)) {
    return { valid: false, error: "Vui lòng nhập đầy đủ giờ check-in và check-out hợp lệ." };
  }
  if (shift.crossesMidnight || shiftEnd <= shiftStart) shiftEnd += 1440;
  if (shift.crossesMidnight && end <= start) end += 1440;
  if (end <= start) return { valid: false, error: "Giờ check-out phải sau giờ check-in." };

  const presenceMinutes = end - start;
  const breakStart = timeToMinutes(shift.breakStart);
  const breakEnd = timeToMinutes(shift.breakEnd);
  const overlappingBreak = breakStart !== undefined && breakEnd !== undefined
    ? Math.max(0, Math.min(end, breakEnd) - Math.max(start, breakStart))
    : (presenceMinutes >= shift.standardWorkMinutes + shift.breakMinutes ? shift.breakMinutes : 0);
  const actualWorkedMinutes = Math.max(0, presenceMinutes - Math.min(overlappingBreak, shift.breakMinutes));
  // Ngày công chỉ ghi nhận tối đa thời lượng chuẩn; phần vượt ca được tách sang tăng ca.
  const workedMinutes = Math.min(actualWorkedMinutes, shift.standardWorkMinutes);
  const lateMinutes = start > shiftStart + shift.lateGraceMinutes ? Math.max(0, start - shiftStart) : 0;
  const earlyLeaveMinutes = end < shiftEnd - shift.earlyLeaveGraceMinutes ? Math.max(0, shiftEnd - end) : 0;
  const overtimeMinutes = Math.max(0, end - shiftEnd);
  const statuses = [];
  if (lateMinutes) statuses.push("late");
  if (earlyLeaveMinutes) statuses.push("early_leave");
  if (overtimeMinutes) statuses.push("overtime");
  if (!statuses.length) statuses.push("full");
  return {
    valid: true, hours: Number((workedMinutes / 60).toFixed(2)), status: statuses,
    workedMinutes, lateMinutes, earlyLeaveMinutes, overtimeMinutes,
    workdayUnits: shift.standardWorkMinutes > 0
      ? Number((workedMinutes / shift.standardWorkMinutes).toFixed(2))
      : 0,
  };
}
