function normalizeTimestamp(value) {
  const text = String(value || "");
  const localMatch = text.match(/^(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}):(\d{2})/);
  if (localMatch) return { date: `${localMatch[1]}/${localMatch[2]}/${localMatch[3]}`, time: `${localMatch[4]}:${localMatch[5]}`, sort: `${localMatch[3]}-${localMatch[2]}-${localMatch[1]}T${localMatch[4]}:${localMatch[5]}` };
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(parsed);
  const part = (type) => parts.find((item) => item.type === type)?.value;
  const date = `${part("day")}/${part("month")}/${part("year")}`;
  const time = `${part("hour")}:${part("minute")}`;
  return { date, time, sort: `${part("year")}-${part("month")}-${part("day")}T${time}` };
}

export function attendanceEntriesFromRaw(logs, employees) {
  const groups = new Map();
  logs.forEach((log) => {
    const normalized = normalizeTimestamp(log.timestamp);
    if (!normalized) return;
    const key = `${log.staffId}-${normalized.date}`;
    groups.set(key, [...(groups.get(key) ?? []), { ...log, normalized }]);
  });
  return [...groups.values()].map((items, index) => {
    const ordered = [...items].sort((a, b) => a.normalized.sort.localeCompare(b.normalized.sort));
    const checkInLog = ordered.find((item) => item.direction === "Vào") || ordered[0];
    const explicitCheckOut = [...ordered].reverse().find((item) => item.direction === "Ra");
    const checkOutLog = explicitCheckOut || (ordered.length > 1 ? ordered[ordered.length - 1] : undefined);
    const date = checkInLog.normalized.date;
    const checkIn = checkInLog.normalized.time;
    const checkOut = checkOutLog?.normalized.time || "—";
    const toMinutes = (value) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
    const hours = checkOut === "—" ? 0 : Math.max(0, (toMinutes(checkOut) - toMinutes(checkIn) - 60) / 60);
    const status = checkOut === "—" ? "missing_punch" : checkIn > "07:30" ? "late" : "full";
    const employee = employees.find((item) => item.staffId === checkInLog.staffId);
    const [, month, year] = date.split("/");
    return {
      id: checkInLog.id ?? Date.now() + index,
      date,
      month: `${year}-${month}`,
      staffId: checkInLog.staffId,
      name: checkInLog.name,
      department: employee?.department ?? "Chưa phân loại",
      checkIn,
      checkOut,
      hours: Number(hours.toFixed(2)),
      status,
      deviceIn: checkInLog.deviceId ? String(checkInLog.deviceId) : undefined,
      deviceOut: checkOutLog?.deviceId ? String(checkOutLog.deviceId) : undefined,
      note: status === "missing_punch" ? "Đã có check-in · Thiếu check-out" : status === "late" ? "Tự động tính từ dữ liệu thô · Đi trễ" : "Tự động tính từ dữ liệu thô",
    };
  });
}
