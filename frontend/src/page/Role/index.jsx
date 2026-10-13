import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Plus } from "lucide-react";
import { DeleteRoleModal, RoleActions, RoleFormModal } from "@/components/role";
import {
  clearRoleError,
  createRole,
  editRole,
  removeRole,
} from "@/redux/roleSlice";
import usePermission from "@/hooks/usePermission";

export default function Role() {
  const dispatch = useDispatch();
  const can = usePermission();
  const {
    items: roles,
    loading,
    saving,
    error,
  } = useSelector((state) => state.roles);
  const [formRole, setFormRole] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteRole, setDeleteRole] = useState(null);
  const [notice, setNotice] = useState("");

  const closeDialogs = () => {
    if (saving) return;
    setFormOpen(false);
    setFormRole(null);
    setDeleteRole(null);
    dispatch(clearRoleError());
  };
  const submitRole = async (payload) => {
    if (!can(formRole ? "edit_role" : "create_role")) return;
    const action = formRole
      ? editRole({ id: formRole.id, data: payload })
      : createRole(payload);
    const result = await dispatch(action);
    if (action.fulfilled.match(result)) {
      closeDialogs();
      setNotice(result.payload.message || "Đã lưu nhóm quyền thành công.");
    }
  };
  const confirmDelete = async () => {
    if (!can("delete_role")) return;
    const result = await dispatch(removeRole(deleteRole.id));
    if (removeRole.fulfilled.match(result)) {
      closeDialogs();
      setNotice(result.payload.message || "Đã xóa nhóm quyền thành công.");
    }
  };

  return (
    <section className="min-h-full px-4 pb-28 pt-5 text-[#183e5b] sm:px-6 lg:px-8 lg:pb-8 lg:pt-7">
      <div className="mx-auto max-w-[1450px]">
        <header className="grid gap-4 sm:grid-cols-3 sm:items-center">
          <div>
            <p className="m-0 text-xs text-[#718597]">
              Thiết lập các nhóm quyền sử dụng hệ thống
            </p>
            <h1 className="mb-0 mt-2 text-xl font-medium text-[#173f5e]">
              Nhóm quyền
            </h1>
          </div>
          {can("create_role") ? (
            <button
              type="button"
              onClick={() => {
                dispatch(clearRoleError());
                setFormRole(null);
                setFormOpen(true);
              }}
              className="inline-flex h-11 items-center justify-center gap-2 justify-self-center rounded-xl bg-gradient-to-r from-[#0874bd] to-[#18a357] px-5 text-sm font-bold text-white shadow-[0_5px_14px_rgba(10,126,128,.18)]"
            >
              <Plus size={17} /> Thêm nhóm quyền
            </button>
          ) : (
            <span />
          )}
          <span className="hidden sm:block" />
        </header>
        {notice && (
          <div className="mt-5 flex items-center justify-between rounded-xl border border-[#cce9dd] bg-[#e9f8f1] px-4 py-3 text-sm font-bold text-[#087d5a]">
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice("")}
              className="bg-transparent text-lg"
            >
              ×
            </button>
          </div>
        )}
        <div className="mt-7 overflow-x-auto rounded-2xl border border-[#dce7ed] bg-white p-4 shadow-[0_8px_28px_rgba(31,70,96,.04)] sm:p-5">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-[.8fr_1.05fr_1.5fr_.6fr_1fr] bg-[#f4f7f9] px-3 text-xs font-bold text-[#657a8b]">
              {[
                "Mã nhóm quyền",
                "Tên nhóm quyền",
                "Mô tả",
                "Số người dùng",
                "Thao tác",
              ].map((item) => (
                <div key={item} className="px-2 py-3">
                  {item}
                </div>
              ))}
            </div>
            {loading && (
              <p className="m-0 py-10 text-center text-sm text-[#718597]">
                Đang tải nhóm quyền...
              </p>
            )}
            {!loading && error && !formOpen && !deleteRole && (
              <p className="m-0 py-10 text-center text-sm text-[#d54858]">
                {error}
              </p>
            )}
            {!loading &&
              roles.map((role) => (
                <article
                  key={role.id}
                  className="grid min-h-[68px] grid-cols-[.8fr_1.05fr_1.5fr_.6fr_1fr] items-center border-b border-[#e5ecf1] px-3 text-xs last:border-0"
                >
                  <code className="px-2 text-[#08778b]">{role.code}</code>
                  <strong className="px-2 text-[#17394f]">{role.name}</strong>
                  <span className="px-2 leading-5 text-[#647b8e]">
                    {role.description || "—"}
                  </span>
                  <span className="px-2">{role.userCount}</span>
                  {(can("edit_role") || can("delete_role")) && (
                    <RoleActions
                      role={role}
                      canEdit={can("edit_role")}
                      canDelete={can("delete_role")}
                      onEdit={(item) => {
                        dispatch(clearRoleError());
                        setFormRole(item);
                        setFormOpen(true);
                      }}
                      onDelete={(item) => {
                        dispatch(clearRoleError());
                        setDeleteRole(item);
                      }}
                    />
                  )}
                </article>
              ))}
            {!loading && !error && roles.length === 0 && (
              <p className="m-0 py-10 text-center text-sm text-[#718597]">
                Chưa có nhóm quyền.
              </p>
            )}
          </div>
        </div>
      </div>
      {formOpen && (
        <RoleFormModal
          role={formRole}
          saving={saving}
          error={error}
          onClose={closeDialogs}
          onSubmit={submitRole}
        />
      )}
      <DeleteRoleModal
        role={deleteRole}
        saving={saving}
        error={error}
        onClose={closeDialogs}
        onConfirm={confirmDelete}
      />
    </section>
  );
}
