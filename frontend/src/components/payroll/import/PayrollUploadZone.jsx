import {
  AlertCircle,
  Calculator,
  Code2,
  Download,
  FileSpreadsheet,
  PenLine,
  Plus,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const SOURCE_OPTIONS = [
  {
    id: "excel",
    title: "Tải file Excel",
    description: "Dùng file mẫu .xlsx cho dữ liệu hàng loạt",
    icon: FileSpreadsheet,
  },
  {
    id: "html",
    title: "Tải bảng HTML",
    description: "Đọc bảng <table> xuất từ hệ thống khác",
    icon: Code2,
  },
  {
    id: "manual",
    title: "Cập nhật thủ công",
    description: "Nhập nhanh một hoặc vài nhân viên",
    icon: PenLine,
  },
];

const EMPTY_MANUAL_ROW = {
  staffId: "",
  grossIncome: "",
  taxableIncome: "",
  totalDeductions: "",
  netSalary: "",
};

const getPeriodName = (period) =>
  period?.periodName ?? period?.period_name ?? period?.periodCode ?? period?.period_code ?? `Kỳ lương #${period?.id ?? ""}`;

const getPeriodCode = (period) => period?.periodCode ?? period?.period_code ?? "";

const formatFileSize = (bytes) => {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
};

const moneyNumber = (value) => {
  const number = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(number) ? Math.max(0, number) : 0;
};

const PayrollUploadZone = ({
  periods = [],
  payrollPeriodId = "",
  file = null,
  sourceType = "excel",
  manualRows = [],
  loading = false,
  error = "",
  onPeriodChange,
  onFileChange,
  onSourceTypeChange,
  onManualRowsChange,
  onUpload,
  onDownloadTemplate,
}) => {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState("");

  const draftPeriods = useMemo(
    () => periods.filter((period) => String(period?.status ?? "").toLowerCase() === "draft"),
    [periods],
  );

  useEffect(() => {
    setFileError("");
    if (inputRef.current) inputRef.current.value = "";
  }, [sourceType]);

  const source = SOURCE_OPTIONS.find((item) => item.id === sourceType) ?? SOURCE_OPTIONS[0];
  const isManual = sourceType === "manual";
  const normalizedRows = manualRows.length ? manualRows : [EMPTY_MANUAL_ROW];
  const manualReady = normalizedRows.some((row) => String(row?.staffId || "").trim());

  const validateFile = (selectedFile) => {
    if (!selectedFile) return "";
    const fileName = String(selectedFile.name ?? "").toLowerCase();
    const accepted = sourceType === "html"
      ? fileName.endsWith(".html") || fileName.endsWith(".htm")
      : fileName.endsWith(".xlsx");
    if (!accepted) {
      return sourceType === "html"
        ? "Vui lòng chọn file HTML định dạng .html hoặc .htm."
        : "Vui lòng chọn file Excel định dạng .xlsx.";
    }
    const maxSize = sourceType === "html" ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      return `File ${sourceType === "html" ? "HTML" : "Excel"} không được vượt quá ${sourceType === "html" ? 5 : 10} MB.`;
    }
    return "";
  };

  const selectFile = (selectedFile) => {
    const validationError = validateFile(selectedFile);
    setFileError(validationError);
    onFileChange?.(validationError ? null : selectedFile);
    if (validationError && inputRef.current) inputRef.current.value = "";
  };

  const updateManualRow = (index, field, value) => {
    const next = normalizedRows.map((row, rowIndex) => {
      if (rowIndex !== index) return row;
      const updated = { ...row, [field]: value };
      if (field === "grossIncome" && !String(row.taxableIncome ?? "").trim()) {
        updated.taxableIncome = value;
      }
      if (field === "grossIncome" || field === "totalDeductions") {
        updated.netSalary = String(
          Math.max(0, moneyNumber(updated.grossIncome) - moneyNumber(updated.totalDeductions)),
        );
      }
      return updated;
    });
    onManualRowsChange?.(next);
  };

  const addManualRow = () => onManualRowsChange?.([...normalizedRows, { ...EMPTY_MANUAL_ROW }]);
  const removeManualRow = (index) => {
    const next = normalizedRows.filter((_, rowIndex) => rowIndex !== index);
    onManualRowsChange?.(next.length ? next : [{ ...EMPTY_MANUAL_ROW }]);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (loading || !payrollPeriodId || (isManual ? !manualReady : !file)) return;
    onUpload?.();
  };

  return (
    <form className="payroll-upload-form payroll-source-form" onSubmit={handleSubmit} noValidate>
      <div className="payroll-upload-toolbar">
        <div className="payroll-upload-head">
          <span className="payroll-upload-label">Kỳ lương cần cập nhật</span>
          <button type="button" className="secondary-button payroll-template-btn" onClick={() => onDownloadTemplate?.(isManual ? "excel" : sourceType)} disabled={loading}>
            <Download /> Tải file mẫu
          </button>
        </div>
        <label className="payroll-upload-field">
          <select
            className="payroll-upload-select"
            value={payrollPeriodId}
            onChange={(event) => onPeriodChange?.(event.target.value)}
            disabled={loading}
          >
            <option value="">Chọn kỳ lương bản nháp</option>
            {draftPeriods.map((period) => (
              <option key={period.id} value={period.id}>
                {getPeriodName(period)}{getPeriodCode(period) ? ` (${getPeriodCode(period)})` : ""}
              </option>
            ))}
          </select>
          <span className="payroll-upload-note">Mọi nguồn dữ liệu đều được kiểm tra trước khi ghi vào kỳ lương.</span>
        </label>
      </div>

      <section className="payroll-source-picker" aria-label="Phương thức nhập dữ liệu">
        <div className="payroll-source-picker__heading">
          <div>
            <span>PHƯƠNG THỨC NHẬP</span>
            <strong>Chọn cách đưa dữ liệu lương vào hệ thống</strong>
          </div>
          <small>Chung một quy trình kiểm tra và xác nhận</small>
        </div>
        <div className="payroll-source-picker__grid">
          {SOURCE_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <button
                type="button"
                key={option.id}
                className={`payroll-source-card ${sourceType === option.id ? "is-active" : ""}`}
                onClick={() => onSourceTypeChange?.(option.id)}
                disabled={loading}
              >
                <span className="payroll-source-card__icon"><Icon /></span>
                <span><strong>{option.title}</strong><small>{option.description}</small></span>
                <i>{sourceType === option.id ? "Đang chọn" : "Chọn"}</i>
              </button>
            );
          })}
        </div>
      </section>

      {!isManual ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={sourceType === "html" ? ".html,.htm,text/html" : ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}
            onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
            disabled={loading}
            hidden
          />
          <div
            className={`payroll-upload-zone ${dragActive ? "dragging" : ""} ${loading ? "disabled" : ""}`}
            role="button"
            tabIndex={loading ? -1 : 0}
            onClick={() => !loading && inputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                if (!loading) inputRef.current?.click();
              }
            }}
            onDragOver={(event) => { event.preventDefault(); if (!loading) setDragActive(true); }}
            onDragLeave={(event) => { event.preventDefault(); setDragActive(false); }}
            onDrop={(event) => {
              event.preventDefault();
              setDragActive(false);
              if (!loading) selectFile(event.dataTransfer.files?.[0] ?? null);
            }}
          >
            <div className="payroll-upload-zone-content">
              <div className="payroll-upload-zone-icon">{sourceType === "html" ? <Code2 /> : <UploadCloud />}</div>
              <strong>Chọn hoặc kéo thả {sourceType === "html" ? "bảng HTML" : "file Excel"}</strong>
              <span>
                {sourceType === "html"
                  ? "Hỗ trợ .html/.htm có thẻ <table> • Tối đa 5 MB"
                  : "Hỗ trợ .xlsx theo file mẫu • Tối đa 10 MB"}
              </span>
            </div>
          </div>
          {file && (
            <div className="payroll-upload-file">
              {sourceType === "html" ? <Code2 /> : <FileSpreadsheet />}
              <div className="payroll-upload-file-info"><strong>{file.name}</strong><span>{formatFileSize(file.size)} • Sẵn sàng kiểm tra</span></div>
              <button
                type="button"
                className="payroll-upload-clear"
                onClick={() => { setFileError(""); onFileChange?.(null); if (inputRef.current) inputRef.current.value = ""; }}
                disabled={loading}
                aria-label="Bỏ file đã chọn"
              ><X /></button>
            </div>
          )}
        </>
      ) : (
        <section className="payroll-manual-entry">
          <div className="payroll-manual-entry__heading">
            <div><Calculator /><span><strong>Cập nhật lương thủ công</strong><small>Thực lĩnh được tính nhanh bằng tổng thu nhập trừ tổng khấu trừ.</small></span></div>
            <button type="button" className="secondary-button" onClick={addManualRow} disabled={loading || normalizedRows.length >= 200}><Plus /> Thêm nhân viên</button>
          </div>
          <div className="payroll-manual-table-wrap">
            <table className="payroll-manual-table">
              <thead><tr><th>Mã nhân viên *</th><th>Tổng thu nhập *</th><th>Chịu thuế *</th><th>Khấu trừ *</th><th>Thực lĩnh *</th><th aria-label="Thao tác" /></tr></thead>
              <tbody>
                {normalizedRows.map((row, index) => (
                  <tr key={index}>
                    <td><input value={row.staffId ?? ""} onChange={(event) => updateManualRow(index, "staffId", event.target.value.toUpperCase())} placeholder="VD: NV001" maxLength={30} /></td>
                    {[
                      ["grossIncome", "Tổng thu nhập"],
                      ["taxableIncome", "Thu nhập chịu thuế"],
                      ["totalDeductions", "Tổng khấu trừ"],
                      ["netSalary", "Thực lĩnh"],
                    ].map(([field, label]) => (
                      <td key={field}><input type="number" min="0" step="1000" value={row[field] ?? ""} onChange={(event) => updateManualRow(index, field, event.target.value)} placeholder={label} /></td>
                    ))}
                    <td><button type="button" onClick={() => removeManualRow(index)} disabled={loading} aria-label={`Xóa dòng ${index + 1}`}><Trash2 /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="payroll-manual-entry__note">Tối đa 200 nhân viên/lần. Hệ thống vẫn đối chiếu mã nhân viên, kỳ lương và công thức tổng trước khi cho phép lưu.</p>
        </section>
      )}

      {(fileError || error) && <div className="payroll-upload-error" role="alert"><AlertCircle /><span>{fileError || error}</span></div>}
      <div className="payroll-upload-actions">
        <span className="payroll-upload-actions__context">Nguồn đang chọn: <strong>{source.title}</strong></span>
        <button type="submit" className="primary-button" disabled={loading || !payrollPeriodId || (isManual ? !manualReady : !file)}>
          {isManual ? <Calculator /> : <UploadCloud />}
          {loading ? "Đang kiểm tra..." : isManual ? "Kiểm tra dữ liệu thủ công" : `Kiểm tra ${sourceType === "html" ? "bảng HTML" : "file Excel"}`}
        </button>
      </div>
    </form>
  );
};

export default PayrollUploadZone;
