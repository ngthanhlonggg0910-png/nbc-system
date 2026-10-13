import React from "react";
import { AlertTriangle, X } from "lucide-react";

export default function DeleteRoleModal({ role, saving, error, onClose, onConfirm }) {
  if (!role) return null;
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-[#071c2f]/55 p-4 backdrop-blur-[2px]" onMouseDown={() => !saving && onClose()}>
    <section role="dialog" aria-modal="true" aria-labelledby="delete-role-title" onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
      <div className="flex items-start justify-between"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#fff0e5] text-[#d16f16]"><AlertTriangle size={21} /></span><button type="button" disabled={saving} onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-[#71869a] hover:bg-[#f0f4f7]" aria-label="Đóng"><X size={18} /></button></div>
      <h2 id="delete-role-title" className="mb-0 mt-4 text-lg font-bold text-[#173f5e]">Xóa nhóm quyền</h2>
      <p className="mb-0 mt-2 text-sm leading-6 text-[#667d90]">Bạn có chắc chắn muốn xóa nhóm quyền <strong className="text-[#173f5e]">“{role.name}”</strong>?</p>
      <p className="mb-0 mt-2 text-xs text-[#d04a58]">Hành động này có thể không hoàn tác được.</p>
      {error && <p className="mb-0 mt-4 rounded-lg bg-[#fff0f1] px-3 py-2 text-xs text-[#c63d4c]">{error}</p>}
      <div className="mt-6 flex justify-end gap-2"><button disabled={saving} type="button" onClick={onClose} className="h-10 rounded-xl border border-[#d8e2e9] px-4 text-sm font-bold text-[#577085] disabled:opacity-50">Hủy</button><button disabled={saving} type="button" onClick={onConfirm} className="h-10 rounded-xl bg-[#d54858] px-5 text-sm font-bold text-white disabled:opacity-60">{saving ? "Đang xóa..." : "Xóa"}</button></div>
    </section>
  </div>;
}
