import React from "react";

export default function AttendanceCalendar({
  activeMonthNumber,
  activeYear,
  activeMonth,
  calendarDays,
  selectedDay,
  onSelectDay,
  onPreviousMonth,
  onNextMonth,
}) {
  return (
    <section className="section-block calendar-card">
      <div className="calendar-nav">
        <button
          type="button"
          aria-label="Xem tháng trước"
          disabled={activeMonth === "2025-01"}
          onClick={onPreviousMonth}
        >
          ‹
        </button>
        <div>
          <span>THỜI GIAN</span>
          <h2>
            Tháng {activeMonthNumber}/{activeYear}
          </h2>
        </div>
        <button
          type="button"
          aria-label="Xem tháng sau"
          disabled={activeMonth === "2027-12"}
          onClick={onNextMonth}
        >
          ›
        </button>
      </div>
      <div className="weekdays">
        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="calendar-grid">
        {calendarDays.map((day, i) => (
          <button
            key={`${day.n}-${i}`}
            type="button"
            disabled={!day.record}
            onClick={() => day.record && onSelectDay(day.record.day)}
            className={`calendar-day ${day.muted ? "muted" : ""} ${day.s || ""} ${day.today ? "today" : ""} ${day.record && selectedDay === day.n && !day.muted ? "selected" : ""}`}
          >
            <span>{day.n}</span>
            {day.s && <i />}
          </button>
        ))}
      </div>
      <div className="calendar-legend">
        <span>
          <i className="ok" /> Đủ lượt
        </span>
        <span>
          <i className="late" /> Đi trễ
        </span>
        <span>
          <i className="early-leave" /> Về sớm
        </span>
        <span>
          <i className="missing-punch" /> Thiếu lượt
        </span>
        <span>
          <i className="absent" /> Vắng
        </span>
        <span>
          <i className="no-data" /> Chưa có dữ liệu
        </span>
      </div>
    </section>
  );
}
