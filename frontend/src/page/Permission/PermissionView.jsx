import React, { useState } from "react";
import {
  Users,
  UserCheck,
  ShieldCheck,
  Search,
  RotateCcw,
  SlidersHorizontal,
  Check,
  X,
} from "lucide-react";
import { PageTitle } from "@/components/common/PageTitle";
import { Avatar } from "@/components/common/Avatar";
function EmployeeEditModal({ employee, employees, onClose, onSave }) {
  const [draft, setDraft] = useState(employee);
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form
        className="employee-edit-modal"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(draft);
        }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" type="button" onClick={onClose}>
          <X />
        </button>
        <span className="modal-icon">
          <SlidersHorizontal />
        </span>
        <h2>Cập nhật tài khoản</h2>
        <div className="edit-employee-head">
          <Avatar name={employee.name} />
          <div>
            <strong>{employee.name}</strong>
            <span>
              {employee.staffId} · {employee.department}
            </span>
          </div>
        </div>
        <label>
          Quản lý trực tiếp
          <select
            value={draft.managerId}
            onChange={(event) =>
              setDraft({ ...draft, managerId: event.target.value })
            }
          >
            <option value="">Không thiết lập</option>
            {employees
              .filter(
                (item) =>
                  item.staffId !== employee.staffId &&
                  item.status === "Đang hoạt động",
              )
              .map((item) => (
                <option key={item.staffId} value={item.staffId}>
                  {item.name} · {item.staffId}
                </option>
              ))}
          </select>
          <small>
            Mỗi nhân viên chỉ có một quản lý trực tiếp phụ trách duyệt văn bản.
          </small>
        </label>
        <label>
          Quyền truy cập
          <select
            value={draft.access}
            onChange={(event) =>
              setDraft({ ...draft, access: event.target.value })
            }
          >
            <option>Nhân viên</option>
            <option>HR</option>
            <option>Quản trị viên</option>
          </select>
        </label>
        <label>
          Trạng thái
          <select
            value={draft.status}
            onChange={(event) =>
              setDraft({ ...draft, status: event.target.value })
            }
          >
            <option>Đang hoạt động</option>
            <option>Tạm khóa</option>
          </select>
        </label>
        <button className="primary-button">
          <Check /> Lưu cập nhật
        </button>
      </form>
    </div>
  );
}
export function PermissionsPage({
  employees,
  onUpdateEmployees,
  onResetPasswords,
  onNotifications,
  unreadCount,
}) {
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");
  const [bulkAccess, setBulkAccess] = useState("Nhân viên");
  const [editing, setEditing] = useState();
  const [message, setMessage] = useState("");
  const filtered = employees.filter((item) =>
    `${item.name} ${item.staffId} ${item.department}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const toggle = (id) =>
    setSelected((items) =>
      items.includes(id) ? items.filter((item) => item !== id) : [...items, id],
    );
  return (
    <div className="page permissions-page">
      <PageTitle
        title="Phân quyền"
        subtitle="Quản lý tài khoản và quyền truy cập nhân viên"
        onNotifications={onNotifications}
        unreadCount={unreadCount}
      />
      <section className="permission-summary">
        <div>
          <span>
            <Users />
          </span>
          <strong>{employees.length}</strong>
          <small>Tổng tài khoản</small>
        </div>
        <div>
          <span className="green">
            <UserCheck />
          </span>
          <strong>
            {
              employees.filter((item) => item.status === "Đang hoạt động")
                .length
            }
          </strong>
          <small>Đang hoạt động</small>
        </div>
        <div>
          <span className="orange">
            <ShieldCheck />
          </span>
          <strong>
            {employees.filter((item) => item.access !== "Nhân viên").length}
          </strong>
          <small>Tài khoản đặc quyền</small>
        </div>
      </section>
      <section className="section-block permission-card">
        <div className="permission-toolbar">
          <div className="search-box">
            <Search />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên, mã nhân viên, phòng ban..."
            />
          </div>
          <div className="bulk-actions">
            <span>
              Đã chọn <strong>{selected.length}</strong>
            </span>
            <select
              value={bulkAccess}
              onChange={(event) => setBulkAccess(event.target.value)}
            >
              <option>Nhân viên</option>
              <option>HR</option>
              <option>Quản trị viên</option>
            </select>
            <button
              disabled={!selected.length}
              onClick={() => {
                onUpdateEmployees(selected, bulkAccess);
                setMessage(
                  `Đã cập nhật quyền cho ${selected.length} tài khoản.`,
                );
              }}
            >
              <ShieldCheck /> Cập nhật quyền
            </button>
            <button
              className="reset-button"
              disabled={!selected.length}
              onClick={() => {
                onResetPasswords(selected);
                setMessage(
                  `Đã reset mật khẩu cho ${selected.length} tài khoản.`,
                );
              }}
            >
              <RotateCcw /> Reset mật khẩu
            </button>
          </div>
        </div>
        {message && (
          <div className="permission-message">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-check-check"
            >
              <path d="M18 6 7 17l-5-5" />
              <path d="m22 10-7.5 7.5L13 16" />
            </svg>{" "}
            {message}
          </div>
        )}
        <div className="permission-table-wrap">
          <table className="permission-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={
                      filtered.length > 0 &&
                      filtered.every((item) => selected.includes(item.id))
                    }
                    onChange={(event) =>
                      setSelected(
                        event.target.checked
                          ? Array.from(
                              new Set([
                                ...selected,
                                ...filtered.map((item) => item.id),
                              ]),
                            )
                          : selected.filter(
                              (id) => !filtered.some((item) => item.id === id),
                            ),
                      )
                    }
                  />
                </th>
                <th>Nhân viên</th>
                <th>Phòng ban</th>
                <th>Quản lý trực tiếp</th>
                <th>Quyền truy cập</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((employee) => {
                const manager = employees.find(
                  (item) => item.staffId === employee.managerId,
                );
                return (
                  <tr key={employee.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.includes(employee.id)}
                        onChange={() => toggle(employee.id)}
                      />
                    </td>
                    <td>
                      <div className="employee-cell">
                        <Avatar name={employee.name} />
                        <span>
                          <strong>{employee.name}</strong>
                          <small>{employee.staffId}</small>
                        </span>
                      </div>
                    </td>
                    <td>{employee.department}</td>
                    <td>
                      <span className="manager-cell">
                        {manager ? (
                          <>
                            <strong>{manager.name}</strong>
                            <small>{manager.staffId}</small>
                          </>
                        ) : (
                          "â€”"
                        )}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`access-badge access-${employee.access === "Nhân viên" ? "employee" : employee.access === "HR" ? "hr" : "admin"}`}
                      >
                        {employee.access}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`account-status ${employee.status === "Đang hoạt động" ? "active" : "locked"}`}
                      >
                        <i /> {employee.status}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button onClick={() => setEditing(employee)}>
                          <SlidersHorizontal /> Cập nhật
                        </button>
                        <button
                          onClick={() => {
                            onResetPasswords([employee.id]);
                            setMessage(
                              `Đã reset mật khẩu cho ${employee.name}.`,
                            );
                          }}
                        >
                          <RotateCcw /> Reset
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      {editing && (
        <EmployeeEditModal
          employee={editing}
          employees={employees}
          onClose={() => setEditing(undefined)}
          onSave={(updated) => {
            onUpdateEmployees(
              [updated.id],
              updated.access,
              updated.status,
              updated.managerId,
            );
            setMessage(`Đã cập nhật tài khoản ${updated.name}.`);
            setEditing(undefined);
          }}
        />
      )}
    </div>
  );
}
