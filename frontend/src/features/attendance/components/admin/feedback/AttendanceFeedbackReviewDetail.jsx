import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleCheck,
  Database,
  MessageSquare,
  Send,
  ShieldCheck,
} from "lucide-react";
import { calculateAdjustedAttendance } from "@/utils/attendance-adjustment";

const finishedStatuses = ["approved", "rejected", "answered"];

function displayValue(value, fallback = "—") {
  return value && value !== "—" ? value : fallback;
}

function ChatSection({ feedback, messages, replyText, setReplyText, onSend }) {
  const disabled = ["approved", "rejected"].includes(feedback.status);
  return (
    <section className="attendance-review-chat">
      <h4>
        <MessageSquare /> Trao đổi với nhân viên
      </h4>
      <div className="attendance-chat-thread">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`attendance-chat-message ${message.sender}`}
          >
            <strong>
              {message.sender === "hr" ? "Nhân sự" : feedback.employee}
            </strong>
            <p>{message.text}</p>
            <small>{message.createdAt}</small>
          </div>
        ))}
      </div>
      <div className="attendance-chat-compose">
        <textarea
          value={replyText}
          disabled={disabled}
          onChange={(event) => setReplyText(event.target.value)}
          placeholder="Nhập tin nhắn cho nhân viên..."
        />
        <button
          type="button"
          disabled={!replyText.trim() || disabled}
          onClick={onSend}
        >
          <Send /> Gửi
        </button>
      </div>
    </section>
  );
}

