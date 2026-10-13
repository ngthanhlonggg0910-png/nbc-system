import React, { useEffect, useState } from "react";
import { Save, UserCog, X } from "lucide-react";

const inputClass =
  "h-10 rounded-xl border border-[#d9e4ec] bg-white px-3 font-normal text-[#234c6b] outline-none focus:border-[#078e91] focus:ring-2 focus:ring-[#078e91]/10";

export default function EmployeeEditModal({
  employee,
  roles,
  attendanceDevices = [],
  saving,
  error,
  onClose,
  onSave,
}) {
  const [form, setForm] = useState(null);

  useEffect(() => {
    setForm(
      employee
        ? {
            first_name: employee.firstName ?? "",
            last_name: employee.lastName ?? "",
            email: employee.email ?? "",
            phone: employee.phone ?? "",
            gender:
              employee.genderValue === null ? "" : String(employee.genderValue),
            is_active_staff: String(employee.isActive),
            role_id: employee.roleId ? String(employee.roleId) : "",
            device_id:
              employee.device_id == null ? "" : String(employee.device_id),
            device_user_id: employee.device_user_id ?? "",
          }
        : null,
    );
  }, [employee]);

  if (!employee || !form) return null;
  const update = (event) =>
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  const submit = (event) => {
    event.preventDefault();
    if (saving) return;
    onSave({
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      gender: form.gender === "" ? null : form.gender === "true",
      is_active_staff: form.is_active_staff === "true",
      role_id: Number(form.role_id),
      device_id: form.device_id ? Number(form.device_id) : null,
      device_user_id: form.device_user_id.trim() || null,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#071c2f]/55 p-3 backdrop-blur-[2px]"
      onMouseDown={() => !saving && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-[#e2eaf0] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e5f4f3] text-[#078e91]">
              <UserCog size={20} />
            </span>
            <div>
              <p className="m-0 text-[10px] font-extrabold uppercase tracking-wider text-[#078e91]">
                {employee.id}
              </p>
              <h2 className="mb-0 mt-1 text-lg font-bold text-[#174565]">
                Cập nhật nhân viên
              </h2>
            </div>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg text-[#758b9d] hover:bg-[#f0f4f7]"
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </header>

        <form
          onSubmit={submit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-bold text-[#5d7488]">
              Họ và tên đệm
              <input
                required
                name="last_name"
                value={form.last_name}
                onChange={update}
                className={inputClass}
              />
            </label>
            <label className="grid gap-1.5 text-xs font-bold text-[#5d7488]">
              Tên
              <input
                required
                name="first_name"
                value={form.first_name}
                onChange={update}
                className={inputClass}
              />
            </label>
            <label className="grid gap-1.5 text-xs font-bold text-[#5d7488]">
              Email
              <input
                required
                type="email"
                name="email"
                value={form.email}
                onChange={update}
                className={inputClass}
              />
            </label>
            <label className="grid gap-1.5 text-xs font-bold text-[#5d7488]">
              Số điện thoại
              <input
                required
                name="phone"
                value={form.phone}
                onChange={update}
                className={inputClass}
              />
            </label>
            <label className="grid gap-1.5 text-xs font-bold text-[#5d7488]">
              Máy chấm công
              <select
                name="device_id"
                value={form.device_id}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    device_id: event.target.value,
                    device_user_id: event.target.value
                      ? current.device_user_id
                      : "",
                  }))
                }
                className={inputClass}
              >
                <option value="">Chưa gán máy chấm công</option>
                {attendanceDevices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.code} · {device.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-bold text-[#5d7488]">
              Mã chấm công
              <input
                name="device_user_id"
                value={form.device_user_id}
                onChange={update}
                disabled={!form.device_id}
                placeholder="Ví dụ: 1001"
                className={`${inputClass} disabled:cursor-not-allowed disabled:bg-[#f1f5f8]`}
              />
            </label>
            <label className="grid gap-1.5 text-xs font-bold text-[#5d7488]">
              Giới tính
              <select
                name="gender"
                value={form.gender}
                onChange={update}
                className={inputClass}
              >
                <option value="">Chưa cập nhật</option>
                <option value="true">Nam</option>
                <option value="false">Nữ</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-bold text-[#5d7488]">
              Trạng thái
              <select
                name="is_active_staff"
                value={form.is_active_staff}
                onChange={update}
                className={inputClass}
              >
                <option value="true">Đang hoạt động</option>
                <option value="false">Tạm khóa</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-bold text-[#5d7488] sm:col-span-2">
              Nhóm quyền
              <select
                required
                name="role_id"
                value={form.role_id}
                onChange={update}
                className={`${inputClass} h-11`}
              >
                <option value="" disabled>
                  Chọn nhóm quyền
                </option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </label>
            {error && (
              <p className="m-0 rounded-lg bg-[#fff0f1] px-3 py-2 text-xs text-[#c63d4c] sm:col-span-2">
                {error}
              </p>
            )}
          </div>
          <footer className="flex shrink-0 justify-end gap-2 border-t border-[#e2eaf0] bg-white px-5 py-4">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="h-10 rounded-xl border border-[#d7e2e9] px-5 text-sm font-bold text-[#526f85]"
            >
              Hủy
            </button>
            <button
              disabled={saving || !roles.length || !form.role_id}
              type="submit"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#0874bd] to-[#078f99] px-5 text-sm font-bold text-white disabled:opacity-60"
            >
              <Save size={16} /> {saving ? "Đang lưu..." : "Lưu cập nhật"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
