import { useRef, useState } from "react";
import {
  CalendarDays,
  Clock3,
  TrendingUp,
  TimerReset,
  UserCheck,
  Leaf,
  Building2,
  ArrowLeft,
  ChevronRight,
  Download,
} from "lucide-react";

export default function AttendanceMonthReport({
  user,
  config,
  monthValue,
  onMonthChange,
  attendanceRecords,
}) {
  const reportRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const [year, month] = monthValue.split("-").map(Number);
  const dayCount = new Date(year, month, 0).getDate();
  const days = Array.from({ length: dayCount }, (_, index) => index + 1);
  const weekdayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const monthRecords = attendanceRecords;
  const monthLabel = `${String(month).padStart(2, "0")}/${year}`;
  const standardDays =
    monthValue === "2026-07"
      ? 22
      : days.filter((day) => {
          const weekday = new Date(year, month - 1, day).getDay();
          return weekday !== 0 && weekday !== 6;
        }).length;
  const holidayDays = days.filter(
    (day) =>
      (month === 1 && day === 1) ||
      (month === 4 && day === 30) ||
      (month === 5 && day === 1) ||
      (month === 9 && day === 2),
  );
  const workdayUnitsFor = (record) => {
    if (record?.workdayUnits != null) return Number(record.workdayUnits) || 0;
    if (record?.status === "full") return 1;
    if (["late", "early_leave", "late_early_leave"].includes(record?.status))
      return 0.8;
    return 0;
  };
  const valueForDay = (day) => {
    if (holidayDays.includes(day)) return "Lễ";
    const record = monthRecords.find((item) => item.day === day);
    if (!record) return "";
    if (record.status === "missing_punch") return "—";
    const units = workdayUnitsFor(record);
    return units > 0 ? String(Number(units.toFixed(2))) : "0";
  };
  const total = monthRecords.reduce(
    (sum, record) => sum + workdayUnitsFor(record),
    0,
  );
  const actualHours = monthRecords.reduce(
    (sum, record) => sum + record.hours,
    0,
  );
  const overtimeHours =
    monthRecords.reduce(
      (sum, record) => sum + (Number(record.overtimeMinutes) || 0),
      0,
    ) / 60;
  const absentDays = monthRecords.filter(
    (record) => record.status === "absent",
  ).length;
  const difference = total - standardDays;
  const attendanceRate = standardDays
    ? Math.min(100, (total / standardDays) * 100)
    : 0;
  const reportMetrics = [
    {
      label: "Kỳ công chuẩn",
      value: `${standardDays} ngày`,
      detail: `${(standardDays * 8).toFixed(1)} giờ`,
      icon: CalendarDays,
      tone: "blue",
    },
    {
      label: "Tổng công thực tế",
      value: `${total.toFixed(1)} công`,
      detail: `${actualHours.toFixed(1)} giờ`,
      icon: Clock3,
      tone: "green",
    },
    {
      label: "Chênh lệch công",
      value: `${difference > 0 ? "+" : ""}${difference.toFixed(1)} công`,
      detail: `${difference > 0 ? "+" : ""}${(difference * 8).toFixed(1)} giờ`,
      icon: TrendingUp,
      tone: difference < 0 ? "orange" : "green",
    },
    {
      label: "Công làm thêm",
      value: `${overtimeHours.toFixed(1)} giờ`,
      detail: "Theo dữ liệu máy chủ",
      icon: TimerReset,
      tone: "blue",
    },
    {
      label: "Tỷ lệ đi làm",
      value: `${attendanceRate.toFixed(1)}%`,
      detail: `${total.toFixed(1)}/${standardDays} công`,
      icon: UserCheck,
      tone: "green",
    },
  ];
  function shiftReportMonth(offset) {
    const next = new Date(year, month - 1 + offset, 1);
    onMonthChange(
      `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`,
    );
  }
  async function exportPdf() {
    if (!reportRef.current || exporting) return;
    setExporting(true);
    try {
      await exportElementAsPdf(
        reportRef.current,
        `bao-cao-cham-cong-${String(month).padStart(2, "0")}-${year}-${user.staffId}.pdf`,
        "landscape",
        undefined,
        true,
      );
    } finally {
      setExporting(false);
    }
  }
  return (
    <section ref={reportRef} className="attendance-report print-surface">
      <header className="attendance-report-hero">
        <div className="attendance-report-company">
          <img
            src={config.companyLogo || "/nbc-logo.png"}
            alt={`Logo ${config.companyName}`}
          />
          <strong>{config.companyName}</strong>
        </div>
        <div className="attendance-report-title">
          <h1>Báo cáo Chấm công tháng</h1>
          <p>
            Từ ngày 01/{monthLabel} đến ngày {String(dayCount).padStart(2, "0")}
            /{monthLabel}
          </p>
        </div>
        <div className="attendance-report-skyline" aria-hidden="true">
          <Leaf />
          <Leaf />
          <Building2 />
          <Leaf />
        </div>
      </header>

      <div className="attendance-report-body">
        <div className="attendance-report-head">
          <div className="attendance-report-unit">
            <span>
              <Building2 />
            </span>
            <div>
              <strong>{user.department}</strong>
              <small>{user.position}</small>
            </div>
          </div>
          <div className="attendance-report-controls no-print">
            <div className="attendance-report-month-control">
              <button
                type="button"
                aria-label="Tháng trước"
                disabled={monthValue === "2025-01"}
                onClick={() => shiftReportMonth(-1)}
              >
                <ArrowLeft />
              </button>
              <label>
                Tháng {monthLabel}
                <input
                  type="month"
                  min="2025-01"
                  max="2027-12"
                  value={monthValue}
                  onChange={(event) => onMonthChange(event.target.value)}
                />
              </label>
              <button
                type="button"
                aria-label="Tháng sau"
                disabled={monthValue === "2027-12"}
                onClick={() => shiftReportMonth(1)}
              >
                <ChevronRight />
              </button>
            </div>
            <button
              className="attendance-report-export"
              disabled={exporting}
              onClick={exportPdf}
            >
              <Download /> {exporting ? "Đang tạo báo cáo..." : "Xuất báo cáo"}
            </button>
          </div>
        </div>

        <div className="attendance-report-metrics">
          {reportMetrics.map((metric) => (
            <div key={metric.label} className="attendance-report-metric">
              <span className={metric.tone}>
                <metric.icon />
              </span>
              <div>
                <small>{metric.label}</small>
                <strong>{metric.value}</strong>
                <em>{metric.detail}</em>
              </div>
            </div>
          ))}
          <div className="attendance-report-leaves" aria-hidden="true">
            <Leaf />
            <Leaf />
            <Leaf />
          </div>
        </div>

        <div className="attendance-design-table-wrap">
          <table className="attendance-design-table">
            <thead>
              <tr>
                <th className="sticky-stt" rowSpan={3}>
                  STT
                </th>
                <th className="sticky-name" rowSpan={3}>
                  Họ tên
                </th>
                <th colSpan={dayCount}>Ngày trong tháng</th>
                <th rowSpan={3}>Lễ</th>
                <th rowSpan={3}>F</th>
                <th rowSpan={3}>VR</th>
                <th rowSpan={3}>Ố</th>
                <th rowSpan={3}>TS</th>
                <th rowSpan={3}>Công tác</th>
                <th rowSpan={3}>Công CN</th>
                <th rowSpan={3}>Tổng công</th>
                <th rowSpan={3}>Bình bầu ABC</th>
                <th rowSpan={3}>Ký nhận</th>
                <th className="policy-head" rowSpan={3}>
                  Công theo ĐLVT
                </th>
                <th className="difference-head" rowSpan={3}>
                  Chênh lệch công
                </th>
              </tr>
              <tr>
                {days.map((day) => {
                  const weekday = new Date(year, month - 1, day).getDay();
                  return (
                    <th
                      key={`day-${day}`}
                      className={weekday === 0 ? "sunday" : ""}
                    >
                      {day}
                    </th>
                  );
                })}
              </tr>
              <tr>
                {days.map((day) => {
                  const weekday = new Date(year, month - 1, day).getDay();
                  return (
                    <th
                      key={`weekday-${day}`}
                      className={weekday === 0 ? "sunday" : ""}
                    >
                      {weekdayNames[weekday]}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="sticky-stt">1</td>
                <td className="sticky-name employee-name">{user.name}</td>
                {days.map((day) => {
                  const weekday = new Date(year, month - 1, day).getDay();
                  const value = valueForDay(day);
                  return (
                    <td
                      key={day}
                      className={`${weekday === 0 ? "sunday" : ""} ${value === "Lễ" ? "holiday" : ""} ${value === "0.8" ? "partial" : value === "0" ? "zero" : ""}`}
                    >
                      {value}
                    </td>
                  );
                })}
                <td>{holidayDays.length || "-"}</td>
                <td>-</td>
                <td>{absentDays || "-"}</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td>0.0</td>
                <td className="total-cell">{total.toFixed(1)}</td>
                <td>A</td>
                <td>
                  <span className="report-signature-mark">Ký</span>
                </td>
                <td className="policy-cell">-</td>
                <td className="difference-cell">{difference.toFixed(1)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="attendance-report-legend">
          <span>
            <i className="workday" />
            Ngày làm việc
          </span>
          <span>
            <i className="weekend" />
            Ngày nghỉ (CN)
          </span>
          <span>
            <i className="holiday" />
            Ngày lễ
          </span>
          <span>
            <b>1</b>: Đi làm
          </span>
          <span>
            <b>0.8</b>: Công chưa đủ
          </span>
          <span>
            <b>0</b>: Vắng
          </span>
        </div>
        <div className="attendance-report-note">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-circle-check"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          <span>
            <strong>Ghi chú:</strong> Dữ liệu chấm công được cập nhật đến hết
            ngày {String(dayCount).padStart(2, "0")}/{monthLabel}.
          </span>
        </div>
      </div>
      <footer className="attendance-report-footer">
        <Leaf />
        <span>
          <strong>Cảm ơn bạn đã đồng hành cùng NBC!</strong>
          <small>Phát triển bền vững – Dệt nên tương lai xanh</small>
        </span>
      </footer>
    </section>
  );
}