export default function AttendanceFeedbackReviewDetail({
  feedback,
  attendanceEntry,
  messages,
  replyText,
  setReplyText,
  onSendMessage,
  adjustedCheckIn,
  setAdjustedCheckIn,
  adjustedCheckOut,
  setAdjustedCheckOut,
  internalNote,
  setInternalNote,
  adjustmentError,
  clearAdjustmentError,
  onFinish,
  onClose,
}) {
  const isConversation =
    feedback.requestType === "conversation" || feedback.initiatedBy === "hr";
  const readOnly = finishedStatuses.includes(feedback.status);
  const [step, setStep] = useState(1);
  useEffect(
    () => setStep(isConversation ? 0 : 1),
    [feedback.id, isConversation],
  );

  const sourceCheckIn = displayValue(attendanceEntry?.checkIn);
  const sourceCheckOut = displayValue(attendanceEntry?.checkOut);
  const deviceIn = attendanceEntry?.deviceIn
    ? `Thiết bị #${attendanceEntry.deviceIn}`
    : "Chưa có thông tin thiết bị";
  const deviceOut = attendanceEntry?.deviceOut
    ? `Thiết bị #${attendanceEntry.deviceOut}`
    : "Chưa có thông tin thiết bị";
  const preview = useMemo(
    () =>
      calculateAdjustedAttendance(
        adjustedCheckIn,
        adjustedCheckOut,
        attendanceEntry,
      ),
    [adjustedCheckIn, adjustedCheckOut, attendanceEntry],
  );
  const previewStatus = preview.valid
    ? preview.status.includes("late")
      ? "Đi trễ"
      : preview.status.includes("early_leave")
        ? "Về sớm"
        : "Đủ công"
    : "Chưa hợp lệ";
  const initials = feedback.employee
    .split(" ")
    .slice(-2)
    .map((word) => word[0])
    .join("");

  if (isConversation)
    return (
      <aside className="attendance-detail attendance-review-detail">
        <header>
          <h3>Cuộc trò chuyện</h3>
          <button
            className="attendance-review-back"
            type="button"
            onClick={onClose}
          >
            <ArrowLeft /> Quay lại danh sách
          </button>
        </header>
        <div className="attendance-detail-person">
          <i>{initials}</i>
          <div>
            <strong>{feedback.employee}</strong>
            <span>Mã: {feedback.staffId}</span>
            <small>Ngày trao đổi {feedback.date}</small>
          </div>
        </div>
        <ChatSection
          feedback={feedback}
          messages={messages}
          replyText={replyText}
          setReplyText={setReplyText}
          onSend={onSendMessage}
        />
      </aside>
    );

  return (
    <aside className="attendance-detail attendance-review-detail">
      <header>
        <div>
          <h3>Xử lý yêu cầu điều chỉnh</h3>
          <small>Mã #{feedback.id}</small>
        </div>
        <button
          className="attendance-review-back"
          type="button"
          onClick={onClose}
        >
          <ArrowLeft /> Quay lại danh sách
        </button>
      </header>
      <div
        className="attendance-review-steps"
        aria-label="Quy trình xử lý phản hồi"
      >
        {["Xem công", "Đối chiếu", "Điều chỉnh"].map((label, index) => (
          <span
            key={label}
            className={
              step === index + 1 ? "active" : step > index + 1 ? "done" : ""
            }
          >
            <b>{step > index + 1 ? <Check /> : index + 1}</b>
            {label}
          </span>
        ))}
      </div>
      <div className="attendance-detail-person">
        <i>{initials}</i>
        <div>
          <strong>{feedback.employee}</strong>
          <span>Mã: {feedback.staffId}</span>
          <small>Ngày công {feedback.date}</small>
        </div>
      </div>

      {step === 1 && (
        <div className="attendance-review-step-body">
          <section>
            <h4>Công hệ thống đang ghi nhận</h4>
            <div className="attendance-review-facts">
              <div>
                <small>Check-in</small>
                <strong>{sourceCheckIn}</strong>
              </div>
              <div>
                <small>Check-out</small>
                <strong>{sourceCheckOut}</strong>
              </div>
              <div>
                <small>Giờ làm</small>
                <strong>
                  {attendanceEntry?.hours != null
                    ? `${attendanceEntry.hours} giờ`
                    : "—"}
                </strong>
              </div>
              <div>
                <small>Trạng thái</small>
                <strong>
                  {attendanceEntry?.note ||
                    attendanceEntry?.status ||
                    "Chưa có dữ liệu"}
                </strong>
              </div>
            </div>
          </section>
          <section>
            <h4>
              <Database /> Dữ liệu ghi nhận từ máy
            </h4>
            <div className="attendance-source-log">
              <strong>{sourceCheckIn}</strong>
              <span>Lượt vào · {deviceIn}</span>
              <em className={sourceCheckIn === "—" ? "missing" : "valid"}>
                {sourceCheckIn === "—" ? "Không có" : "Đã ghi nhận"}
              </em>
            </div>
            <div className="attendance-source-log">
              <strong>{sourceCheckOut}</strong>
              <span>Lượt ra · {deviceOut}</span>
              <em className={sourceCheckOut === "—" ? "missing" : "valid"}>
                {sourceCheckOut === "—" ? "Không có" : "Đã ghi nhận"}
              </em>
            </div>
          </section>
          <section>
            <h4>Nội dung nhân viên phản hồi</h4>
            <div className="attendance-feedback-quote">
              <p>{feedback.message}</p>
              <small>{feedback.createdAt}</small>
            </div>
          </section>
          <ChatSection
            feedback={feedback}
            messages={messages}
            replyText={replyText}
            setReplyText={setReplyText}
            onSend={onSendMessage}
          />
          <div className="attendance-review-step-actions">
            <button type="button" className="secondary" onClick={onClose}>
              Đóng
            </button>
            <button type="button" onClick={() => setStep(2)}>
              Đã xem công <ArrowRight />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="attendance-review-step-body">
          <section>
            <h4>Đối chiếu dữ liệu</h4>
            <div className="attendance-review-compare">
              <div className="head">
                <span>Nguồn</span>
                <b>Giờ vào</b>
                <b>Giờ ra</b>
              </div>
              <div>
                <span>Bảng công hiện tại</span>
                <b>{sourceCheckIn}</b>
                <b>{sourceCheckOut}</b>
              </div>
              <div>
                <span>Dữ liệu máy</span>
                <b>{sourceCheckIn}</b>
                <b>{sourceCheckOut}</b>
              </div>
            </div>
          </section>
          <section>
            <h4>Kết luận kiểm tra</h4>
            <div
              className={`attendance-evidence ${sourceCheckIn !== "—" && sourceCheckOut !== "—" ? "valid" : "warning"}`}
            >
              <CircleCheck />
              <span>
                {sourceCheckIn !== "—" && sourceCheckOut !== "—"
                  ? "Dữ liệu vào/ra đã có đủ để HR đối chiếu trước khi điều chỉnh."
                  : "Dữ liệu máy chưa đủ lượt. HR cần trao đổi thêm hoặc bổ sung căn cứ trước khi điều chỉnh."}
              </span>
            </div>
          </section>
          <ChatSection
            feedback={feedback}
            messages={messages}
            replyText={replyText}
            setReplyText={setReplyText}
            onSend={onSendMessage}
          />
          <div className="attendance-review-step-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => setStep(1)}
            >
              <ArrowLeft /> Quay lại
            </button>
            <button type="button" onClick={() => setStep(3)}>
              Tạo đề xuất điều chỉnh <ArrowRight />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="attendance-review-step-body">
          <section>
            <h4>Thông tin điều chỉnh</h4>
            <div className="attendance-adjustment">
              <label>
                Check-in mới
                <input
                  type="time"
                  value={adjustedCheckIn === "—" ? "" : adjustedCheckIn}
                  disabled={readOnly}
                  onChange={(event) => {
                    setAdjustedCheckIn(event.target.value);
                    clearAdjustmentError();
                  }}
                />
              </label>
              <label>
                Check-out mới
                <input
                  type="time"
                  value={adjustedCheckOut === "—" ? "" : adjustedCheckOut}
                  disabled={readOnly}
                  onChange={(event) => {
                    setAdjustedCheckOut(event.target.value);
                    clearAdjustmentError();
                  }}
                />
              </label>
            </div>
            {adjustmentError && (
              <p className="attendance-adjustment-error">{adjustmentError}</p>
            )}
          </section>
          <section>
            <h4>Kết quả sau điều chỉnh</h4>
            <div className="attendance-review-facts">
              <div>
                <small>Thời gian làm</small>
                <strong>{preview.valid ? `${preview.hours} giờ` : "—"}</strong>
              </div>
              <div>
                <small>Công tính</small>
                <strong>
                  {preview.valid ? `${preview.workdayUnits} công` : "—"}
                </strong>
              </div>
              <div>
                <small>Đi trễ</small>
                <strong>
                  {preview.valid ? `${preview.lateMinutes} phút` : "—"}
                </strong>
              </div>
              <div>
                <small>Trạng thái</small>
                <strong>{previewStatus}</strong>
              </div>
            </div>
          </section>
          <section>
            <h4>
              Ghi chú nội bộ <small>(không hiển thị cho nhân viên)</small>
            </h4>
            <input
              value={internalNote}
              disabled={readOnly}
              onChange={(event) => setInternalNote(event.target.value)}
              placeholder="Nhập căn cứ hoặc ghi chú xử lý..."
            />
          </section>
          <div className="attendance-review-audit">
            <ShieldCheck /> Thao tác sẽ lưu người xử lý, thời gian và dữ liệu
            trước/sau để kiểm tra.
          </div>
          {!readOnly && (
            <div className="attendance-review-step-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setStep(2)}
              >
                <ArrowLeft /> Quay lại
              </button>
              <span>
                <button
                  type="button"
                  className="reject"
                  onClick={() => onFinish("rejected")}
                >
                  Từ chối
                </button>
                <button
                  type="button"
                  disabled={!preview.valid}
                  onClick={() => onFinish("approved")}
                >
                  <Check /> Xác nhận điều chỉnh
                </button>
              </span>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
