import React, { useState, useEffect } from "react";
import { CalendarDays, Clock3 } from "lucide-react";

import AttendanceCalendar from "../../components/employee/AttendanceCalendar";
import AttendanceConversation from "../../components/employee/AttendanceConversation";
import AttendanceDayDetail from "../../components/employee/AttendanceDayDetail";
import AttendanceMonthReport from "../../components/employee/AttendanceMonthReport";
import AttendanceFeedbackModal from "../../components/employee/AttendanceFeedbackModal";
import CurrentShiftBanner from "../../components/employee/CurrentShiftBanner";
import { PageTitle } from "@/components/common/PageTitle";
import { getMonthlyAttendance } from "@/api/attendance.api";

import {
  buildCalendarDays,
  getDefaultSelectedDay,
  getVietnamToday,
} from "../../utils/attendance-calendar.utils.js";
import { getConversationMessages } from "../../utils/attendance-conversation.utils";
import { shiftAttendanceMonth } from "../../utils/attendanceMonth.utils";

function getMonthFromAttendanceDate(value) {
  // Nếu focusDate có dạng 2026-08-18
  if (/^\d{4}-\d{2}/.test(value || "")) {
    return value.slice(0, 7);
  }
  // Nếu focusDate có dạng 18/08/2026
  const match = value?.match(/^\d{2}\/(\d{2})\/(\d{4})$/);
  if (match) {
    return `${match[2]}-${match[1]}`;
  }

  return getVietnamToday().monthKey;
}

