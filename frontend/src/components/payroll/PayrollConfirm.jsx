import React, { useRef, useState } from "react";

import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  MessageSquareText,
  ShieldCheck,
  X,
} from "lucide-react";

import PayrollModal from "@/components/payroll/PayrollModal";

const CONFIRMABLE_STATUSES = ["waiting_confirmation", "adjusted", "published"];
const FINAL_STATUSES = ["confirmed", "paid"];

function formatPeriod(periodCode) {
  const [year, month] = String(periodCode ?? "").split("-");
  return month && year ? `${month}/${year}` : "--/----";
}

function formatDate(value) {
  if (!value) return "Chưa cập nhật";
  return new Intl.DateTimeFormat("vi-VN").format(new Date(value));
}

const FEEDBACK_STATUS = {
  pending: ["Đã gửi", 1],
  reviewing: ["HR đang xác minh", 2],
  accepted: ["Đã xác nhận sai lệch", 3],
  adjusted: ["Đã điều chỉnh", 4],
  resolved: ["Hoàn tất", 5],
  rejected: ["Đã phản hồi", 5],
};

export default function PayrollConfirm({
  payslip,
  loading = false,
  message = null,
  error = null,
  feedbackLoading = false,
  feedbackMessage = null,
  feedbackError = null,
  onConfirm,
  onFeedback,
}) {
  const [accepted, setAccepted] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const checkboxRef = useRef(null);

  if (!payslip) return null;

  const status = payslip.status;
  const periodLabel = formatPeriod(payslip.period?.code);
  const latestFeedback = payslip.feedbackSummary?.latest;
  const alreadyConfirmed = FINAL_STATUSES.includes(status);
  const waitingFeedback = status === "employee_feedback" || Number(payslip.feedbackSummary?.openCount ?? 0) > 0;
  const canConfirm = CONFIRMABLE_STATUSES.includes(status) && !waitingFeedback;

  const handleConfirm = async () => {
    if (!accepted || loading) return;
    try {
      await onConfirm?.(payslip.id);
      setConfirmDialogOpen(false);
      setAccepted(false);
    } catch {
      // Redux hiển thị lỗi qua prop error.
    }
  };

  if (alreadyConfirmed) {
    return (
      <section className="payroll-confirm payroll-confirm-success">
        <div className="payroll-confirm-heading">
          <div className="payroll-confirm-icon"><CheckCircle2 /></div>
          <div className="payroll-confirm-content">
            <span className="section-kicker">ĐÃ HOÀN TẤT XÁC NHẬN</span>
            <h3>Phiếu lương đã được xác nhận</h3>
            <p>Thông tin xác nhận đã được ghi nhận an toàn trên hệ thống.</p>
          </div>
        </div>
        <div className="payroll-confirm-aside">
          {payslip.signedAt && <span className="payroll-confirm-time"><Clock3 />{new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(payslip.signedAt))}</span>}
          {onFeedback && <button type="button" className="payroll-feedback-button" onClick={() => onFeedback()}><MessageSquareText />Gửi phản hồi<ArrowRight /></button>}
        </div>
      </section>
    );
  }

  if (waitingFeedback) {
    const feedbackState = FEEDBACK_STATUS[latestFeedback?.status] ?? ["Đang xử lý", 1];
    return (
      <section className="payroll-confirm payroll-confirm-warning">
        <div className="payroll-confirm-main">
          <div className="payroll-confirm-heading">
            <div className="payroll-confirm-icon"><MessageSquareText /></div>
            <div className="payroll-confirm-content">
              <span className="section-kicker">YÊU CẦU ĐANG ĐƯỢC THEO DÕI</span>
              <h3>{feedbackState[0]}</h3>
              <p>Phiếu lương tạm thời chưa thể xác nhận trong khi HR kiểm tra sai lệch. Mọi cập nhật sẽ được ghi nhận theo mã case bên cạnh.</p>
              {latestFeedback?.hrReply && <small className="payroll-confirm-reply"><b>Phản hồi mới từ HR</b>{latestFeedback.hrReply}</small>}
            </div>
          </div>
          <div className="payroll-feedback-tracker">
            {["Đã gửi", "Xác minh", "Xác nhận", "Điều chỉnh", "Hoàn tất"].map((label, index) => <div className={index < feedbackState[1] ? "is-done" : index === feedbackState[1] ? "is-active" : ""} key={label}><i>{index < feedbackState[1] ? <CheckCircle2 /> : index + 1}</i><span>{label}</span></div>)}
          </div>
        </div>
        <div className="payroll-confirm-case">
          <header><span className="warning-badge"><span className="status-dot" />{feedbackState[0]}</span><small>Kỳ {periodLabel}</small></header>
          <dl>
            <div><dt>Mã phản hồi</dt><dd>{latestFeedback?.code ?? `#${latestFeedback?.id ?? "—"}`}</dd></div>
            <div><dt>Khoản mục</dt><dd>{latestFeedback?.salaryItemLabel || "Toàn bộ phiếu lương"}</dd></div>
            <div><dt>Loại vấn đề</dt><dd>{latestFeedback?.issueTypeLabel || latestFeedback?.category || "Cần HR kiểm tra"}</dd></div>
            <div><dt>Cập nhật</dt><dd>{formatDate(latestFeedback?.updatedAt || latestFeedback?.createdAt)}</dd></div>
          </dl>
        </div>
      </section>
    );
  }

  if (!canConfirm) {
    return (
      <section className="payroll-confirm payroll-confirm-disabled">
        <div className="payroll-confirm-heading">
          <div className="payroll-confirm-icon"><ShieldCheck /></div>
          <div className="payroll-confirm-content"><span className="section-kicker">TRẠNG THÁI PHIẾU LƯƠNG</span><h3>Chưa thể xác nhận phiếu lương</h3><p>Phiếu lương hiện chưa ở trạng thái cho phép xác nhận.</p></div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="payroll-confirm">
        <div className="payroll-confirm-main">
          <div className="payroll-confirm-heading">
            <div className="payroll-confirm-icon"><ShieldCheck /></div>
            <div className="payroll-confirm-content">
              <span className="section-kicker">BƯỚC CUỐI CÙNG · KỲ {periodLabel}</span>
              <h3>Kiểm tra và phản hồi phiếu lương</h3>
              <p>Đối chiếu ngày công, thu nhập, khấu trừ và thực lĩnh. Chọn xác nhận khi thông tin chính xác, hoặc gửi phản hồi để HR kiểm tra sai lệch.</p>
            </div>
          </div>

          {message && <div className="payroll-confirm-message success"><CheckCircle2 /><span>{message}</span></div>}
          {error && <div className="payroll-confirm-message error"><AlertCircle /><span>{error}</span></div>}
          {feedbackMessage && <div className="payroll-confirm-message success"><CheckCircle2 /><span>{feedbackMessage}</span></div>}
          {feedbackError && <div className="payroll-confirm-message error"><AlertCircle /><span>{feedbackError}</span></div>}
        </div>

        <div className="payroll-confirm-actions">
          {onFeedback && <button type="button" className="payroll-feedback-button" disabled={loading || feedbackLoading} onClick={() => onFeedback()}><MessageSquareText /><span><small>Có thông tin sai lệch?</small>Gửi phản hồi</span><ArrowRight /></button>}
          <button type="button" className="payroll-confirm-button" disabled={loading || feedbackLoading} onClick={() => setConfirmDialogOpen(true)}><BadgeCheck /><span><small>Thông tin đã chính xác</small>{loading ? "Đang xác nhận..." : "Xác nhận phiếu lương"}</span><ArrowRight /></button>
        </div>
      </section>

      {confirmDialogOpen && (
        <PayrollModal
          className="payroll-confirm-dialog"
          ariaLabelledBy="payroll-confirm-title"
          initialFocusRef={checkboxRef}
          busy={loading}
          onClose={() => { setConfirmDialogOpen(false); setAccepted(false); }}
        >
          <header className="payroll-modal-header">
            <span className="payroll-modal-icon is-success"><ShieldCheck /></span>
            <div>
              <h2 id="payroll-confirm-title">Xác nhận phiếu lương</h2>
              <p>Kỳ lương {periodLabel}</p>
            </div>
            <button
              type="button"
              className="payroll-modal-close"
              aria-label="Đóng"
              disabled={loading}
              onClick={() => { setConfirmDialogOpen(false); setAccepted(false); }}
            >
              <X />
            </button>
          </header>

          <div className="payroll-confirm-body">
            <div className="payroll-confirm-employee">
              <span>Nhân viên</span>
              <strong>{payslip.employee?.fullName}</strong>
              <small>{payslip.employee?.staffId}</small>
            </div>

            <dl className="payroll-confirm-summary">
              <div>
                <dt>Thực lĩnh</dt>
                <dd>{new Intl.NumberFormat("vi-VN").format(Number(payslip.payment?.netSalary ?? 0))} ₫</dd>
              </div>
              <div>
                <dt>Ngày thanh toán</dt>
                <dd>{formatDate(payslip.period?.paymentDate)}</dd>
              </div>
            </dl>

            <p className="payroll-confirm-note">Sau khi xác nhận, hệ thống sẽ ghi nhận thời gian và tài khoản thực hiện. Nếu có sai lệch, hãy quay lại và gửi phản hồi cho HR.</p>

            <label className={`payroll-confirm-checkbox ${accepted ? "is-checked" : ""}`}>
              <input ref={checkboxRef} type="checkbox" checked={accepted} disabled={loading} onChange={(event) => setAccepted(event.target.checked)} />
              <span>Tôi đã kiểm tra và xác nhận các thông tin trên phiếu lương là chính xác.</span>
            </label>

            {error && <div className="payroll-modal-alert" role="alert"><AlertCircle /><span>{error}</span></div>}
          </div>

          <footer className="payroll-modal-footer">
            <button type="button" className="secondary-button" disabled={loading} onClick={() => { setConfirmDialogOpen(false); setAccepted(false); }}>Quay lại</button>
            <button type="button" className="primary-button" disabled={!accepted || loading} onClick={handleConfirm}><BadgeCheck className={loading ? "spin" : ""} />{loading ? "Đang xác nhận..." : "Đồng ý xác nhận"}</button>
          </footer>
        </PayrollModal>
      )}
    </>
  );
}
