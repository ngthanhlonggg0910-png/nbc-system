export function shiftAttendanceMonth(monthValue, offset) {
  const match = String(monthValue || "").match(/^(\d{4})-(\d{2})$/);
  if (!match || !Number.isInteger(offset)) return monthValue;

  const absoluteMonth = Number(match[1]) * 12 + Number(match[2]) - 1 + offset;
  const year = Math.floor(absoluteMonth / 12);
  const month = absoluteMonth - year * 12 + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function inferMissingAttendanceStatus(monthValue, day, todayDateKey) {
  const [year, month] = String(monthValue || "").split("-").map(Number);
  const dateKey = `${monthValue}-${String(day).padStart(2, "0")}`;
  if (!year || !month || dateKey >= todayDateKey) return "no_data";

  const weekday = new Date(year, month - 1, day).getDay();
  return weekday === 0 || weekday === 6 ? "no_data" : "absent";
}
