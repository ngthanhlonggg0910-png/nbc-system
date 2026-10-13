import React, { useState } from "react";
import { Reply, X, ShieldCheck } from "lucide-react";
export default function AttendanceFeedbackModal({
  onClose,
  onSubmit,
  records,
  defaultDate = "14/07/2026",
}) {
  const [date, setDate] = useState(defaultDate);
  const [message, setMessage] = useState("");
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form
        className="feedback-modal"
        onSubmit={(event) => {
          event.preventDefault();
          if (message.trim()) {
            onSubmit(date, message.trim());
          }
        }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" type="button" onClick={onClose}>
          <X />
        </button>
        <span className="modal-icon">
          <Reply />
        </span>
        <h2>Phản hồi chấm công</h2>
        <p>
          Gửi ý kiến đến bộ phận Nhân sự khi thời gian vào/ra chưa chính xác.
        </p>
        <label>
          Ngày cần phản hồi
          <select
            value={date}
            onChange={(event) => setDate(event.target.value)}
          >
            {records.map((record) => (
              <option key={record.date} value={record.date}>
                {record.weekday}, {record.date} · {record.checkIn} -{" "}
                {record.checkOut}
              </option>
            ))}
          </select>
        </label>
        <label>
          Nội dung phản hồi
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Mô tả thời gian cần kiểm tra và thông tin liên quan..."
          />
        </label>
        <div className="feedback-note">
          <ShieldCheck /> Phản hồi được chuyển trực tiếp đến Admin-HR và lưu
          trong lịch sử xử lý.
        </div>
        <button
          className="primary-button"
          type="submit"
          disabled={!message.trim()}
        >
          <Reply /> Gửi phản hồi
        </button>
      </form>
    </div>
  );
}
