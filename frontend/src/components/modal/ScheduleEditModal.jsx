import { useEffect, useState } from "react";
import { Save, X } from "lucide-react";
import "./ScheduleEditModal.css";

export default function ScheduleEditModal({
  schedule,
  onClose,
  onSubmit,
  loading = false,
}) {
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    time: "",
    frequency: "",
    enabled: true,
  });

  useEffect(() => {
    if (!schedule) return;

    setFormData({
      id: schedule.id ?? "",
      name: schedule.name ?? "",
      time: String(schedule.time ?? "").slice(0, 5),
      frequency: schedule.frequency ?? "",
      enabled: Boolean(schedule.enabled),
    });
  }, [schedule]);

  if (!schedule) return null;

  const handleChange = (field, value) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedName = formData.name.trim();

    if (!trimmedName) {
      return;
    }

    await onSubmit({
      ...schedule,
      name: trimmedName,
      time: formData.time,
      enabled: formData.enabled,
    });
  };

  return (
    <div
      className="schedule-edit-backdrop"
      onMouseDown={() => {
        if (!loading) onClose();
      }}
    >
      <form
        className="schedule-edit-modal"
        onSubmit={handleSubmit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="schedule-edit-header">
          <h2>Sửa lịch đồng bộ</h2>

          <button
            type="button"
            className="schedule-edit-close"
            onClick={onClose}
            disabled={loading}
            aria-label="Đóng"
          >
            <X size={22} />
          </button>
        </div>

        <div className="schedule-edit-grid">
          <label className="schedule-edit-field schedule-edit-field-full">
            <span>Tên lịch</span>

            <input
              type="text"
              required
              value={formData.name}
              disabled={loading}
              onChange={(event) => handleChange("name", event.target.value)}
              placeholder="Nhập tên lịch đồng bộ"
            />
          </label>

          <label className="schedule-edit-field">
            <span>Tần suất</span>

            <input
              type="text"
              value={formData.frequency || "Hàng ngày"}
              disabled
            />
          </label>

          <label className="schedule-edit-field">
            <span>Giờ chạy</span>

            <input
              type="time"
              required
              value={formData.time}
              disabled={loading}
              onChange={(event) => handleChange("time", event.target.value)}
            />
          </label>

          <div className="schedule-edit-field schedule-edit-field-full">
            <span>Trạng thái lịch</span>

            <div className="schedule-edit-toggle-row">
              <label className="schedule-edit-toggle">
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  disabled={loading}
                  onChange={(event) =>
                    handleChange("enabled", event.target.checked)
                  }
                />

                <span
                  className={`schedule-edit-toggle-track ${
                    formData.enabled ? "enabled" : ""
                  }`}
                >
                  <span className="schedule-edit-toggle-text">
                    {formData.enabled ? "ON" : "OFF"}
                  </span>

                  <span className="schedule-edit-toggle-thumb" />
                </span>
              </label>
            </div>
          </div>
        </div>

        <button
          className="schedule-edit-submit"
          type="submit"
          disabled={loading || !formData.name.trim() || !formData.time}
        >
          <Save size={20} />

          {loading ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </form>
    </div>
  );
}
