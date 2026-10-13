import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  FileCheck2,
  Paperclip,
  MessageSquareText,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";

import PayrollModal from "@/components/payroll/PayrollModal";

const ISSUE_OPTIONS = [
  ["attendance", "Sai ngày công", "attendance"],
  ["base_salary", "Sai lương cơ bản", "income"],
  ["overtime", "Sai tăng ca", "income"],
  ["allowance", "Sai phụ cấp", "income"],
  ["bonus_kpi", "Sai thưởng / KPI", "income"],
  ["insurance", "Sai BHXH / BHYT / BHTN", "deduction"],
  ["personal_income_tax", "Sai thuế TNCN", "deduction"],
  ["deduction", "Sai khấu trừ", "deduction"],
  ["gross_income", "Sai tổng thu nhập", "income"],
  ["net_salary", "Sai thực lĩnh", "income"],
  ["other", "Khác", "other"],
];

const ITEM_ISSUE_RULES = [
  [/(BHXH|BHYT|BHTN|INSURANCE)/i, "insurance"],
  [/(TNCN|PIT|TAX)/i, "personal_income_tax"],
  [/(OVERTIME|TANG_CA|OT_)/i, "overtime"],
  [/(ALLOW|PHU_CAP)/i, "allowance"],
  [/(BONUS|KPI|THUONG)/i, "bonus_kpi"],
  [/(BASE|LUONG_CO_BAN)/i, "base_salary"],
  [/ATTENDANCE/i, "attendance"],
];

const AUTO_ITEM_PATTERNS = {
  base_salary: /(BASE_SALARY|LUONG_CO_BAN)/i,
  overtime: /(OVERTIME|TANG_CA|OT_)/i,
  allowance: /(ALLOW|PHU_CAP)/i,
  bonus_kpi: /(BONUS|KPI|THUONG)/i,
  insurance: /(SOCIAL_INSURANCE|HEALTH_INSURANCE|UNEMPLOYMENT_INSURANCE|BHXH|BHYT|BHTN)/i,
  personal_income_tax: /(PERSONAL_INCOME_TAX|TNCN|PIT)/i,
};

function inferItemIssue(item) {
  return ITEM_ISSUE_RULES.find(([pattern]) => pattern.test(String(item?.code ?? "")))?.[1]
    ?? (item?.category === "deduction" ? "deduction" : "gross_income");
}

function formatPeriod(periodCode) {
  const [year, month] = String(periodCode ?? "").split("-");
  return month && year ? `${month}/${year}` : "--/----";
}

