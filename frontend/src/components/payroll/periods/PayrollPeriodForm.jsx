import { useEffect, useState } from "react";
import {
  CalendarDays,
  RotateCcw,
  Save,
  X,
} from "lucide-react";

const EMPTY_FORM = {
  periodCode: "",
  periodName: "",
  startDate: "",
  endDate: "",
  paymentDate: "",
};

const toDateInputValue = (value) => {
  if (!value) {
    return "";
  }

  return String(value).slice(0, 10);
};

const normalizePeriod = (period) => {
  if (!period) {
    return EMPTY_FORM;
  }

  return {
    periodCode:
      period.periodCode ??
      period.period_code ??
      "",

    periodName:
      period.periodName ??
      period.period_name ??
      "",

    startDate: toDateInputValue(
      period.startDate ??
        period.start_date,
    ),

    endDate: toDateInputValue(
      period.endDate ??
        period.end_date,
    ),

    paymentDate: toDateInputValue(
      period.paymentDate ??
        period.payment_date,
    ),
  };
};

const fieldStyle = {
  display: "grid",
  gap: "7px",
  minWidth: 0,
};

const labelStyle = {
  color: "#526377",
  fontSize: "10px",
  fontWeight: 800,
};

const inputStyle = {
  width: "100%",
  minWidth: 0,
  minHeight: "42px",
  boxSizing: "border-box",
  padding: "0 12px",
  color: "#344e64",
  background: "#f8fafb",
  border: "1px solid #dce5eb",
  borderRadius: "10px",
  outline: 0,
  fontFamily: "inherit",
  fontSize: "10px",
};

