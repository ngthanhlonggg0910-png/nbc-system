import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Search } from "lucide-react";
import {
  EmployeeActions,
  EmployeeDeleteModal,
  EmployeeEditModal,
} from "@/components/employee";
import usePermission from "@/hooks/usePermission";
import { deleteData, getData, patchData } from "@/utils/api";

const apiError = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Không thể kết nối đến máy chủ.";
const dateText = (value) =>
  value ? new Date(value).toLocaleDateString("vi-VN") : "—";
const normalizeEmployee = (item) => ({
  id: item.staff_id,
  firstName: item.first_name ?? "",
  lastName: item.last_name ?? "",
  name:
    item.full_name ||
    `${item.last_name ?? ""} ${item.first_name ?? ""}`.trim() ||
    item.staff_id,
  email: item.email || "—",
  phone: item.phone || "—",
  genderValue: typeof item.gender === "boolean" ? item.gender : null,
  gender: item.gender === true ? "Nam" : item.gender === false ? "Nữ" : "—",
  department: item.department?.name || "Chưa cập nhật",
  position: item.position?.name || "Chưa cập nhật",
  workplace: item.work_location?.name || "Chưa cập nhật",
  startDate: dateText(item.join_date),
  roleId: item.role_id ?? item.role?.id ?? null,
  role: item.role?.name || "Chưa phân quyền",
  isActive: Boolean(item.is_active_staff),
  device_id: item?.device_id,
  device_user_id: item?.device_user_id,
  status: item.is_active_staff ? "Đang hoạt động" : "Tạm khóa",
});

