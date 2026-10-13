import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

const emptyForm = { code: "", name: "", description: "" };

export default function RoleFormModal({
  role,
  saving,
  error,
  onClose,
  onSubmit,
}) {
  const [draft, setDraft] = useState(emptyForm);
  const [validation, setValidation] = useState("");

  useEffect(() => {
    setDraft(
      role
        ? {
            code: role.code ?? "",
            name: role.name ?? "",
            description: role.description ?? "",
          }
        : emptyForm,
    );
    setValidation("");
  }, [role]);

  const submit = (event) => {
    event.preventDefault();
    if (saving) return;
    const payload = {
      code: draft.code.trim(),
      name: draft.name.trim(),
      description: draft.description.trim(),
    };
    if (!payload.code || !payload.name) {
      setValidation("Mã và tên nhóm quyền không được để trống.");
      return;
    }
    onSubmit(payload);
  };

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-[#071c2f]/55 p-4 backdrop-blur-[2px]"
      onMouseDown={() => !saving && onClose()}
    >
      <form
        onSubmit={submit}
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="m-0 text-lg font-bold text-[#173f5e]">
            {role ? "Cập nhật nhóm quyền" : "Thêm nhóm quyền"}
          </h2>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-[#71869a] hover:bg-[#f0f4f7] disabled:opacity-50"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-1.5 text-xs font-bold text-[#60778a]">
            Mã nhóm quyền
            <input
              autoFocus
              required
              value={draft.code}
              onChange={(e) => setDraft({ ...draft, code: e.target.value })}
              className="h-11 rounded-xl border border-[#d9e4eb] px-3 text-sm font-normal outline-none focus:border-[#078f91]"
            />
          </label>
          <label className="grid gap-1.5 text-xs font-bold text-[#60778a]">
            Tên nhóm quyền
            <input
              required
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="h-11 rounded-xl border border-[#d9e4eb] px-3 text-sm font-normal outline-none focus:border-[#078f91]"
            />
          </label>
          <label className="grid gap-1.5 text-xs font-bold text-[#60778a]">
            Mô tả
            <textarea
              rows="4"
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
              className="resize-none rounded-xl border border-[#d9e4eb] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#078f91]"
            />
          </label>
        </div>
        {(validation || error) && (
          <p className="mb-0 mt-4 rounded-lg bg-[#fff0f1] px-3 py-2 text-xs text-[#c63d4c]">
            {validation || error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="h-10 rounded-xl border border-[#d8e2e9] px-4 text-sm font-bold text-[#577085] disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            disabled={saving}
            className="h-10 rounded-xl bg-gradient-to-r from-[#0875bb] to-[#16a05d] px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Đang lưu..." : role ? "Lưu cập nhật" : "Thêm nhóm quyền"}
          </button>
        </div>
      </form>
    </div>
  );
}
