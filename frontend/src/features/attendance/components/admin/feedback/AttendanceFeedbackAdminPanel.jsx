import { useState, useMemo } from "react";

import {
  Send,
  Clock3,
  UserRoundSearch,
  CheckCircle2,
  Search,
  CalendarDays,
  SlidersHorizontal,
} from "lucide-react";

import { calculateAdjustedAttendance } from "@/utils/attendance-adjustment";
import AttendanceFeedbackReviewDetail from "./AttendanceFeedbackReviewDetail";

const getMonthKey = (date) => {
  const [, month, year] = String(date ?? "").split("/");
  return month && year ? `${year}-${month}` : "";
};

const getFeedbackMessages = (item) => {
  if (item.messages?.length) return item.messages;

  return [
    ...(item.initiatedBy === "hr"
      ? []
      : [
          {
            id: `${item.id}-employee`,
            sender: "employee",
            text: item.message,
            createdAt: item.createdAt,
          },
        ]),
    ...(item.reply
      ? [
          {
            id: `${item.id}-hr`,
            sender: "hr",
            text: item.reply,
            createdAt: item.processedAt ?? "Đã trả lời",
          },
        ]
      : []),
    ...(item.initiatedBy === "hr"
      ? [
          {
            id: `${item.id}-hr`,
            sender: "hr",
            text: item.message,
            createdAt: item.createdAt,
          },
        ]
      : []),
  ];
};

