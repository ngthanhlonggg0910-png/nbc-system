export function getVietnamToday() {
  const dateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [year, month, day] = dateKey.split("-").map(Number);
  return {
    day,
    dateKey,
    monthKey: `${year}-${String(month).padStart(2, "0")}`,
  };
}

export function getDefaultSelectedDay(monthValue, records = []) {
  const today = getVietnamToday();
  if (monthValue === today.monthKey) return today.day;
  return records.length
    ? Math.max(...records.map((record) => Number(record.day) || 1))
    : 1;
}

export function buildCalendarDays(monthValue, records = []) {
  const [year, month] = monthValue.split("-").map(Number);
  const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const dayCount = new Date(year, month, 0).getDate();
  const previousMonthDayCount = new Date(year, month - 1, 0).getDate();
  const cellCount = Math.ceil((firstWeekday + dayCount) / 7) * 7;
  const today = getVietnamToday();

  const recordsByDay = new Map(
    records.map((record) => [Number(record.day), record]),
  );

  return Array.from({ length: cellCount }, (_, index) => {
    const day = index - firstWeekday + 1;

    if (day < 1) {
      return {
        n: previousMonthDayCount + day,
        muted: true,
        today: false,
        record: undefined,
        s: "",
      };
    }

    if (day > dayCount) {
      return {
        n: day - dayCount,
        muted: true,
        today: false,
        record: undefined,
        s: "",
      };
    }

    const dateKey = `${monthValue}-${String(day).padStart(2, "0")}`;
    const inferredStatus = inferMissingAttendanceStatus(monthValue, day, today.dateKey);
    const record = recordsByDay.get(day) ?? (dateKey <= today.dateKey
      ? {
          day,
          date: `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`,
          weekday: attendanceWeekdays[new Date(year, month - 1, day).getDay()],
          checkIn: "—",
          checkOut: "—",
          hours: 0,
          workedMinutes: 0,
          status: inferredStatus,
          note: inferredStatus === "absent"
            ? "Không có lượt chấm công trong ngày làm việc đã qua"
            : "Chưa có dữ liệu chấm công cho ngày này",
        }
      : undefined);

    return {
      n: day,
      muted: false,
      today: dateKey === today.dateKey,
      record,
      s: record?.status === "full" ? "ok" : (record?.status ?? ""),
    };
  });
}
import { inferMissingAttendanceStatus } from "./attendanceMonth.utils.js";

const attendanceWeekdays = [
  "Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy",
];
