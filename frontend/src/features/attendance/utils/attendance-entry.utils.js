const vietnamTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export const attendanceStatusMeta = {
  full: { label: "Đủ lượt chấm", tone: "full" },
  late: { label: "Đi trễ", tone: "late" },
  early_leave: { label: "Về sớm", tone: "early_leave" },
  late_early_leave: { label: "Đi trễ và về sớm", tone: "late_early_leave" },
  missing_punch: { label: "Thiếu lượt chấm", tone: "missing_punch" },
  absent: { label: "Vắng", tone: "absent" },
  leave: { label: "Nghỉ phép", tone: "leave" },
  holiday: { label: "Ngày lễ", tone: "holiday" },
  no_data: { label: "Chưa có dữ liệu", tone: "no_data" },
};

export function getVietnamDateKey(value) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(parsed);
}

function formatTime(value) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "—"
    : vietnamTimeFormatter.format(parsed);
}

export function mapAttendanceEntry(entry) {
  const isoDate = getVietnamDateKey(entry.date);
  const [year, month, day] = isoDate.split("-").map(Number);
  const lateMinutes = Number(entry.late_minutes ?? entry.lateMinutes ?? 0);
  const earlyLeaveMinutes = Number(
    entry.early_leave_minutes ?? entry.earlyLeaveMinutes ?? 0,
  );
  const checkIn = formatTime(entry.check_in ?? entry.checkIn);
  const checkOut = formatTime(entry.check_out ?? entry.checkOut);
  const passthroughStatuses = new Set([
    "absent",
    "leave",
    "holiday",
    "no_data",
  ]);
  let status = entry.status || "full";
  if (!entry.check_out && !entry.checkOut && !passthroughStatuses.has(status)) {
    status = "missing_punch";
  } else if (!passthroughStatuses.has(status) && status !== "missing_punch") {
    if (lateMinutes > 0 && earlyLeaveMinutes > 0) status = "late_early_leave";
    else if (lateMinutes > 0) status = "late";
    else if (earlyLeaveMinutes > 0) status = "early_leave";
    else status = "full";
  }
  return {
    day,
    date: `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`,
    weekday: new Date(year, month - 1, day).toLocaleDateString("vi-VN", {
      weekday: "long",
    }),
    checkIn,
    checkOut,
    hours: Number(entry.hours ?? 0),
    workedMinutes: Number(entry.worked_minutes ?? entry.workedMinutes ?? 0),
    lateMinutes,
    earlyLeaveMinutes,
    overtimeMinutes: Number(
      entry.overtime_minutes ?? entry.overtimeMinutes ?? 0,
    ),
    workdayUnits: Number(entry.workday_units ?? entry.workdayUnits ?? 0),
    deviceIn: entry.device_in ?? entry.deviceIn ?? null,
    deviceOut: entry.device_out ?? entry.deviceOut ?? null,
    shiftId: entry.shift_id ?? entry.shiftId ?? null,
    status,
    note:
      entry.note ?? attendanceStatusMeta[status]?.label ?? "Dữ liệu chấm công",
  };
}

export function getPunchLabel(record, direction) {
  const value = direction === "in" ? record?.checkIn : record?.checkOut;
  if (!value || value === "—")
    return direction === "in" ? "Thiếu check-in" : "Thiếu check-out";
  if (
    direction === "in" &&
    (record.lateMinutes > 0 ||
      ["late", "late_early_leave"].includes(record.status))
  )
    return record.lateMinutes > 0 ? `Trễ ${record.lateMinutes} phút` : "Đi trễ";
  if (
    direction === "out" &&
    (record.earlyLeaveMinutes > 0 ||
      ["early_leave", "late_early_leave"].includes(record.status))
  )
    return record.earlyLeaveMinutes > 0
      ? `Về sớm ${record.earlyLeaveMinutes} phút`
      : "Về sớm";
  return "Đã ghi nhận";
}
