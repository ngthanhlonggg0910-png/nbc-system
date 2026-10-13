export function normalizeShift(raw) {
  if (!raw || typeof raw !== "object") return null;

  return {
    id: raw.id ?? null,
    name: raw.name ?? raw.shift_name ?? "Ca làm việc",
    startTime: raw.startTime ?? raw.start_time ?? null,
    endTime: raw.endTime ?? raw.end_time ?? null,
    breakStart: raw.breakStart ?? raw.break_start ?? null,
    breakEnd: raw.breakEnd ?? raw.break_end ?? null,
    source: raw.source ?? "assigned",
    effectiveDate: raw.effectiveDate ?? raw.effective_date ?? null,
    isActive: raw.isActive ?? raw.is_active ?? true,
  };
}

export function formatShiftTime(value) {
  return /^\d{2}:\d{2}/.test(value ?? "") ? value.slice(0, 5) : "--:--";
}

export function formatEffectiveDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? "")) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}
