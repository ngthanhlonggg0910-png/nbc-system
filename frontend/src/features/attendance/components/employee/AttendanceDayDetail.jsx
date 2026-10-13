import React from "react";
import { CalendarDays, TimerReset, Reply, LogIn, LogOut } from "lucide-react";

import { formatShiftTime } from "../../utils/attendance-shift.utils";
import {
  attendanceStatusMeta,
  getPunchLabel,
} from "@/features/attendance/utils/attendance-entry.utils";

export default function AttendanceDayDetail({
  currentShift,
  record,
  onOpenFeedback,
}) {
  const statusMeta = attendanceStatusMeta[record?.status] ?? {
    label: "Chưa xác định",
    tone: "missing_punch",
  };

  function formatWorkedTime(record) {
    if (!record || record.status === "missing_punch") return "Chưa đủ dữ liệu";
    if (record.workedMinutes > 0) {
      const hours = Math.floor(record.workedMinutes / 60);
      const minutes = record.workedMinutes % 60;
      return `${hours} giờ${minutes ? ` ${minutes} phút` : ""}`;
    }
    return record.hours > 0
      ? `${record.hours.toFixed(2)} giờ`
      : "Chưa có thời gian làm việc";
  }

  return (
    <section className="section-block detail-card">
      <div className="detail-date">
        <div>
          <span>CHI TIẾT NGÀY</span>
          <h2>
            {record.weekday}, {record.date}
          </h2>
        </div>
        <span className={`attendance-status ${statusMeta.tone}`}>
          {statusMeta.label}
        </span>
      </div>
      {["absent", "no_data"].includes(record.status) ? (
        <div className="absence-state">
          <CalendarDays />
          <strong>Không có dữ liệu chấm công</strong>
          <span>{record.note}</span>
        </div>
      ) : (
        <div className="timeline">
          <div className="timeline-item">
            <span className="timeline-dot">
              <LogIn />
            </span>
            <div>
              <small>CHECK-IN</small>
              <strong>{record.checkIn}</strong>
              <p>
                {record.deviceIn
                  ? `Thiết bị #${record.deviceIn}`
                  : "Chưa có thông tin thiết bị"}
                {currentShift?.startTime
                  ? ` · Giờ dự kiến ${formatShiftTime(currentShift.startTime)}`
                  : ""}
              </p>
            </div>
            <span
              className={`attendance-status light ${!record.checkIn || record.checkIn === "—" ? "missing_punch" : record.lateMinutes > 0 || ["late", "late_early_leave"].includes(record.status) ? "late" : "full"}`}
            >
              {getPunchLabel(record, "in")}
            </span>
          </div>
          <div className="timeline-line" />
          <div className="timeline-item">
            <span className="timeline-dot">
              <LogOut />
            </span>
            <div>
              <small>CHECK-OUT</small>
              <strong>{record.checkOut}</strong>
              <p>
                {record.deviceOut
                  ? `Thiết bị #${record.deviceOut}`
                  : record.checkOut === "—"
                    ? "Chưa có lượt check-out"
                    : "Chưa có thông tin thiết bị"}
                {currentShift?.endTime
                  ? ` · Giờ dự kiến ${formatShiftTime(currentShift.endTime)}`
                  : ""}
              </p>
            </div>
            <span
              className={`attendance-status light ${!record.checkOut || record.checkOut === "—" ? "missing_punch" : record.earlyLeaveMinutes > 0 || ["early_leave", "late_early_leave"].includes(record.status) ? "early_leave" : "full"}`}
            >
              {getPunchLabel(record, "out")}
            </span>
          </div>
        </div>
      )}
      <div className="work-summary">
        <TimerReset />
        <div>
          <span>Thời gian làm việc được ghi nhận</span>
          <strong>{formatWorkedTime(record)}</strong>
          {(record.lateMinutes > 0 ||
            record.earlyLeaveMinutes > 0 ||
            record.overtimeMinutes > 0 ||
            record.workdayUnits > 0) && (
            <small>
              {record.workdayUnits > 0
                ? `${record.workdayUnits.toFixed(2)} công`
                : ""}
              {record.workdayUnits > 0 &&
              (record.lateMinutes > 0 ||
                record.earlyLeaveMinutes > 0 ||
                record.overtimeMinutes > 0)
                ? " · "
                : ""}
              {record.lateMinutes > 0
                ? `Đi trễ ${record.lateMinutes} phút`
                : ""}
              {record.lateMinutes > 0 &&
              (record.earlyLeaveMinutes > 0 || record.overtimeMinutes > 0)
                ? " · "
                : ""}
              {record.earlyLeaveMinutes > 0
                ? `Về sớm ${record.earlyLeaveMinutes} phút`
                : ""}
              {record.earlyLeaveMinutes > 0 && record.overtimeMinutes > 0
                ? " · "
                : ""}
              {record.overtimeMinutes > 0
                ? `Tăng ca ${record.overtimeMinutes} phút`
                : ""}
              {record.shiftId ? ` · Ca #${record.shiftId}` : ""}
            </small>
          )}
        </div>
      </div>
      <button
        className="secondary-button attendance-feedback-button"
        onClick={onOpenFeedback}
      >
        <Reply /> Phản hồi về ngày này
      </button>
    </section>
  );
}