export default function PayrollFeedbackModal({
  payslip,
  initialItem = null,
  loading = false,
  error = null,
  onClose,
  onSubmit,
}) {
  const initialIssue = initialItem ? inferItemIssue(initialItem) : "attendance";
  const [issueType, setIssueType] = useState(initialIssue);
  const [salaryItemId, setSalaryItemId] = useState(
    initialItem?.salaryItemId ? String(initialItem.salaryItemId) : "",
  );
  const [content, setContent] = useState("");
  const [proposedValue, setProposedValue] = useState("");
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentError, setAttachmentError] = useState("");
  const issueSelectRef = useRef(null);

  const salaryItems = useMemo(() => {
    const allItems = [
      ...(payslip?.income?.items ?? []),
      ...(payslip?.deductions?.items ?? []),
    ];
    return allItems.filter((item) => {
      if (["attendance", "net_salary", "other"].includes(issueType)) return false;
      if (issueType === "gross_income") return item.category === "income";
      if (issueType === "deduction") return item.category === "deduction";
      return inferItemIssue(item) === issueType;
    });
  }, [payslip, issueType]);

  const expectedItemPattern = AUTO_ITEM_PATTERNS[issueType] ?? null;
  const expectedItem = useMemo(
    () => expectedItemPattern
      ? salaryItems.find((item) => expectedItemPattern.test(String(item.code ?? ""))) ?? null
      : null,
    [expectedItemPattern, salaryItems],
  );
  const missingExpectedItem = Boolean(expectedItemPattern && !expectedItem);

  useEffect(() => {
    if (!expectedItemPattern) return;
    setSalaryItemId(expectedItem?.salaryItemId ? String(expectedItem.salaryItemId) : "");
  }, [expectedItem, expectedItemPattern]);

  const category = ISSUE_OPTIONS.find(([value]) => value === issueType)?.[2] ?? "other";
  const issueLabel = ISSUE_OPTIONS.find(([value]) => value === issueType)?.[1] ?? "Khác";
  const selectedItem = salaryItems.find((item) => String(item.salaryItemId) === salaryItemId) ?? null;
  const completedSteps = [Boolean(issueType), content.trim().length >= 10, Boolean(attachmentFile)].filter(Boolean).length;
  const valid = content.trim().length >= 10 && !missingExpectedItem;

  const submit = async (event) => {
    event.preventDefault();
    if (!valid || loading) return;

    await onSubmit?.(payslip.id, {
      issueType,
      category,
      salaryItemId: salaryItemId ? Number(salaryItemId) : null,
      proposedValue: proposedValue.trim() || null,
      priority: issueType === "net_salary" ? "high" : "normal",
      content: content.trim(),
      attachmentFile,
    });
  };

  return (
    <PayrollModal
      as="form"
      className="payroll-feedback-dialog payroll-feedback-dialog-v2"
      ariaLabelledBy="payroll-feedback-title"
      initialFocusRef={issueSelectRef}
      busy={loading}
      onClose={onClose}
      onSubmit={submit}
    >
      <header className="payroll-modal-header">
        <span className="payroll-modal-icon"><MessageSquareText /></span>
        <div>
          <span className="payroll-modal-eyebrow">PHẢN HỒI PHIẾU LƯƠNG</span>
          <h2 id="payroll-feedback-title">Gửi yêu cầu kiểm tra lương</h2>
          <p>Kỳ {formatPeriod(payslip?.period?.code)} · HR sẽ tiếp nhận theo mã phản hồi riêng</p>
        </div>
        <button className="payroll-modal-close" type="button" aria-label="Đóng" disabled={loading} onClick={onClose}><X /></button>
      </header>

      <div className="payroll-feedback-body">
        <div className="payroll-feedback-context payroll-feedback-context-v2">
          <span><ShieldCheck />Nhân viên<strong>{payslip?.employee?.fullName}</strong><small>{payslip?.employee?.staffId}</small></span>
          <span><FileCheck2 />Phiếu lương<strong>#{payslip?.id}</strong><small>Kỳ {formatPeriod(payslip?.period?.code)}</small></span>
          <span><Banknote />Thực lĩnh<strong>{new Intl.NumberFormat("vi-VN").format(Number(payslip?.payment?.netSalary ?? 0))} ₫</strong><small>Dữ liệu trên phiếu hiện tại</small></span>
        </div>

        <div className="payroll-feedback-steps" aria-label="Tiến trình gửi phản hồi">
          <div className="is-done"><i><CheckCircle2 /></i><span><b>1</b> Chọn sai lệch</span></div>
          <div className={content.trim().length >= 10 ? "is-done" : "is-active"}><i>{content.trim().length >= 10 ? <CheckCircle2 /> : 2}</i><span><b>2</b> Mô tả vấn đề</span></div>
          <div className={attachmentFile ? "is-done" : ""}><i>{attachmentFile ? <CheckCircle2 /> : 3}</i><span><b>3</b> Thêm minh chứng</span></div>
        </div>

        <div className="payroll-feedback-layout">
        <section className="payroll-feedback-section payroll-feedback-section-issue">
          <header><span>01</span><div><strong>Xác định thông tin sai lệch</strong><small>Chọn đúng nhóm để yêu cầu được chuyển tới HR nhanh hơn.</small></div></header>

        <label htmlFor="payroll-feedback-issue">
          <span>Loại vấn đề <b>*</b></span>
          <select
            id="payroll-feedback-issue"
            ref={issueSelectRef}
            value={issueType}
            onChange={(event) => { setIssueType(event.target.value); setSalaryItemId(""); }}
          >
            {ISSUE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>

        <label htmlFor="payroll-feedback-item">
          <span>Khoản mục liên quan</span>
          <select id="payroll-feedback-item" value={salaryItemId} onChange={(event) => setSalaryItemId(event.target.value)}>
            <option value="">Không chọn khoản mục cụ thể</option>
            {salaryItems.map((item) => (
              <option key={item.salaryItemId} value={item.salaryItemId}>
                {item.label}
              </option>
            ))}
          </select>
          {missingExpectedItem && (
            <small className="payroll-feedback-field-error">
              Phiếu lương này không có khoản tương ứng để phản hồi.
            </small>
          )}
        </label>

        {selectedItem && (
          <div className="payroll-feedback-selected-item">
            <FileCheck2 />
            <span><small>KHOẢN MỤC ĐANG PHẢN HỒI</small><strong>{selectedItem.label}</strong><em>{selectedItem.code || issueLabel}</em></span>
            <b>{new Intl.NumberFormat("vi-VN").format(Number(selectedItem.amount ?? 0))} ₫</b>
          </div>
        )}
        </section>

        <section className="payroll-feedback-section payroll-feedback-section-description">
          <header><span>02</span><div><strong>Mô tả và giá trị đề nghị</strong><small>Nêu rõ số liệu đang hiển thị và số liệu bạn cho là chính xác.</small></div></header>

        <label htmlFor="payroll-feedback-content">
          <span>Mô tả vấn đề <b>*</b></span>
          <textarea
            id="payroll-feedback-content"
            value={content}
            minLength={10}
            maxLength={5000}
            rows={5}
            placeholder="Ví dụ: Số ngày công tháng này của tôi là 25 ngày nhưng phiếu lương đang tính 23 ngày..."
            onChange={(event) => setContent(event.target.value)}
          />
          <small>{content.trim().length} / 5000 · Tối thiểu 10 ký tự</small>
        </label>

        <label htmlFor="payroll-feedback-value">
          <span>Giá trị đề nghị kiểm tra</span>
          <input
            id="payroll-feedback-value"
            value={proposedValue}
            maxLength={255}
            placeholder="Ví dụ: 25 ngày hoặc 1.200.000 ₫"
            onChange={(event) => setProposedValue(event.target.value)}
          />
        </label>
        </section>

        <section className="payroll-feedback-section payroll-feedback-evidence">
          <header><span>03</span><div><strong>Minh chứng đối chiếu</strong><small>Không bắt buộc, nhưng giúp HR xác minh nhanh và chính xác hơn.</small></div></header>

        <label className="payroll-feedback-attachment" htmlFor="payroll-feedback-file">
          <span className={attachmentFile ? "has-file" : ""}><Paperclip /><b>{attachmentFile ? attachmentFile.name : "Kéo thả hoặc chọn tệp minh chứng"}</b><small>{attachmentFile ? `${Math.max(1, Math.round(attachmentFile.size / 1024))} KB · Sẵn sàng gửi` : "PNG, JPG hoặc PDF · Tối đa 5 MB"}</small></span>
          <input
            id="payroll-feedback-file"
            type="file"
            accept="image/png,image/jpeg,application/pdf"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              if (file && file.size > 5 * 1024 * 1024) {
                setAttachmentFile(null);
                setAttachmentError("Tệp minh chứng tối đa 5 MB");
                event.target.value = "";
                return;
              }
              setAttachmentError("");
              setAttachmentFile(file);
            }}
          />
          <small><ShieldCheck /> Tệp được lưu an toàn và chỉ HR phụ trách có quyền truy cập.</small>
        </label>
        </section>
        </div>

        {attachmentError && <div className="payroll-modal-alert" role="alert"><AlertCircle /><span>{attachmentError}</span></div>}
        {error && <div className="payroll-modal-alert" role="alert"><AlertCircle /><span>{error}</span></div>}
      </div>

      <footer className="payroll-modal-footer">
        <span className="payroll-feedback-readiness"><i style={{ "--progress": `${Math.round(completedSteps / 3 * 100)}%` }} /><b>{valid ? "Sẵn sàng gửi" : "Cần mô tả tối thiểu 10 ký tự"}</b></span>
        <button type="button" className="secondary-button" disabled={loading} onClick={onClose}>Hủy</button>
        <button type="submit" className="primary-button" disabled={!valid || loading}>
          <Send className={loading ? "spin" : ""} />{loading ? "Đang gửi..." : "Gửi phản hồi"}
        </button>
      </footer>
    </PayrollModal>
  );
}