export default function AttendanceFeedbackAdminPanel({
  feedbacks = [],
  attendanceEntries = [],
  onReply,
  onReviewFeedback,
  onOpenConversation,
}) {
  const [selectedFeedback, setSelectedFeedback] = useState();
  const [feedbackSearch, setFeedbackSearch] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState("all");
  const [feedbackMonth, setFeedbackMonth] = useState("all");
  const [replyText, setReplyText] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [adjustedCheckIn, setAdjustedCheckIn] = useState("");
  const [adjustedCheckOut, setAdjustedCheckOut] = useState("");
  const [adjustmentError, setAdjustmentError] = useState("");

  const {
    pendingFeedback,
    reviewingFeedback,
    answeredFeedback,
    feedbackMonths,
    visibleFeedbacks,
  } = useMemo(() => {
    const keyword = feedbackSearch.trim().toLowerCase();
    const months = new Set();
    let pending = 0;
    let reviewing = 0;
    let answered = 0;

    const visible = feedbacks.filter((item) => {
      const status = item.status ?? "pending";
      const month = getMonthKey(item.date);

      if (month) months.add(month);
      if (status === "pending") pending += 1;
      if (status === "reviewing") reviewing += 1;
      if (["answered", "approved", "rejected"].includes(status)) answered += 1;

      const matchesSearch =
        !keyword ||
        [item.employee, item.staffId, item.message].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(keyword),
        );

      const matchesStatus =
        feedbackStatus === "all" || status === feedbackStatus;

      const matchesMonth = feedbackMonth === "all" || month === feedbackMonth;

      return matchesSearch && matchesStatus && matchesMonth;
    });

    return {
      pendingFeedback: pending,
      reviewingFeedback: reviewing,
      answeredFeedback: answered,
      feedbackMonths: [...months].sort().reverse(),
      visibleFeedbacks: visible,
    };
  }, [feedbacks, feedbackSearch, feedbackStatus, feedbackMonth]);

  const openFeedbackDetail = (item) => {
    const isConversation =
      item.requestType === "conversation" || item.initiatedBy === "hr";
    const entry = attendanceEntries.find(
      (record) => record.staffId === item.staffId && record.date === item.date,
    );
    const nextItem =
      item.status === "pending" ? { ...item, status: "reviewing" } : item;
    if (item.status === "pending" && !isConversation)
      onReviewFeedback(item.id, { status: "reviewing" });
    setSelectedFeedback(nextItem);
    setReplyText(item.reply || "");
    setInternalNote(item.internalNote || "");
    setAdjustedCheckIn(item.adjustedCheckIn || entry?.checkIn || "");
    setAdjustedCheckOut(item.adjustedCheckOut || entry?.checkOut || "");
    setAdjustmentError("");
  };

  const sendHrMessage = () => {
    const text = replyText.trim();
    if (!text) return;
    onReply(selectedFeedback.id, text);
    setSelectedFeedback((current) => ({
      ...current,
      status: current.status === "pending" ? "reviewing" : current.status,
      messages: [
        ...getFeedbackMessages(current),
        {
          id: Date.now(),
          sender: "hr",
          text,
          createdAt: new Date().toLocaleString("vi-VN"),
        },
      ],
      reply: text,
    }));
    setReplyText("");
  };

  const finishFeedback = (status) => {
    if (status === "approved") {
      const calculation = calculateAdjustedAttendance(
        adjustedCheckIn,
        adjustedCheckOut,
      );
      if (!calculation.valid) {
        setAdjustmentError(calculation.error);
        return;
      }
    }
    const fallback =
      status === "rejected"
        ? "Yêu cầu điều chỉnh chưa đủ điều kiện để xác nhận."
        : "Đã kiểm tra và cập nhật dữ liệu chấm công.";
    const latestHrMessage = [...getFeedbackMessages(selectedFeedback)]
      .reverse()
      .find((message) => message.sender === "hr")?.text;
    onReviewFeedback(selectedFeedback.id, {
      status,
      reply: replyText.trim() || latestHrMessage || fallback,
      internalNote: internalNote.trim(),
      adjustedCheckIn,
      adjustedCheckOut,
    });
    setSelectedFeedback(undefined);
  };

  return (
    <div
      className={`attendance-review ${selectedFeedback ? "has-detail" : ""}`}
    >
      <div className="attendance-review-main">
        <section className="attendance-review-hero">
          <div className="attendance-review-hero-head">
            <div>
              <h2>Phản hồi chấm công</h2>
              <p>Trao đổi hai chiều và xử lý điều chỉnh chấm công</p>
            </div>
            <button
              type="button"
              className="primary-button attendance-start-chat"
              onClick={onOpenConversation}
            >
              <Send /> Nhắn tin
            </button>
          </div>
          <div className="attendance-review-stats">
            <article>
              <span className="pending">
                <Clock3 />
              </span>
              <div>
                <small>Chờ xử lý</small>
                <strong>{pendingFeedback}</strong>
                <p>Yêu cầu</p>
              </div>
            </article>
            <article>
              <span className="reviewing">
                <UserRoundSearch />
              </span>
              <div>
                <small>Đang xem xét</small>
                <strong>{reviewingFeedback}</strong>
                <p>Yêu cầu</p>
              </div>
            </article>
            <article>
              <span className="completed">
                <CheckCircle2 />
              </span>
              <div>
                <small>Đã hoàn tất</small>
                <strong>{answeredFeedback}</strong>
                <p>Yêu cầu</p>
              </div>
            </article>
          </div>
        </section>

        <section className="section-block attendance-review-list">
          <div className="attendance-review-filters">
            <label>
              <Search />
              <input
                value={feedbackSearch}
                onChange={(e) => setFeedbackSearch(e.target.value)}
                placeholder="Tìm theo tên, mã nhân viên..."
              />
            </label>
            <label>
              <CalendarDays />
              <select
                value={feedbackMonth}
                onChange={(e) => setFeedbackMonth(e.target.value)}
              >
                <option value="all">Tất cả tháng</option>
                {feedbackMonths.map((month) => {
                  const [year, value] = month.split("-");
                  return (
                    <option key={month} value={month}>
                      Tháng {value}/{year}
                    </option>
                  );
                })}
              </select>
            </label>
            <select
              value={feedbackStatus}
              onChange={(e) => setFeedbackStatus(e.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Chờ xử lý</option>
              <option value="reviewing">Đang xem xét</option>
              <option value="approved">Đã xác nhận</option>
              <option value="rejected">Đã từ chối</option>
            </select>
            <button
              type="button"
              onClick={() => {
                setFeedbackSearch("");
                setFeedbackMonth("all");
                setFeedbackStatus("all");
              }}
            >
              <SlidersHorizontal /> Xóa lọc
            </button>
          </div>
          <div className="attendance-review-table">
            <div className="attendance-review-table-head">
              <span>Nhân viên</span>
              <span>Ngày công</span>
              <span>Nội dung phản hồi</span>
              <span>Trạng thái</span>
              <span>Thao tác</span>
            </div>
            {visibleFeedbacks.map((item) => {
              const initials = String(item.employee ?? "Nhân viên")
                .split(" ")
                .slice(-2)
                .map((word) => word[0])
                .join("");
              return (
                <article
                  key={item.id}
                  className={selectedFeedback?.id === item.id ? "selected" : ""}
                >
                  <div className="review-employee">
                    <i>{initials}</i>
                    <span>
                      <strong>{item.employee}</strong>
                      <small>{item.staffId}</small>
                    </span>
                  </div>
                  <time>{item.date}</time>
                  <p>{item.message}</p>
                  <span className={`review-status ${item.status}`}>
                    {item.status === "pending"
                      ? "Chờ xử lý"
                      : item.status === "reviewing"
                        ? "Đang xem xét"
                        : item.status === "rejected"
                          ? "Đã từ chối"
                          : "Đã xác nhận"}
                  </span>
                  <button
                    type="button"
                    onClick={() => openFeedbackDetail(item)}
                  >
                    Xem chi tiết
                  </button>
                </article>
              );
            })}
            {visibleFeedbacks.length === 0 && (
              <div className="attendance-review-empty">
                Không tìm thấy phản hồi phù hợp.
              </div>
            )}
          </div>
          <footer>
            Hiển thị {visibleFeedbacks.length} trên {feedbacks.length} kết quả
          </footer>
        </section>
      </div>

      {selectedFeedback && (
        <div className="attendance-review-detail-backdrop">
          <AttendanceFeedbackReviewDetail
            feedback={selectedFeedback}
            attendanceEntry={attendanceEntries.find(
              (entry) =>
                entry.staffId === selectedFeedback.staffId &&
                entry.date === selectedFeedback.date,
            )}
            messages={getFeedbackMessages(selectedFeedback)}
            replyText={replyText}
            setReplyText={setReplyText}
            onSendMessage={sendHrMessage}
            adjustedCheckIn={adjustedCheckIn}
            setAdjustedCheckIn={setAdjustedCheckIn}
            adjustedCheckOut={adjustedCheckOut}
            setAdjustedCheckOut={setAdjustedCheckOut}
            internalNote={internalNote}
            setInternalNote={setInternalNote}
            adjustmentError={adjustmentError}
            clearAdjustmentError={() => setAdjustmentError("")}
            onFinish={finishFeedback}
            onClose={() => setSelectedFeedback(undefined)}
          />
        </div>
      )}
    </div>
  );
}