export function AttendancePage({
  onNotifications,
  unreadCount,
  onSubmitFeedback,
  feedbacks,
  user,
  focusDate,
  systemConfig,
}) {
  const safeFeedbacks = Array.isArray(feedbacks) ? feedbacks : [];

  const feedbackRevision = safeFeedbacks
    .filter((item) => item?.staffId === user.staffId)
    .map(
      (item) =>
        `${item.id}:${item.status}:${item.updatedAt || item.processedAt || ""}:${item.adjustedCheckIn || ""}:${item.adjustedCheckOut || ""}`,
    )
    .join("|");
  const [selectedDay, setSelectedDay] = useState(
    () => Number(focusDate?.slice(0, 2)) || getVietnamToday().day,
  );
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [view, setView] = useState("calendar");
  const [currentShift, setCurrentShift] = useState(null);
  const [attendanceSource, setAttendanceSource] = useState("loading");
  const [activeMonth, setActiveMonth] = useState(() =>
    getMonthFromAttendanceDate(focusDate),
  );
  const [serverRecords, setServerRecords] = useState([]);
  const [attendanceError, setAttendanceError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const refreshAttendance = () => setReloadKey((value) => value + 1);
    window.addEventListener("focus", refreshAttendance);
    return () => window.removeEventListener("focus", refreshAttendance);
  }, []);

  useEffect(() => {
    if (!user?.staffId) {
      setServerRecords([]);
      setAttendanceSource("empty");
      return undefined;
    }

    const controller = new AbortController();

    setAttendanceSource("loading");
    setAttendanceError("");
    setServerRecords([]);

    getMonthlyAttendance(user.staffId, activeMonth, controller.signal)
      .then((response) => {
        const records = Array.isArray(response) ? response : [];

        setServerRecords(records);
        setAttendanceSource(records.length ? "server" : "empty");
        setSelectedDay(getDefaultSelectedDay(activeMonth, records));
      })
      .catch((error) => {
        if (error?.code === "ERR_CANCELED" || error?.name === "AbortError") {
          return;
        }

        setServerRecords([]);
        setAttendanceSource(
          error?.response?.status === 401 || error?.response?.status === 403
            ? "forbidden"
            : "error",
        );
        setAttendanceError(
          error?.response?.data?.message ||
            error?.message ||
            "Không thể tải dữ liệu chấm công.",
        );
      });

    return () => controller.abort();
  }, [activeMonth, reloadKey, user?.staffId, feedbackRevision]);

  const monthRecords = Array.isArray(serverRecords) ? serverRecords : [];

  const calendarDays = buildCalendarDays(activeMonth, monthRecords);
  const selectedDateKey = `${activeMonth}-${String(selectedDay).padStart(2, "0")}`;
  const selected =
    calendarDays.find((day) => !day.muted && day.record?.day === selectedDay)?.record ?? null;
  const [activeYear, activeMonthNumber] = activeMonth.split("-").map(Number);

  const normalizeConversationDate = (value) =>
    String(value || "")
      .split("/")
      .map((part, index) => (index < 2 ? part.padStart(2, "0") : part))
      .join("/");

  const conversations = selected
    ? safeFeedbacks.filter(
        (item) =>
          item &&
          item.staffId === user.staffId &&
          normalizeConversationDate(item.date) ===
            normalizeConversationDate(selected.date),
      )
    : [];
  const conversationMessages = getConversationMessages(conversations);

  function changeMonth(value) {
    if (!/^\d{4}-\d{2}$/.test(value) || value < "2025-01" || value > "2027-12")
      return;
    setActiveMonth(value);
    setSelectedDay(getDefaultSelectedDay(value));
    setFeedbackOpen(false);
  }

  function shiftMonth(offset) {
    setActiveMonth((currentMonth) => {
      const nextMonth = shiftAttendanceMonth(currentMonth, offset);
      if (nextMonth < "2025-01" || nextMonth > "2027-12") return currentMonth;
      setSelectedDay(getDefaultSelectedDay(nextMonth));
      setFeedbackOpen(false);
      return nextMonth;
    });
  }

  return (
    <div className="page">
      <PageTitle
        title="Bảng chấm công"
        subtitle="Theo dõi ngày công và thời gian làm việc"
        onNotifications={onNotifications}
        unreadCount={unreadCount}
      />
      <div className="attendance-view-tabs no-print">
        <button
          className={view === "calendar" ? "active" : ""}
          onClick={() => setView("calendar")}
        >
          <CalendarDays /> Tổng quan tháng
        </button>
        <button
          className={view === "report" ? "active" : ""}
          onClick={() => {
            setView("report");
            setReloadKey((value) => value + 1);
          }}
        >
          <Clock3 /> Báo cáo chấm công tháng
        </button>
      </div>
      {attendanceSource === "loading" && (
        <section className="section-block">
          Đang tải dữ liệu chấm công từ máy chủ…
        </section>
      )}
      {(attendanceSource === "error" || attendanceSource === "forbidden") && (
        <section className="section-block">
          <strong>
            {attendanceSource === "forbidden"
              ? "Bạn không có quyền xem dữ liệu này."
              : "Không thể tải dữ liệu chấm công."}
          </strong>
          <p>{attendanceError}</p>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setReloadKey((value) => value + 1)}
          >
            Thử lại
          </button>
        </section>
      )}
      {view === "report" ? (
        <AttendanceMonthReport
          user={user}
          config={systemConfig}
          monthValue={activeMonth}
          onMonthChange={changeMonth}
          attendanceRecords={monthRecords}
        />
      ) : (
        <>
          <CurrentShiftBanner
            date={getVietnamToday().dateKey}
            onShiftLoaded={setCurrentShift}
          />
          <div className="attendance-layout">
            <AttendanceCalendar
              activeMonthNumber={activeMonthNumber}
              activeYear={activeYear}
              activeMonth={activeMonth}
              calendarDays={calendarDays}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              onPreviousMonth={() => shiftMonth(-1)}
              onNextMonth={() => shiftMonth(1)}
            />

            <div className="column-stack attendance-detail-stack">
              {selected ? (
                <>
                  <AttendanceDayDetail
                    currentShift={currentShift}
                    record={selected}
                    onOpenFeedback={() => setFeedbackOpen(true)}
                  />

                  <AttendanceConversation
                    selectedDateKey={selectedDateKey}
                    messages={conversationMessages}
                    selectedDate={selected.date}
                    user={user}
                    onSubmit={(message) =>
                      onSubmitFeedback(selected.date, message)
                    }
                  />
                </>
              ) : (
                <section className="section-block detail-card">
                  <div className="detail-date">
                    <div>
                      <span>CHI TIẾT THÁNG</span>
                      <h2>
                        Tháng {activeMonthNumber}/{activeYear}
                      </h2>
                    </div>
                  </div>
                  <div className="absence-state">
                    <CalendarDays />
                    <strong>Chưa có dữ liệu chấm công</strong>
                    <span>
                      Không tìm thấy bản ghi chấm công trong tháng đã chọn.
                    </span>
                  </div>
                </section>
              )}
            </div>
          </div>
        </>
      )}
      {feedbackOpen && selected && (
        <AttendanceFeedbackModal
          records={
            monthRecords.some((record) => record.date === selected.date)
              ? monthRecords
              : [...monthRecords, selected].sort((a, b) => a.day - b.day)
          }
          defaultDate={selected.date}
          onClose={() => setFeedbackOpen(false)}
          onSubmit={(date, message) => {
            onSubmitFeedback(date, message);
            setFeedbackOpen(false);
          }}
        />
      )}
    </div>
  );
}
