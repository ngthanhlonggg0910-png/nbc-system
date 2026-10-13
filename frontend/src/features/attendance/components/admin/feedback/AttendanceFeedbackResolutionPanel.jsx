import React, { useEffect, useMemo, useState } from "react";
import { Clock3, Send, X } from "lucide-react";
import { getAttendanceFeedbackDetail } from "@/api/attendance.api";
import { calculateAdjustedAttendance } from "@/utils/attendance-adjustment";

const read = (row, camel, snake, fallback = "—") =>
  row?.[camel] ?? row?.[snake] ?? fallback;

const TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Ho_Chi_Minh",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const timeValue = (value) => {
  if (!value || value === "—") return "";
  if (/^\d{2}:\d{2}/.test(value)) return value.slice(0, 5);

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "" : TIME_FORMATTER.format(date);
};

const EMPTY_FORM = {
  checkIn: "",
  checkOut: "",
  reply: "",
  internalNote: "",
  reason: "",
};

const metrics = [
  ["workedMinutes", "worked_minutes", "Phút làm"],
  ["lateMinutes", "late_minutes", "Đi trễ"],
  ["earlyLeaveMinutes", "early_leave_minutes", "Về sớm"],
  ["overtimeMinutes", "overtime_minutes", "Tăng ca"],
  ["workdayUnits", "workday_units", "Ngày công"],
];

export function AttendanceFeedbackResolutionPanel({
  feedback,
  onClose,
  onResolve,
}) {
  const [detail, setDetail] = useState();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    let active = true;

    async function loadFeedbackDetail() {
      setLoading(true);
      setError("");
      setDetail(null);
      setForm(EMPTY_FORM);

      try {
        const data = await getAttendanceFeedbackDetail(feedback.id);

        if (!active) return;

        const entry =
          data.attendanceEntry ?? data.entry ?? data.attendance_entry ?? null;

        setDetail({ ...data, entry });

        setForm({
          ...EMPTY_FORM,
          checkIn: timeValue(read(entry, "checkIn", "check_in", "")),
          checkOut: timeValue(read(entry, "checkOut", "check_out", "")),
        });
      } catch (err) {
        if (!active) return;

        setError(
          err.response?.data?.message ??
            err.message ??
            "Không thể tải chi tiết phản hồi.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    loadFeedbackDetail();

    return () => {
      active = false;
    };
  }, [feedback.id]);

  const preview = useMemo(
    () =>
      calculateAdjustedAttendance(
        form.checkIn,
        form.checkOut,
        detail?.shift ?? detail?.entry,
      ),
    [form.checkIn, form.checkOut, detail],
  );

  const before = detail?.entry;
  const rawLogs = detail?.rawLogs ?? detail?.raw_logs ?? [];

  const validationError = !preview.valid
    ? preview.error
    : !form.reply.trim() || !form.reason.trim()
      ? "Vui lòng nhập phản hồi gửi nhân viên và lý do điều chỉnh."
      : "";

  const canSubmit =
    !loading && !submitting && Boolean(detail) && !validationError;

  const handleFieldChange = (key) => (event) => {
    setForm((current) => ({
      ...current,
      [key]: event.target.value,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);

    try {
      await onResolve(feedback.id, {
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        reply: form.reply.trim(),
        internalNote: form.internalNote.trim(),
        reason: form.reason.trim(),
      });
    } catch (err) {
      setError(
        err.response?.data?.message ??
          err.message ??
          "Cập nhật dữ liệu chấm công thất bại.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="attendance-resolution-backdrop" onMouseDown={onClose}>
      <form
        className="attendance-resolution-panel"
        onSubmit={submit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span>PHẢN HỒI CHẤM CÔNG</span>
            <h2>
              {feedback.employee} · {feedback.staffId}
            </h2>
            <p>
              {feedback.date} — {feedback.message}
            </p>
          </div>
          <button type="button" onClick={onClose}>
            <X />
          </button>
        </header>
        {loading ? (
          <div className="resolution-loading">Đang tải dữ liệu chấm công…</div>
        ) : (
          <>
            {error && (
              <div className="resolution-error" role="alert">
                {error}
              </div>
            )}
            {detail && (
              <div className="resolution-content">
                <section>
                  <h3>Raw log gốc</h3>
                  <div className="raw-log-list">
                    {rawLogs.length ? (
                      rawLogs.map((log) => (
                        <div key={log.id}>
                          <Clock3 />
                          <span>{timeValue(log.timestamp)}</span>
                          <strong>{log.direction ?? "Không xác định"}</strong>
                          <small>
                            {log.deviceName ??
                              log.device_name ??
                              log.device_id ??
                              "—"}
                          </small>
                        </div>
                      ))
                    ) : (
                      <p>Không có raw log.</p>
                    )}
                  </div>
                </section>
                <section>
                  <h3>Điều chỉnh giờ công</h3>
                  <div className="resolution-time-grid">
                    <label>
                      Check-in
                      <input
                        type="time"
                        required
                        value={form.checkIn}
                        onChange={handleFieldChange("checkIn")}
                      />
                    </label>
                    <label>
                      Check-out
                      <input
                        type="time"
                        required
                        value={form.checkOut}
                        onChange={handleFieldChange("checkOut")}
                      />
                    </label>
                  </div>
                  {!preview.valid && form.checkIn && form.checkOut && (
                    <small className="field-error">{preview.error}</small>
                  )}
                </section>
                <section className="resolution-preview">
                  <h3>Xem trước dữ liệu</h3>
                  <div className="preview-table">
                    <div className="preview-head">
                      <span>Chỉ số</span>
                      <b>Trước</b>
                      <b>Sau</b>
                    </div>
                    <div>
                      <span>Check-in</span>
                      <b>
                        {timeValue(read(before, "checkIn", "check_in")) || "—"}
                      </b>
                      <b>{form.checkIn || "—"}</b>
                    </div>
                    <div>
                      <span>Check-out</span>
                      <b>
                        {timeValue(read(before, "checkOut", "check_out")) ||
                          "—"}
                      </b>
                      <b>{form.checkOut || "—"}</b>
                    </div>
                    {metrics.map(([camel, snake, label]) => (
                      <div key={camel}>
                        <span>{label}</span>
                        <b>{read(before, camel, snake, 0)}</b>
                        <b className="changed">
                          {preview.valid ? preview[camel] : "—"}
                        </b>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="resolution-notes">
                  <label>
                    Lý do điều chỉnh *
                    <textarea
                      required
                      value={form.reason}
                      onChange={handleFieldChange("reason")}
                      placeholder="Lý do được lưu trong audit log…"
                    />
                  </label>
                  <label>
                    Phản hồi gửi nhân viên *
                    <textarea
                      required
                      value={form.reply}
                      onChange={handleFieldChange("reply")}
                      placeholder="Kết quả xử lý nhân viên sẽ nhận được…"
                    />
                  </label>
                  <label>
                    Ghi chú nội bộ
                    <textarea
                      value={form.internalNote}
                      onChange={handleFieldChange("internalNote")}
                      placeholder="Chỉ HR nhìn thấy…"
                    />
                  </label>
                </section>
              </div>
            )}
          </>
        )}
        <footer>
          <button type="button" className="secondary-button" onClick={onClose}>
            Hủy
          </button>
          <button
            type="submit"
            className="primary-button"
            disabled={!canSubmit}
          >
            <Send />
            {submitting ? "Đang xác nhận…" : "Xác nhận điều chỉnh"}
          </button>
        </footer>
      </form>
    </div>
  );
}
