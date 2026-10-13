const getStatusList = (entry) =>
  Array.isArray(entry.status)
    ? entry.status
    : String(entry.status ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

const getAttendanceStatus = (entry) => {
  const statuses = getStatusList(entry);

  if (
    statuses.includes("missing_punch") ||
    (!entry.checkOut &&
      !entry.check_out &&
      !statuses.some((value) => ["leave", "holiday", "absent"].includes(value)))
  ) {
    return "missing_punch";
  }

  if (statuses.includes("absent")) return "absent";

  if (
    statuses.includes("late") ||
    Number(entry.lateMinutes ?? entry.late_minutes) > 0
  ) {
    return "late";
  }

  if (
    statuses.includes("early_leave") ||
    Number(entry.earlyLeaveMinutes ?? entry.early_leave_minutes) > 0
  ) {
    return "early_leave";
  }

  return "full";
};

const getDateKey = (value) => {
  const text = String(value ?? "");
  const vietnamese = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  return vietnamese
    ? `${vietnamese[3]}-${vietnamese[2]}-${vietnamese[1]}`
    : text.slice(0, 10);
};

export function getAttendanceOverviewData(
  attendanceEntries = [],
  feedbacks = [],
  employees = [],
) {
  const exceptions = attendanceEntries.filter(
    (entry) => getAttendanceStatus(entry) !== "full",
  );

  const trendDays = [
    ...new Set(
      attendanceEntries.map((entry) => getDateKey(entry.date)).filter(Boolean),
    ),
  ]
    .sort()
    .slice(-7)
    .map((date) => {
      const rows = attendanceEntries.filter(
        (entry) => getDateKey(entry.date) === date,
      );

      return {
        date,
        label: date.slice(8, 10),
        full: rows.filter((entry) => getAttendanceStatus(entry) === "full")
          .length,
        issue: rows.filter((entry) => getAttendanceStatus(entry) !== "full")
          .length,
      };
    });

  const pendingFeedbackGroups = Array.from(
    feedbacks
      .filter((item) => item.status === "pending")
      .reduce((groups, item) => {
        const key = String(item.staffId || item.employee || item.id);
        const employee = employees.find(
          (person) => String(person.staffId) === String(item.staffId),
        );

        const group = groups.get(key) ?? {
          key,
          employee: employee?.name ?? item.employee ?? "Nhân viên",
          staffId: item.staffId ?? "",
          items: [],
        };

        group.items.push(item);
        groups.set(key, group);
        return groups;
      }, new Map())
      .values(),
  ).slice(0, 2);

  return {
    exceptionCount: exceptions.length,
    trendDays,
    trendMax: Math.max(1, ...trendDays.flatMap((day) => [day.full, day.issue])),
    pendingFeedbackGroups,
  };
}
