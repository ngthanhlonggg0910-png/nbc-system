import { Save, X } from "lucide-react";

export default function AttendanceDeviceModal({
  device,
  onChange,
  onClose,
  onSubmit,
  loading = false,
}) {
  if (!device) return null;

  const updateField = (field, value) => {
    onChange({
      ...device,
      [field]: value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSubmit(device);
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={() => {
        if (!loading) onClose();
      }}
    >
      <form
        className="reply-modal"
        onSubmit={handleSubmit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className="modal-close"
          type="button"
          onClick={onClose}
          disabled={loading}
          aria-label="Đóng"
        >
          <X />
        </button>

        <h2>{device.id === 0 ? "Thêm máy chấm công" : "Sửa máy chấm công"}</h2>

        <label>
          Mã máy
          <input
            required
            value={device.code ?? ""}
            disabled={loading}
            onChange={(event) => updateField("code", event.target.value)}
          />
        </label>

        <label>
          Tên máy
          <input
            required
            value={device.name ?? ""}
            disabled={loading}
            onChange={(event) => updateField("name", event.target.value)}
          />
        </label>

        <label>
          IP
          <input
            required
            value={device.ip ?? ""}
            disabled={loading}
            onChange={(event) => updateField("ip", event.target.value)}
          />
        </label>

        <label>
          Cổng
          <input
            required
            type="number"
            min="1"
            max="65535"
            value={device.port ?? 4370}
            disabled={loading}
            onChange={(event) =>
              updateField("port", Number(event.target.value))
            }
          />
        </label>

        <label>
          Vị trí
          <input
            required
            value={device.location ?? ""}
            disabled={loading}
            onChange={(event) => updateField("location", event.target.value)}
          />
        </label>

        <div className="switch-field">
          <span>Bật thiết bị</span>

          <label className="switch">
            <input
              type="checkbox"
              checked={Boolean(device.enabled)}
              disabled={loading}
              onChange={(event) => updateField("enabled", event.target.checked)}
            />

            <span className={`slider ${device.enabled ? "enabled" : ""}`}>
              <span className="slider-text">
                {device.enabled ? "ON" : "OFF"}
              </span>

              <span className="slider-thumb" />
            </span>
          </label>
        </div>

        <button className="primary-button" type="submit" disabled={loading}>
          <Save />

          {loading ? "Đang lưu..." : device.id === 0 ? "Thêm" : "Lưu"}
        </button>
      </form>
    </div>
  );
}