const PayrollPeriodForm = ({
  initialValues = null,
  loading = false,
  onSubmit,
  onCancel,
}) => {
  const [form, setForm] = useState(
    normalizePeriod(initialValues),
  );

  const [error, setError] =
    useState("");

  const isEdit = Boolean(
    initialValues?.id,
  );

  useEffect(() => {
    setForm(
      normalizePeriod(initialValues),
    );

    setError("");
  }, [initialValues]);

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  };

  const validateForm = () => {
    if (!form.periodCode) {
      return "Vui lòng chọn kỳ lương.";
    }

    if (!form.periodName.trim()) {
      return "Vui lòng nhập tên kỳ lương.";
    }

    if (!form.startDate) {
      return "Vui lòng chọn ngày bắt đầu.";
    }

    if (!form.endDate) {
      return "Vui lòng chọn ngày kết thúc.";
    }

    if (!form.paymentDate) {
      return "Vui lòng chọn ngày thanh toán.";
    }

    if (
      form.startDate >
      form.endDate
    ) {
      return (
        "Ngày bắt đầu không được " +
        "sau ngày kết thúc."
      );
    }

    return "";
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const validationError =
      validateForm();

    if (validationError) {
      setError(
        validationError,
      );

      return;
    }

    onSubmit?.({
      periodCode:
        form.periodCode,

      periodName:
        form.periodName.trim(),

      startDate:
        form.startDate,

      endDate:
        form.endDate,

      paymentDate:
        form.paymentDate,
    });
  };

  const handleReset = () => {
    setForm(
      normalizePeriod(
        initialValues,
      ),
    );

    setError("");
  };

  return (
    <>
      <style>
        {`
          .payroll-period-form {
            padding: 22px;
          }

          .payroll-period-form-main-grid {
            display: grid;
            grid-template-columns:
              minmax(180px, 0.8fr)
              minmax(280px, 1.6fr);
            gap: 14px;
          }

          .payroll-period-form-date-grid {
            display: grid;
            grid-template-columns:
              repeat(
                3,
                minmax(180px, 1fr)
              );
            gap: 14px;
            margin-top: 16px;
          }

          .payroll-period-form-actions {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            flex-wrap: wrap;
            gap: 9px;
            margin-top: 22px;
            padding-top: 18px;
            border-top:
              1px solid #edf1f4;
          }

          .payroll-period-form
            input:focus {
            border-color: var(--teal);
            box-shadow:
              0 0 0 3px
              rgba(7, 143, 153, 0.09);
          }

          .payroll-period-form
            input:disabled {
            cursor: not-allowed;
            opacity: 0.7;
          }

          @media (max-width: 760px) {
            .payroll-period-form {
              padding: 16px;
            }

            .payroll-period-form-main-grid,
            .payroll-period-form-date-grid {
              grid-template-columns:
                minmax(0, 1fr);
              gap: 12px;
            }

            .payroll-period-form-date-grid {
              margin-top: 12px;
            }

            .payroll-period-form-actions {
              display: grid;
              grid-template-columns:
                minmax(0, 1fr)
                minmax(0, 1fr);
              gap: 8px;
              margin-top: 18px;
              padding-top: 16px;
            }

            .payroll-period-form-actions
              .secondary-button {
              width: 100%;
              min-width: 0;
            }

            .payroll-period-form-actions
              .primary-button {
              grid-column: 1 / -1;
              width: 100%;
              min-width: 0;
            }
          }

          @media (max-width: 420px) {
            .payroll-period-form {
              padding: 14px 12px 16px;
            }

            .payroll-period-form-actions {
              grid-template-columns:
                1fr 1fr;
            }
          }
        `}
      </style>

      <form
        className="payroll-period-form"
        onSubmit={handleSubmit}
        noValidate
      >
        {error && (
          <div
            role="alert"
            style={{
              marginBottom: "18px",
              padding: "11px 13px",
              color: "#b43e4b",
              background: "#fff0f1",
              border:
                "1px solid #f7d9dc",
              borderRadius: "9px",
              fontSize: "10px",
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        )}

        <div className="payroll-period-form-main-grid">
          <label style={fieldStyle}>
            <span style={labelStyle}>
              Kỳ lương
            </span>

            <div
              style={{
                position: "relative",
                minWidth: 0,
              }}
            >
              <CalendarDays
                style={{
                  position:
                    "absolute",
                  left: "12px",
                  top: "50%",
                  width: "16px",
                  height: "16px",
                  color: "#688097",
                  transform:
                    "translateY(-50%)",
                  pointerEvents:
                    "none",
                }}
              />

              <input
                name="periodCode"
                type="month"
                value={
                  form.periodCode
                }
                onChange={
                  handleChange
                }
                disabled={
                  loading ||
                  isEdit
                }
                style={{
                  ...inputStyle,
                  paddingLeft:
                    "38px",
                }}
              />
            </div>
          </label>

          <label style={fieldStyle}>
            <span style={labelStyle}>
              Tên kỳ lương
            </span>

            <input
              name="periodName"
              type="text"
              value={
                form.periodName
              }
              onChange={
                handleChange
              }
              placeholder="Ví dụ: Kỳ lương tháng 09/2026"
              disabled={loading}
              style={inputStyle}
            />
          </label>
        </div>

        <div className="payroll-period-form-date-grid">
          <label style={fieldStyle}>
            <span style={labelStyle}>
              Ngày bắt đầu
            </span>

            <input
              name="startDate"
              type="date"
              value={
                form.startDate
              }
              onChange={
                handleChange
              }
              disabled={loading}
              style={inputStyle}
            />
          </label>

          <label style={fieldStyle}>
            <span style={labelStyle}>
              Ngày kết thúc
            </span>

            <input
              name="endDate"
              type="date"
              value={
                form.endDate
              }
              onChange={
                handleChange
              }
              disabled={loading}
              style={inputStyle}
            />
          </label>

          <label style={fieldStyle}>
            <span style={labelStyle}>
              Ngày thanh toán
            </span>

            <input
              name="paymentDate"
              type="date"
              value={
                form.paymentDate
              }
              onChange={
                handleChange
              }
              disabled={loading}
              style={inputStyle}
            />
          </label>
        </div>

        <div className="payroll-period-form-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={
              handleReset
            }
            disabled={loading}
          >
            <RotateCcw />
            Đặt lại
          </button>

          {onCancel && (
            <button
              type="button"
              className="secondary-button"
              onClick={
                onCancel
              }
              disabled={loading}
            >
              <X />
              Hủy
            </button>
          )}

          <button
            type="submit"
            className="primary-button"
            disabled={loading}
          >
            <Save />

            {loading
              ? "Đang lưu..."
              : isEdit
                ? "Lưu thay đổi"
                : "Tạo kỳ lương"}
          </button>
        </div>
      </form>
    </>
  );
};

export default PayrollPeriodForm;
