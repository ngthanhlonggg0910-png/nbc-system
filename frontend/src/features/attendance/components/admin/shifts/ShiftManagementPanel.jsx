import { useCallback, useEffect, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  CirclePlus,
  Pencil,
  Power,
  RefreshCw,
  Star,
  Trash2,
} from "lucide-react";
import {
  createShift,
  deleteShift,
  getShifts,
  setDefaultShift,
  updateShift,
} from "../../../api/shiftApi.js";
import {
  formatEffectiveDate,
  formatShiftTime,
} from "../../../utils/attendance-shift.utils.js";
import { ShiftFormModal } from "./ShiftFormModal";
import "../../../../../styles/globals/shift.css";

export default function ShiftManagementPanel({ onShiftChanged }) {
  const [state, setState] = useState({
    status: "loading",
    rows: [],
    error: "",
  });
  const [editingShift, setEditingShift] = useState(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  const loadShifts = useCallback(async () => {
    const controller = new AbortController();
    setState((current) => ({ ...current, status: "loading", error: "" }));
    try {
      const rows = await getShifts(controller.signal);
      setState({ status: rows.length ? "success" : "empty", rows, error: "" });
    } catch (error) {
      if (error?.code !== "ERR_CANCELED")
        setState({
          status: "error",
          rows: [],
          error: error?.message || "Không thể tải danh sách ca.",
        });
    }
    return () => controller.abort();
  }, []);

  useEffect(() => {
    loadShifts();
  }, [loadShifts]);

  function openCreate() {
    setEditingShift(undefined);
    setFormError("");
    setFormOpen(true);
  }
  function openEdit(shift) {
    setEditingShift(shift);
    setFormError("");
    setFormOpen(true);
  }

  async function saveShift(values) {
    setSaving(true);
    setFormError("");
    try {
      if (editingShift) await updateShift(editingShift.id, values);
      else await createShift(values);
      setFormOpen(false);
      setNotice(
        editingShift ? "Đã cập nhật ca làm việc." : "Đã tạo ca làm việc.",
      );
      await loadShifts();
      onShiftChanged?.();
    } catch (error) {
      setFormError(error?.message || "Không thể lưu ca làm việc.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleShift(shift) {
    await updateShift(shift.id, { isActive: !shift.isActive });
    setNotice(shift.isActive ? "Đã ngừng áp dụng ca." : "Đã bật ca làm việc.");
    await loadShifts();
    onShiftChanged?.();
  }

  async function makeDefault(shift) {
    if (!shift.isActive) {
      setNotice("Cần bật ca trước khi đặt làm mặc định.");
      return;
    }
    await setDefaultShift(shift.id, shift.effectiveDate);
    setNotice(`Đã đặt ${shift.name} làm ca mặc định.`);
    await loadShifts();
    onShiftChanged?.();
  }

  async function removeShift(shift) {
    if (shift.source === "default") {
      setNotice("Không thể xóa ca đang là mặc định.");
      return;
    }
    if (!window.confirm(`Xóa ca “${shift.name}”?`)) return;
    await deleteShift(shift.id);
    setNotice("Đã xóa ca làm việc.");
    await loadShifts();
    onShiftChanged?.();
  }

  return (
    <section className="shift-management">
      <header className="shift-management-head">
        <div>
          <small>THIẾT LẬP CHẤM CÔNG</small>
          <h2>Danh sách ca làm việc</h2>
          <p>Quản lý khung giờ và ca mặc định áp dụng cho nhân viên.</p>
        </div>
        <button className="primary-button" onClick={openCreate}>
          <CirclePlus /> Tạo ca mới
        </button>
      </header>
      {notice && (
        <div className="shift-notice">
          <CheckCircle2 /> {notice}
          <button type="button" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}
      {state.status === "loading" && (
        <div className="shift-state">
          <RefreshCw /> Đang tải danh sách ca…
        </div>
      )}
      {state.status === "error" && (
        <div className="shift-state error">
          <strong>Không thể tải danh sách ca</strong>
          <p>{state.error}</p>
          <button className="secondary-button" onClick={loadShifts}>
            Thử lại
          </button>
        </div>
      )}
      {state.status === "empty" && (
        <div className="shift-state">
          <CalendarClock />
          <strong>Chưa có ca làm việc</strong>
          <p>Hãy tạo ca đầu tiên để bắt đầu cấu hình.</p>
        </div>
      )}
      {state.status === "success" && (
        <div className="shift-grid">
          {state.rows.map((shift) => (
            <article
              className={`shift-card ${shift.source === "default" ? "is-default" : ""}`}
              key={shift.id}
            >
              <div className="shift-card-title">
                <span>
                  <CalendarClock />
                </span>
                <div>
                  <h3>{shift.name}</h3>
                  <p>
                    {formatShiftTime(shift.startTime)} –{" "}
                    {formatShiftTime(shift.endTime)}
                  </p>
                </div>
                {shift.source === "default" && (
                  <b>
                    <Star /> Mặc định
                  </b>
                )}
              </div>
              <dl>
                <div>
                  <dt>Thời gian nghỉ</dt>
                  <dd>
                    {formatShiftTime(shift.breakStart)} –{" "}
                    {formatShiftTime(shift.breakEnd)}
                  </dd>
                </div>
                <div>
                  <dt>Hiệu lực từ</dt>
                  <dd>
                    {formatEffectiveDate(shift.effectiveDate) ||
                      "Chưa thiết lập"}
                  </dd>
                </div>
              </dl>
              <div className="shift-card-status">
                <i className={shift.isActive ? "active" : "inactive"} />
                {shift.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
              </div>
              <footer>
                <button title="Chỉnh sửa" onClick={() => openEdit(shift)}>
                  <Pencil /> Sửa
                </button>
                <button
                  title="Đặt mặc định"
                  disabled={shift.source === "default"}
                  onClick={() => makeDefault(shift)}
                >
                  <Star /> Mặc định
                </button>
                <button
                  title={shift.isActive ? "Ngừng áp dụng" : "Bật ca"}
                  onClick={() => toggleShift(shift)}
                >
                  <Power /> {shift.isActive ? "Tắt" : "Bật"}
                </button>
                <button
                  className="danger"
                  title="Xóa ca"
                  disabled={shift.source === "default"}
                  onClick={() => removeShift(shift)}
                >
                  <Trash2 /> Xóa
                </button>
              </footer>
            </article>
          ))}
        </div>
      )}
      {formOpen && (
        <ShiftFormModal
          shift={editingShift}
          saving={saving}
          serverError={formError}
          onClose={() => !saving && setFormOpen(false)}
          onSave={saveShift}
        />
      )}
    </section>
  );
}