function StatusBadge({ active }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold ${active ? "bg-[#e2f5ec] text-[#00845c]" : "bg-[#fff0dc] text-[#c77608]"}`}
    >
      {active ? "Đang hoạt động" : "Tạm khóa"}
    </span>
  );
}

export default function ListEmploy() {
  const can = usePermission();
  const roles = useSelector((state) => state.roles.items);
  const currentStaffId = useSelector(
    (state) => state.user.currentUser?.staff_id,
  );
  const [employees, setEmployees] = useState([]);
  const [attendanceDevices, setAttendanceDevices] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getData("/api/employees")
      .then((response) => {
        if (active)
          setEmployees((response.data?.data || []).map(normalizeEmployee));
      })
      .catch((err) => {
        if (active) setError(apiError(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    getData("/api/attendance-devices")
      .then((response) => {
        if (active) setAttendanceDevices(response.data?.data ?? []);
      })
      .catch(() => {
        if (active) setAttendanceDevices([]);
      });

    return () => {
      active = false;
    };
  }, []);

  const visible = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi");
    return keyword
      ? employees.filter((item) =>
          [
            item.id,
            item.name,
            item.email,
            item.department,
            item.position,
            item.role,
          ]
            .join(" ")
            .toLocaleLowerCase("vi")
            .includes(keyword),
        )
      : employees;
  }, [employees, search]);

  const saveEmployee = async (payload) => {
    if (!can("edit_employee")) return;
    setSaving(true);
    setActionError("");
    try {
      const response = await patchData(
        `/api/employees/edit/${editing.id}`,
        payload,
      );
      const updated = normalizeEmployee(response.data.data);
      setEmployees((items) =>
        items.map((item) => (item.id === updated.id ? updated : item)),
      );
      setEditing(null);
      setNotice(response.data.message || "Cập nhật nhân viên thành công.");
    } catch (err) {
      setActionError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  const removeEmployee = async (staffId) => {
    if (!can("delete_employee")) return;
    setSaving(true);
    setActionError("");
    try {
      const response = await deleteData(`/api/employees/deleted/${staffId}`);
      setEmployees((items) => items.filter((item) => item.id !== staffId));
      setDeleting(null);
      setNotice(response.data.message || "Xóa nhân viên thành công.");
    } catch (err) {
      setActionError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (employee) => {
    setActionError("");
    setEditing(employee);
  };
  const openDelete = (employee) => {
    setActionError("");
    setDeleting(employee);
  };
  const columns = [
    "Nhân viên",
    "Liên hệ",
    "Phòng ban / Chức danh",
    "Nơi làm việc",
    "Ngày vào",
    "Nhóm quyền",
    "Máy chấm công",
    "Mã chấm công",
    "Trạng thái",
    "Hành động",
  ];

  return (
    <section className="min-h-full px-4 pb-28 pt-5 text-[#173c5c] sm:px-5 lg:px-7 lg:pb-8 lg:pt-7">
      <div className="mx-auto w-full max-w-[1450px]">
        <header className="flex flex-col gap-5 rounded-2xl border border-[#dce6ee] bg-white px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div>
            <p className="m-0 text-xs font-extrabold uppercase tracking-[.08em] text-[#008d91]">
              Hồ sơ nhân sự
            </p>
            <h1 className="mb-0 mt-2 text-xl font-medium text-[#004a91]">
              Danh sách nhân viên
            </h1>
          </div>
          <label className="relative block sm:w-[300px]">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7b91a5]"
              size={16}
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm mã, tên, phòng ban..."
              className="h-10 w-full rounded-xl border border-[#d9e4ec] bg-[#f7f9fb] pl-9 pr-3 text-xs outline-none focus:border-[#128ba2]"
            />
          </label>
        </header>
        {notice && (
          <div className="mt-4 flex justify-between rounded-xl border border-[#cce9dd] bg-[#e9f8f1] px-4 py-3 text-sm font-bold text-[#087d5a]">
            <span>{notice}</span>
            <button onClick={() => setNotice("")}>×</button>
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-xl bg-[#fff0f1] px-4 py-3 text-sm text-[#c63d4c]">
            {error}
          </div>
        )}
        <div className="mt-7 overflow-x-auto rounded-xl border border-[#dbe5ed] bg-white">
          <div className="min-w-[1560px]">
            <div className="grid grid-cols-[minmax(180px,1.25fr)_minmax(220px,1.5fr)_minmax(220px,1.5fr)_minmax(170px,1.15fr)_minmax(110px,.75fr)_minmax(150px,1fr)_minmax(120px,.85fr)_minmax(130px,.9fr)_minmax(145px,1fr)_minmax(110px,.75fr)] bg-[#f3f6f8] px-3 text-xs font-bold text-[#71859a]">
              {columns.map((column) => (
                <div key={column} className="px-2.5 py-3.5">
                  {column}
                </div>
              ))}
            </div>
            <div className="px-3">
              {loading && (
                <p className="m-0 py-12 text-center text-sm text-[#71859a]">
                  Đang tải danh sách nhân viên...
                </p>
              )}
              {!loading &&
                visible.map((employee) => (
                  <article
                    key={employee.id}
                    className="grid min-h-[70px] grid-cols-[minmax(180px,1.25fr)_minmax(220px,1.5fr)_minmax(220px,1.5fr)_minmax(170px,1.15fr)_minmax(110px,.75fr)_minmax(150px,1fr)_minmax(120px,.85fr)_minmax(130px,.9fr)_minmax(145px,1fr)_minmax(110px,.75fr)] items-center border-b border-[#e6edf2] text-xs last:border-0"
                  >
                    <div className="min-w-0 px-2.5">
                      <strong className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate">{employee.name}</span>
                        {String(employee.id) === String(currentStaffId) && (
                          <span className="shrink-0 rounded-full bg-[#e5f4f3] px-2 py-0.5 text-[10px] font-bold text-[#078e91]">
                            Bạn
                          </span>
                        )}
                      </strong>
                      <span className="mt-1 block text-[#7a91a5]">
                        {employee.id} · {employee.gender}
                      </span>
                    </div>
                    <div className="min-w-0 px-2.5">
                      <span className="block truncate">{employee.email}</span>
                      <span className="mt-1 block text-[#7a91a5]">
                        {employee.phone}
                      </span>
                    </div>
                    <div className="min-w-0 px-2.5">
                      <span className="block truncate">
                        {employee.department}
                      </span>
                      <span className="mt-1 block truncate text-[#7a91a5]">
                        {employee.position}
                      </span>
                    </div>
                    <div
                      className="min-w-0 truncate px-2.5"
                      title={employee.workplace}
                    >
                      {employee.workplace}
                    </div>
                    <div className="whitespace-nowrap px-2.5">
                      {employee.startDate}
                    </div>
                    <div
                      className="min-w-0 truncate px-2.5 font-semibold text-[#08778b]"
                      title={employee.role}
                    >
                      {employee.role}
                    </div>
                    <div className="px-2.5 font-mono text-[11px]">
                      {employee.device_id ?? "—"}
                    </div>
                    <div className="px-2.5 font-mono text-[11px]">
                      {employee.device_user_id ?? "—"}
                    </div>
                    <div className="whitespace-nowrap px-2.5">
                      <StatusBadge active={employee.isActive} />
                    </div>
                    <div className="px-2.5">
                      <EmployeeActions
                        employee={employee}
                        canEdit={can("edit_employee")}
                        canDelete={can("delete_employee")}
                        onEdit={openEdit}
                        onDelete={openDelete}
                      />
                    </div>
                  </article>
                ))}
              {!loading && !visible.length && (
                <p className="m-0 py-12 text-center text-sm text-[#71859a]">
                  Không tìm thấy nhân viên phù hợp.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      <EmployeeEditModal
        employee={editing}
        roles={roles}
        attendanceDevices={attendanceDevices}
        saving={saving}
        error={actionError}
        onClose={() => {
          setEditing(null);
          setActionError("");
        }}
        onSave={saveEmployee}
      />
      <EmployeeDeleteModal
        employee={deleting}
        saving={saving}
        error={actionError}
        onCancel={() => {
          setDeleting(null);
          setActionError("");
        }}
        onConfirm={removeEmployee}
      />
    </section>
  );
}
