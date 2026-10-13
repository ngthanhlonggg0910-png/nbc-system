import { useEffect, useState } from "react";
import { X } from "lucide-react";

const emptyShift = {
  name: "",
  startTime: "08:00",
  endTime: "17:00",
  breakStart: "12:00",
  breakEnd: "13:00",
  effectiveDate: "2026-08-05",
  isActive: true,
};

function validateShift(values) {
  const errors = {};
  if (!values.name.trim()) errors.name = "Vui lòng nhập tên ca.";
  if (values.startTime === values.endTime)
    errors.endTime = "Giờ kết thúc phải khác giờ bắt đầu.";
  if (values.startTime >= values.endTime)
    errors.endTime = "Bước này chỉ hỗ trợ ca làm việc trong cùng một ngày.";
  if (values.breakStart >= values.breakEnd)
    errors.breakEnd = "Giờ kết thúc nghỉ phải sau giờ bắt đầu nghỉ.";
  if (values.breakStart < values.startTime || values.breakEnd > values.endTime)
    errors.breakEnd = "Khoảng nghỉ phải nằm trong thời gian làm việc.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.effectiveDate))
    errors.effectiveDate = "Vui lòng chọn ngày hiệu lực.";
  return errors;
}

export function ShiftFormModal({
  shift,
  saving,
  serverError,
  onClose,
  onSave,
}) {
  const [values, setValues] = useState(emptyShift);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setValues(shift ? { ...emptyShift, ...shift } : emptyShift);
    setErrors({});
  }, [shift]);

  function updateField(event) {
    const { name, value, checked, type } = event.target;
    setValues((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    setErrors((current) => ({ ...current, [name]: "" }));
  }

  function submit(event) {
    event.preventDefault();
    const nextErrors = validateShift(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) onSave(values);
  }

  return (
    <div className="shift-modal-backdrop" role="presentation">
      <section
        className="shift-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shift-form-title"
      >
        <header>
          <div>
            <small>QUẢN LÝ CA</small>
            <h2 id="shift-form-title">
              {shift ? "Chỉnh sửa ca làm việc" : "Tạo ca làm việc"}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Đóng"
            onClick={onClose}
            disabled={saving}
          >
            <X />
          </button>
        </header>
        <form onSubmit={submit}>
          <label className="shift-field shift-field-wide">
            Tên ca
            <input
              name="name"
              value={values.name}
              onChange={updateField}
              placeholder="Ví dụ: Ca hành chính"
            />
            {errors.name && <em>{errors.name}</em>}
          </label>
          <label className="shift-field">
            Giờ bắt đầu
            <input
              type="time"
              name="startTime"
              value={values.startTime}
              onChange={updateField}
            />
          </label>
          <label className="shift-field">
            Giờ kết thúc
            <input
              type="time"
              name="endTime"
              value={values.endTime}
              onChange={updateField}
            />
            {errors.endTime && <em>{errors.endTime}</em>}
          </label>
          <label className="shift-field">
            Bắt đầu nghỉ
            <input
              type="time"
              name="breakStart"
              value={values.breakStart}
              onChange={updateField}
            />
          </label>
          <label className="shift-field">
            Kết thúc nghỉ
            <input
              type="time"
              name="breakEnd"
              value={values.breakEnd}
              onChange={updateField}
            />
            {errors.breakEnd && <em>{errors.breakEnd}</em>}
          </label>
          <label className="shift-field shift-field-wide">
            Ngày hiệu lực
            <input
              type="date"
              name="effectiveDate"
              value={values.effectiveDate}
              onChange={updateField}
            />
            {errors.effectiveDate && <em>{errors.effectiveDate}</em>}
          </label>
          <label className="shift-switch shift-field-wide">
            <input
              type="checkbox"
              name="isActive"
              checked={values.isActive}
              onChange={updateField}
            />
            <span />
            Đang hoạt động
          </label>
          {serverError && <p className="shift-form-error">{serverError}</p>}
          <footer>
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={saving}
            >
              Hủy
            </button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? "Đang lưu…" : shift ? "Lưu thay đổi" : "Tạo ca"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
